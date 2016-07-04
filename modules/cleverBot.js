/**
 * Created by macdja38 on 2016-05-16.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

var CleverBot = require('cleverbot-node');
var clever = new CleverBot();

module.exports = class cleverBot {
    constructor(e) {
        this.client = e.client;
        this.raven = e.raven;
        this.middleRegex = new RegExp(`<@(?:!)?${e.client.user.id}>`, 'g');
        this.startRegex = new RegExp(`^<@(?:!)?${e.client.user.id}>(?:,)?(?: )?`);
    }

    getCommands() {
        return [];
    }

    checkMisc(msg, perms) {
        if (msg.isMentioned(this.client.user) && perms.check(msg, "cleverbot.misc")) {
            this.client.startTyping(msg.channel);
            var quarry = msg.content.replace(this.startRegex, "").replace(this.middleRegex, "CleverBot");
            console.log(`Sent "${quarry}" to cleverBot`);
            CleverBot.prepare(()=>{
                clever.write(quarry,(response)=>{
                    msg.reply(response.message).then(()=> {
                        this.client.stopTyping(msg.channel);
                    });
                });
            });
            return true;
        }
        return false;
    }

    onCommand(msg, command, perms, l) {
        return false;
    }
};