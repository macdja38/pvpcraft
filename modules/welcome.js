/**
 * Created by macdja38 on 2016-05-23.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

module.exports = class welcome {
    constructor(e) {
        this.client = e.client;
        this.config = e.configDB;
        this.raven = e.raven;

        this.onJoin = (server, user) => {
            //TODO: once config loader v2 is done make this configurable.
            if (server.id == "77176186148499456") {
                this.client.sendMessage(server.channels.get("id", "171382498020950016"),
                    `Hop to it @here, ${utils.clean(user.username)} Just joined ${utils.clean(server.name)} ` +
                    `announce it in <#77176186148499456>\n\`\`\`\nWelcome **${utils.clean(user.username)}**!\n\`\`\``
                );
            }
            var welcomeInfo = this.config.get("welcome", {}, {server: server.id});
            var pm = welcomeInfo.private;
            if (welcomeInfo.message) {
                let welcomeChannel;
                if(pm !== true) {
                    if (welcomeInfo.channel) {
                        welcomeChannel = server.channels.get("id", welcomeInfo.channel);
                    }
                    if (!welcomeChannel) {
                        welcomeChannel = server.defaultChannel;
                    }
                } else {
                    welcomeChannel = user;
                }
                let message = welcomeInfo.message.replace(/\$user/gi, utils.clean(user.username)).replace(/\$mention/gi, user);
                if (welcomeInfo.delay && welcomeInfo.delay > 1000) {
                    setTimeout(()=> {
                        this.client.sendMessage(welcomeChannel, message);
                    }, welcomeInfo.delay);
                } else {
                    this.client.sendMessage(welcomeChannel, message)
                }
            }

        };
    }

    onDisconnect() {
        this.client.removeListener("serverNewMember", this.onJoin);
    }

    onReady() {
        this.client.on("serverNewMember", this.onJoin);
    }

    getCommands() {
        return ["setwelcome"];
    }

    onCommand(msg, command, perms, l) {
        console.log("welcomeBot initiated");
        if (command.command === "setwelcome" && perms.check(msg, "admin.welcome.set")) {
            if (!command.args && !command.channel) {
                return true;
            }
            var settings = this.config.get("welcome", {}, {server: msg.server.id});
            if (command.args.length > 0 && command.args[0].toLowerCase() === "false") {
                this.config.set("welcome", {}, {server: msg.server.id});
                msg.reply(":thumbsup::skin-tone-2:");
                return true;
            }
            if (command.args.length > 0) {
                settings.message = command.args.join(" ");
            }
            if (command.channel) {
                settings.channel = command.channel.id;
            }
            settings.private = command.flags.indexOf('p') > -1;
            if (command.options.delay) {
                settings.delay = Math.max(Math.min(command.options.delay.valueOf() || 0, 20), 0)*1000;
            }
            this.config.set("welcome", settings, {server: msg.server.id});
            msg.reply(":thumbsup::skin-tone-2:");
            return true;
        }
        return false;
    }
};