/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

var Player = require('../lib/player.js');

var key = require('../config/auth.json').key || null;

module.exports = class music {
    constructor(cl) {
        this.client = cl;
        /**
         * holds array of servers channels and their bound instances.
         * @type {Array}
         */
        this.boundChannels = [];
    }

    getCommands() {
        return ["init", "play", "pause", "skip"];
    }

    onCommand(msg, command, perms, l) {
        console.log("Music initiated");
        var id = msg.channel.server.id;
        if(command.command === "init" && perms.check(msg, "music.init")) {
            if(this.boundChannels.indexOf(msg.channel.server.id)<0) {
                if(msg.author.voiceChannel) {
                    if(msg.author.voiceChannel.server.id === msg.channel.server.id) {
                        this.boundChannels[id] = new Player(this.client, msg.author.voiceChannel, msg.channel, key);
                        msg.reply("Binding to **" + this.boundChannels[id].voice.name + "** and **" + this.boundChannels[id].text.name + "**");
                        this.boundChannels[id].init(msg);
                    }
                    else {
                        msg.reply("You must be in a voice channel in this server to use this command here.")
                    }
                }
                else {
                    msg.reply("You must be in a voice channel this command.")
                }
            }
            else {
                msg.reply("Sorry already in use in this server")
            }
            return true;
        }

        if(command.command === "play" && perms.check(msg, "music.play")) {
            if(this.boundChannels.hasOwnProperty(id)) {
                this.boundChannels[id].enqueue(msg, command.arguments[0])
            } else {
                msg.reply("Please bind a channel first using " + command.prefix + "init")
            }
        }
        return false;
    }
};