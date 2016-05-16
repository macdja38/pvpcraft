/**
 * Created by macdja38 on 2016-05-12.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

var colors = require('colors');

module.exports = class help {
    constructor(cl, config, raven) {
        this.client = cl;
        this.raven = raven;
    }

    getCommands() {
        return ["help", "command"];
    }

    onCommand(msg, command, perms, l) {
        console.log("Help initiated");
        console.log("RED RED RED".red);
        //permissions have not yet been added, this is a preliminary version of the help command. Final version will be dynamic.        
        if (command.command === "help" || command.commandnos === "command") {
            msg.reply("Help can be found at https://pvpcraft.ca/pvpbot");
            if(msg.channel.server) {
                this.raven.captureMessage("Someone needed help!", {
                    level: "info",
                    user: msg.author,
                    extra: {
                        channel: msg.channel.id,
                        channel_name: msg.channel.name,
                        server: msg.channel.server.id,
                        server_name: msg.channel.server.name
                    }
                });
            } else {
                this.raven.captureMessage("Someone needed help!", {
                    level: "info",
                    user: msg.author,
                    extra: {
                        channel: msg.channel.id,
                        channel_name: msg.channel.name
                    }
                });
                return true;
            }
            return true;
        }
        return false;
    }
};