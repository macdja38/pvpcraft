/**
 * Created by macdja38 on 2016-04-24.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

var Mod = class Mod {
    constructor(cl, config) {
        this.client = cl;
        this.logging = {};
        for (var item in config.data) {
            if (config.data[item].hasOwnProperty("msgLog")) {
                this.logging[item] = this.client.channels.get("id", config.data[item]["msgLog"]);
            }
        }


        this.logDelete = (message, channel) => {
            if (this.logging[channel.server.id]) {
                if (message && message.content) {
                    console.log("Message Delete");
                    this.client.sendMessage(this.logging[channel.server.id], utils.clean(channel.name) + " | " +
                            utils.fullNameB(message.author) +
                            " deleted:" + utils.bubble(message.content), (error)=> {
                        console.error(error)
                    });
                }
                else {
                    this.client.sendMessage(this.logging[channel.server.id], "An un-cached message in " +
                        utils.clean(channel.name) + " was deleted, this probably means the bot was either recently restarted on the message was old.",
                        (error)=> {
                            console.error(error)
                        });
                }
            }
        };


        this.logUpdate = (message, newMessage) => {
            console.log(newMessage.channel.server.id);
            if (this.logging[newMessage.channel.server.id] && message.content !== newMessage.content) {
                console.log("Message Change");
                this.client.sendMessage(this.logging[message.channel.server.id], utils.clean(newMessage.channel.name) +
                    " | " + utils.fullNameB(message.author) + " changed " + utils.bubble(message.content) +
                    " to " + utils.bubble(newMessage.content), (error)=> {
                    console.error(error)
                });
            }
        };

        this.logRole = (oldRole, newRole) => {
            if (this.logging[newRole.server.id]) {
                console.log("Role change");
                var text = ":exclamation:Role change detected in " + oldRole.name + "#" + oldRole.id + "\n";
                if(oldRole.permissions != newRole.permissions) {
                    text += "Permissions changed from " + oldRole.permissions + " to " + newRole.permissions + "\n";
                }
                if(oldRole.name != newRole.name) {
                    text += "Name changed from " + oldRole.name + " to " + newRole.name + "\n";
                }
                if(oldRole.position != newRole.position) {
                    text += "Position changed from " + oldRole.position + " to " + newRole.position + "\n";
                }
                if(oldRole.hoist != newRole.hoist) {
                    text += "Hoist changed from " + oldRole.hoist + " to " + newRole.hoist + "\n";
                }
                if(oldRole.color != newRole.color) {
                    text += "Colour changed from " + oldRole.color + " to " + newRole.color + "\n";
                }
                this.client.sendMessage(this.logging[newRole.server.id], text, (error)=> {
                    console.error(error)
                });
            }
        };

        this.logPresence = (oldUser, newUser) => {
            if(oldUser.username != newUser.username || oldUser.discriminator != newUser.discriminator || oldUser.avatar != newUser.avatar) {
                var text = ":exclamation:User change detected in " + utils.fullNameB(oldUser) + "\n";
                if (oldUser.username != newUser.username) {
                    text += "Username changed from " + utils.removeBlocks(oldUser.username) + " to " + utils.removeBlocks(newUser.username) + "\n";
                }
                if (oldUser.discriminator != newUser.discriminator) {
                    text += "Discriminator changed from " + oldUser.discriminator + " to " + newUser.discriminator + "\n";
                }
                if (oldUser.avatar != newUser.avatar) {
                    text += "avatar changed from " + oldUser.avatarURL + " to " + newUser.avatarURL + "\n";
                }
                    console.log("User Change");
                    for (var serverid in this.logging) {
                        if (this.client.servers.get("id", serverid).members.get("id", newUser.id)) {
                            console.log("server name " + this.client.servers.get("id", serverid).name);
                            this.client.sendMessage(this.logging[serverid], text, (error)=> {
                                console.error(error)
                            });
                        }
                    }
            }
        };

        this.client.on("presence", this.logPresence);
        this.client.on("serverRoleUpdated", this.logRole);
        this.client.on("messageDeleted", this.logDelete);
        this.client.on("messageUpdated", this.logUpdate);
    }

    getCommands() {
        return ["ao"];
    }

    checkMisc() {
        return false;
    }

    onCommand(msg, perms, l) {
        console.log("Perms initiated");
        console.log(msg);
        msg.reply("ahh");
        return false;
    }
};

module.exports = Mod;