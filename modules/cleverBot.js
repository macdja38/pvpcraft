/**
 * Created by macdja38 on 2016-05-16.
 */

/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

var CleverBot = require('cleverbot-node');
var clever = new CleverBot();

module.exports = class cleverBot {
    constructor(cl, config, raven) {
        this.client = cl;
        this.raven = raven;
    }

    getCommands() {
        return [];
    }

    checkMisc(msg, perms) {
        if (msg.isMentioned(this.client.user) && perms.check(msg, "cleverbot.misc")) {
            this.client.startTyping(msg.channel);
            var quarry;
            if (msg.content.startsWith("<@" + this.client.user.id + ">")) {
                quarry = msg.content.substr(this.client.user.id.length + 4).replace("<@" + this.client.user.id + ">", "CleverBot");
            }
            else if (msg.content.startsWith("<@!" + this.client.user.id + ">")) {
                quarry = msg.content.substr(this.client.user.id.length + 4).replace("<@!" + this.client.user.id + ">", "CleverBot");
            }
            else {
                quarry = msg.content.replace("<@" + this.client.user.id + ">", "CleverBot")
            }
            var self = this;
            console.log('Sent to Clever:' + quarry);
            CleverBot.prepare(function () {
                clever.write(quarry, function (response) {
                    msg.reply(response.message, ()=> {
                        self.client.stopTyping(msg.channel);
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