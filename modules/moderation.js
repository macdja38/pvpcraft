/**
 * Created by macdja38 on 2016-04-24.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

var colors = require('colors');

module.exports = class moderation {
    constructor(e) {
        this.client = e.client;
        this.logging = {};
        this.config = e.config;
        this.raven = e.raven;
        this.purgedMessages = {};

        //build the map of server id's and logging channels.
        for (var item in this.config.data) {
            if (this.config.data.hasOwnProperty(item) && this.config.data[item].hasOwnProperty("msgLog")) {
                let channel = this.client.channels.get("id", this.config.data[item]["msgLog"]);
                if (channel != null) {
                    this.logging[item] = channel;
                } else {
                    //TODO: notify the server owner their mod log has been removed and that //setlog false will make that permanent.
                }
            }
        }

        /**
         * log's a string to the server's log
         * @param server server to log string to
         * @param string string to send in server log
         */
        this.log = (server, string) => {
            if (this.logging.hasOwnProperty(server.id)) {
                console.log("server name " + server.name);
                this.client.sendMessage(this.logging[server.id], utils.clean(string), (error)=> {
                    if (error) {
                        console.error(error);
                    }
                });
            }
        };


        //log message deletes to the server's log channel
        this.logDelete = (message, channel) => {
            try {
                //check to see if it's a pm
                if (!channel.server) return;
                if (this.logging[channel.server.id]) {
                    if (message) {
                        let ignoreMessage = false;
                        if (this.purgedMessages.hasOwnProperty(channel.id) && this.purgedMessages[channel.id].hasOwnProperty("messages") && Array.isArray(this.purgedMessages[channel.id].messages)) {
                            this.purgedMessages[channel.id].messages.forEach((messages)=> {
                                if (messages.contains(message)) {
                                    ignoreMessage = true;
                                }
                            })
                        }
                        if (ignoreMessage) return;
                        //grab url's to the message's attachments
                        console.log("Message Delete");
                        var string = utils.clean(channel.name) + " | " + utils.fullNameB(message.author) + "'s message was deleted:\n";
                        //if their's content log it.
                        if (message.content) {
                            if (message.content.length > 144 || /[^0-9a-zA-Z\s\.!\?]/.test(message.content)) {
                                string += utils.bubble(message.content);
                            } else {
                                string += "\n```diff\n-" + utils.clean(message.content) + "\n```";
                            }
                        }
                        //if their are attachments log them. maybe it's possible to attach more than one?
                        if (message.attachments) {
                            for (var i in message.attachments) {
                                if (message.attachments.hasOwnProperty(i)) {
                                    string += message.attachments[i].proxy_url;
                                    console.log("url: " + message.attachments[i].url);
                                    console.log("proxy url: " + message.attachments[i].proxy_url);
                                }
                            }
                        }
                        //send everything off.
                        this.client.sendMessage(this.logging[channel.server.id], string, (error)=> {
                            if (error) {
                                console.error(error)
                            }
                        });
                    }
                    else {
                        if (this.purgedMessages[channel.server.id] && Object.keys(this.purgedMessages[channel.server.id].messages).length > 0) return;
                        this.client.sendMessage(this.logging[channel.server.id], "An un-cached message in " +
                            utils.clean(channel.name) + " was deleted, this probably means the bot was either recently restarted on the message was old.",
                            (error)=> {
                                if (error) {
                                    console.error(error)
                                }
                            });

                    }
                }
            }
            catch (err) {
                console.error(err);
                console.error(err.stack);
                if (this.raven) {
                    this.raven.captureException(err, {
                        extra: {
                            message: message,
                            channel: channel
                        }
                    });
                }
            }
        };

        this.logUpdate = (message, newMessage) => {
            try {
                if (!newMessage.channel.server) return; //it's a pm so we don't log it.
                var changeThresh = this.config.data[newMessage.channel.server.id];
                if (changeThresh) {
                    if (changeThresh.changeThresh) {
                        changeThresh = changeThresh.changeThresh;
                    }
                    else {
                        changeThresh = this.config.get("default", {changeThresh: "1"}).changeThresh
                    }
                }
                else {
                    changeThresh = this.config.get("default", {changeThresh: "1"}).changeThresh
                }
                if (this.logging[newMessage.channel.server.id] && (!message || message.content !== newMessage.content)) {
                    if (message) {
                        if (utils.compare(message.content, newMessage.content) > changeThresh) {
                            if (message.content.length > 144 || /[^0-9a-zA-Z\s\.!\?]/.test(message.content) || /[^0-9a-zA-Z\s\.!\?]/.test(newMessage.content)) {
                                this.client.sendMessage(this.logging[newMessage.channel.server.id], utils.clean(newMessage.channel.name) +
                                    " | " + utils.fullNameB(newMessage.author) + " changed: " + utils.bubble(message.content) +
                                    " to " + utils.bubble(newMessage.content), (error)=> {
                                    if (error) {
                                        console.error(error)
                                    }
                                });
                            }
                            else {
                                this.client.sendMessage(this.logging[message.channel.server.id], utils.clean(newMessage.channel.name) +
                                    " | " + utils.fullNameB(newMessage.author) + "\n```diff\n-" + utils.clean(message.content) +
                                    "\n+" + utils.clean(newMessage.content) + "\n```", (error)=> {
                                    if (error) {
                                        console.error(error)
                                    }
                                });
                            }
                        }
                    } else {
                        this.log(newMessage.server, `${utils.clean(newMessage.channel.name)}` +
                            ` | ${utils.fullNameB(newMessage.author)} changed: **An un-cached message** to ${utils.bubble(newMessage.content)}`)
                    }
                }
            }
            catch (err) {
                console.error(err);
                console.error(err.stack);
                if (this.raven) {
                    this.raven.captureException(err, {
                        extra: {
                            message: message,
                            newMessage: newMessage
                        }
                    });
                }
            }
        };

        this.logMember = (server, newUser, oldMember) => {
            try {
                console.log("Member Update");
                var newMember = server.detailsOfUser(newUser);
                if (oldMember && newMember && (oldMember.roles.length != newMember.roles.length || oldMember.mute != newMember.mute || oldMember.deaf != newMember.deaf || oldMember.nick != newMember.nick)) {
                    var text = ":exclamation:User change detected in " + utils.fullNameB(newUser) + "\n";
                    if (oldMember.nick != newMember.nick) {
                        text += "        Nick changed from `" + utils.removeBlocks(oldMember.nick) + "` to `" + utils.removeBlocks(newMember.nick) + "`\n";
                    }

                    if (oldMember.mute != newMember.mute) {
                        text += "        Is-muted changed from `" + oldMember.mute + "` to `" + newMember.mute + "`\n";
                    }
                    if (oldMember.deaf != newMember.deaf) {
                        text += "        Is-deaf changed from `" + oldMember.deaf + "` to `" + newMember.deaf + "`\n";
                    }


                    if (oldMember.roles.length < newMember.roles.length) {
                        var newRole = findNewRoles(newMember.roles, oldMember.roles);
                        if (newRole) {
                            text += "        Role added `" + newRole.name + "`\n";
                        } else {
                            this.raven.captureError(new Error("Error finding role difference", {
                                user: newUser,
                                extra: {
                                    oldMemberRoles: oldMember.roles,
                                    newMemberRoles: newMember.roles
                                }
                            }));
                            console.error("Error finding adding new Role");
                            console.error(newMember.roles);
                            console.error(oldMember.roles);
                        }
                    }
                    else if (oldMember.roles.length > newMember.roles.length) {
                        var oldRole = findNewRoles(oldMember.roles, newMember.roles);
                        if (oldRole) {
                            text += "        Role removed `" + oldRole.name + "`\n";
                        } else {
                            this.raven.captureError(new Error("Error finding role difference", {
                                user: newUser,
                                extra: {
                                    oldMemberRoles: oldMember.roles,
                                    newMemberRoles: newMember.roles
                                }
                            }));
                            console.error("Error removed Role");
                            console.error(newMember.roles);
                            console.error(oldMember.roles);
                        }
                    }
                    console.log("Member Update on " + server.name + " : " + text);
                    if (this.logging.hasOwnProperty(server.id)) {
                        console.log("server name " + server.name);
                        this.client.sendMessage(this.logging[server.id], text, (error)=> {
                            if (error) {
                                console.error(error)
                            }
                        });
                    }
                }
            }
            catch (err) {
                console.error(err);
                console.error(err.stack);
                if (this.raven) {
                    this.raven.captureException(err, {
                        extra: {
                            server: server,
                            newUser: newUser,
                            oldMember: oldMember
                        }
                    });
                }
            }
        };

        this.logMemberAdded = (server, user) => {
            try {
                this.log(server, ":inbox_tray: " + utils.fullName(user) + " Joined, id: `" + user.id + "`");
            }
            catch (err) {
                console.error(err);
                console.error(err.stack);
                if (this.raven) {
                    this.raven.captureException(err, {
                        extra: {
                            server: server,
                            user: user
                        }
                    });
                }
            }
        };

        this.logMemberRemoved = (server, user) => {
            try {
                this.log(server, ":outbox_tray: " + utils.fullName(user) + " Left or was kicked, id: `" + user.id + "`");
            }
            catch (err) {
                console.error(err);
                console.error(err.stack);
                if (this.raven) {
                    this.raven.captureException(err, {
                        extra: {
                            server: server,
                            user: user
                        }
                    });
                }
            }
        };

        this.logMemberBanned = (user, server) => {
            try {
                console.log("User " + user.username + " banned from " + server.name);
                this.log(server, ":exclamation::outbox_tray: " + utils.fullName(user) + " was Banned, id: `" + user.id + "`");
            }
            catch (err) {
                console.error(err);
                console.error(err.stack);
                if (this.raven) {
                    this.raven.captureException(err, {
                        extra: {
                            server: server,
                            user: user
                        }
                    });
                }
            }
        };

        this.logMemberUnbanned = (user, server) => {
            try {
                console.log("User " + user.username + " unbanned from " + server.name);
                this.log(server, ":exclamation::inbox_tray: " + utils.fullName(user) + " was unbanned, id: `" + user.id + "`");
            }
            catch (err) {
                console.error(err);
                console.error(err.stack);
                if (this.raven) {
                    this.raven.captureException(err, {
                        extra: {
                            server: server,
                            user: user
                        }
                    });
                }
            }
        };

        this.logRole = (oldRole, newRole) => {
            try {
                if (this.logging[newRole.server.id]) {
                    console.log("Role change");
                    var text = ":exclamation:Role change detected in " + utils.clean(oldRole.name) + "#" + oldRole.id + "\n";
                    if (oldRole.permissions != newRole.permissions) {
                        text += "Permissions changed from " + (oldRole.permissions >>> 0).toString(2) + " to " + (newRole.permissions >>> 0).toString(2) + "\n";
                    }
                    if (oldRole.name != newRole.name) {
                        text += "Name changed from " + utils.clean(oldRole.name) + " to " + utils.clean(newRole.name) + "\n";
                    }
                    if (oldRole.position != newRole.position) {
                        text += "Position changed from " + oldRole.position + " to " + newRole.position + "\n";
                    }
                    if (oldRole.hoist != newRole.hoist) {
                        text += "Hoist changed from " + oldRole.hoist + " to " + newRole.hoist + "\n";
                    }
                    if (oldRole.color != newRole.color) {
                        text += "Colour changed from " + oldRole.color + " to " + newRole.color + "\n";
                    }
                    this.client.sendMessage(this.logging[newRole.server.id], text, (error)=> {
                        if (error) {
                            console.error(error)
                        }
                    });
                }
            }
            catch (err) {
                console.error(err);
                console.error(err.stack);
                if (this.raven) {
                    this.raven.captureException(err, {
                        extra: {
                            oldRole: oldRole,
                            newRole: newRole
                        }
                    });
                }
            }
        };

        this.logPresence = (oldUser, newUser) => {
            try {
                if (oldUser.username != newUser.username || oldUser.discriminator != newUser.discriminator || (oldUser.avatar != newUser.avatar && !newUser.bot)) {
                    var text = ":exclamation:User change detected in " + utils.fullNameB(oldUser) + "\n";
                    if (oldUser.username != newUser.username) {
                        text += "        Username changed from " + utils.removeBlocks(oldUser.username) + " to " + utils.removeBlocks(newUser.username) + "\n";
                    }
                    if (oldUser.discriminator != newUser.discriminator) {
                        text += "        Discriminator changed from " + oldUser.discriminator + " to " + newUser.discriminator + "\n";
                    }
                    if (oldUser.avatar != newUser.avatar && !newUser.bot) {
                        text += "        Avatar changed from " + oldUser.avatarURL + " to " + newUser.avatarURL + "\n";
                    }
                    console.log("User Change");
                    for (var serverid in this.logging) {
                        if (this.logging.hasOwnProperty(serverid)) {
                            var server = this.client.servers.get("id", serverid);
                            if (server && server.members.get("id", newUser.id)) {
                                console.log("server name " + this.client.servers.get("id", serverid).name);
                                this.client.sendMessage(this.logging[serverid], text, (error)=> {
                                    console.error(error)
                                });
                            }
                        }
                    }
                }
            }
            catch (err) {
                console.error(err);
                console.error(err.stack);
                if (this.raven) {
                    this.raven.captureException(err, {
                        extra: {
                            oldUser: oldUser,
                            newUser: newUser
                        }
                    });
                }
            }
        };
        this.logChannelCreated = (channel) => {
            try {
                if (channel.server) { //if che channel does not have a server it's a private message and we don't need to log it.
                    console.log("Channel " + channel.name + " created in " + channel.server.name);
                    this.log(channel.server, ":exclamation:Channel " + utils.clean(channel.name) + " was created, id: `" + channel.id + "`");
                }
            }
            catch (err) {
                console.error(err);
                console.error(err.stack);
                if (this.raven) {
                    this.raven.captureException(err, {
                        extra: {
                            channel: channel
                        }
                    });
                }
            }
        };
        this.logChannelUpdated = (oldChannel, newChannel) => {
            try {
                var text = ":exclamation:Channel change detected in " + utils.clean(oldChannel.name) + "\n";
                if (oldChannel.name != newChannel.name) {
                    text += "        Name changed from `" + utils.removeBlocks(oldChannel.name) + "` to `" + utils.removeBlocks(newChannel.name) + "`\n";
                }
                if (oldChannel.topic != newChannel.topic) {
                    text += "        Topic changed from `" + utils.removeBlocks(oldChannel.topic || null) + "` to `" + utils.removeBlocks(newChannel.topic) + "`\n";
                }
                //TODO: parse numbers into legible permissions.
                var changes = findOverrideChanges(oldChannel.permissionOverwrites, newChannel.permissionOverwrites);

                for (var change of changes) {
                    var newTargetName;
                    if (change.override.type === "member") {
                        newTargetName = utils.fullName(newChannel.server.members.get("id", change.override.id));
                    }
                    if (change.override.type === "role") {
                        newTargetName = utils.clean((newChannel.server.roles.get("id", change.override.id) || {name: "unknown"}).name);
                    }
                    if (change.change == "remove" || change.change == "add") {
                        text += "        Channel override " + change.change + " from " + change.override.type + " " + newTargetName + "\n";
                    }
                    else {
                        text += "        Channel override on " + change.override.type + " " + newTargetName + " " +
                            change.change + " changed `" + (change.from >>> 0).toString(2) + "` to `" +
                            (change.to >>> 0).toString(2) + "`\n";
                    }
                }
                if (text !== ":exclamation:Channel change detected in " + utils.clean(oldChannel.name) + "\n") {
                    this.log(newChannel.server, text);
                }
            }
            catch (err) {
                console.error(err);
                console.error(err.stack);
                if (this.raven) {
                    this.raven.captureException(err, {
                        extra: {
                            oldChannel: oldChannel,
                            newChannel: newChannel
                        }
                    });
                }
            }
        };
        this.logChannelDeleted = (channel) => {
            try {
                console.log("Channel " + channel.name + " deleted from " + channel.server.name);
                this.log(channel.server, ":exclamation:Channel " + utils.clean(channel.name) + " was deleted, id: `" + channel.id + "`");
            }
            catch (err) {
                console.error(err);
                console.error(err.stack);
                if (this.raven) {
                    this.raven.captureException(err, {
                        extra: {
                            channel: channel
                        }
                    });
                }
            }
        };

    }

    onDisconnect() {
        this.client.removeListener("presence", this.logPresence);
        this.client.removeListener("serverRoleUpdated", this.logRole);
        this.client.removeListener("serverMemberUpdated", this.logMember);
        this.client.removeListener("serverNewMember", this.logMemberAdded);
        this.client.removeListener("serverMemberRemoved", this.logMemberRemoved);
        this.client.removeListener("userBanned", this.logMemberBanned);
        this.client.removeListener("userUnbanned", this.logMemberUnbanned);
        this.client.removeListener("messageDeleted", this.logDelete);
        this.client.removeListener("messageUpdated", this.logUpdate);
        this.client.removeListener("channelCreated", this.logChannelCreated);
        this.client.removeListener("channelUpdated", this.logChannelUpdated);
        this.client.removeListener("channelDeleted", this.logChannelDeleted);
    }

    onReady() {
        /*
         These all contain try catches because discord.js sometimes forget's to supply random members. I'm actively monitoring
         the error log's and fixing thing's as they crop up, but in order to prevent crashes I've decided to just log the errors.
         */
        this.client.on("presence", this.logPresence);
        this.client.on("serverRoleUpdated", this.logRole);
        this.client.on("serverMemberUpdated", this.logMember);
        this.client.on("serverNewMember", this.logMemberAdded);
        this.client.on("serverMemberRemoved", this.logMemberRemoved);
        this.client.on("userBanned", this.logMemberBanned);
        this.client.on("userUnbanned", this.logMemberUnbanned);
        this.client.on("messageDeleted", this.logDelete);
        this.client.on("messageUpdated", this.logUpdate);
        this.client.on("channelCreated", this.logChannelCreated);
        this.client.on("channelUpdated", this.logChannelUpdated);
        this.client.on("channelDeleted", this.logChannelDeleted);
        //TODO: log serverUpdated, serverRoleCreated, serverRoleDeleted
    }

    getCommands() {
        return ["setlog", "purge"];
    }

    checkMisc() {
        return false;
    }

    onCommand(msg, command, perms) {
        console.log("Moderation initiated");
        if (command.command == "setlog" && perms.check(msg, "moderation.tools.setlog")) {
            if (command.args[0] == 'false' || /<#\d+>/.test(command.options.channel)) {
                if (this.logging.hasOwnProperty(msg.channel.server.id)) {
                    var oldLog = this.logging[msg.channel.server.id];
                }
                if (command.args[0] === "false") {
                    delete this.logging[msg.channel.server.id];
                    if (this.config.data[msg.channel.server.id]) {
                        delete this.config.data[msg.channel.server.id].msgLog
                    }
                } else {
                    this.logging[msg.channel.server.id] = this.client.channels.get("id", command.options.channel.match(/<#(\d+)>/)[1]);
                    if (this.config.data[msg.channel.server.id]) {
                        this.config.data[msg.channel.server.id].msgLog = this.logging[msg.channel.server.id].id;
                    } else {
                        this.config.data[msg.channel.server.id] = {msgLog: this.logging[msg.channel.server.id].id};
                    }
                }
                this.config.save();
                if (oldLog) {
                    if (this.logging.hasOwnProperty(msg.channel.server.id)) {
                        this.client.sendMessage(oldLog, utils.clean(`Moderation log changed to channel ${this.logging[msg.channel.server.id].name}`), (error)=> {
                            if (error) {
                                console.error(error);
                            }
                        });
                    } else {
                        this.client.sendMessage(oldLog, utils.clean(`Moderation log **Disabled**`), (error)=> {
                            if (error) {
                                console.error(error);
                            }
                        });
                    }
                }
                msg.reply(":thumbsup::skin-tone-2:");
                return true;
            } else {
                msg.reply("please properly define a channel to log using --channel #channelmention," +
                    "or disable logging using `" + command.prefix + "setlog false`");
                return true;
            }
        }

        if (command.command == "purge" && perms.check(msg, "moderation.tools.purge")) {
            //decide what is going to be purged in terms of the channel, user and length.
            let channel;
            if (/<#\d+>/.test(command.options.channel)) {
                channel = msg.channel.server.channels.get("id", command.options.channel.match(/<#(\d+)>/)[1]);
                if (!channel) {
                    msg.reply("Cannot find that channel.")
                }
                return true;
            } else {
                channel = msg.channel;
            }
            if (this.logging.hasOwnProperty(msg.channel.server.id) && this.logging[msg.channel.server.id].id == channel.id) {
                msg.reply("For transparency purposes at the moment you cannot purge the moderation log.");
                return true;
            }
            let user;
            if (/<#\d+>/.test(command.options.user)) {
                user = msg.channel.server.users.get("id", command.options.user.match(/<#(\d+)>/)[1]);
                if (!user) {
                    msg.reply("Cannot find that user.")
                }
            }
            let length;
            if (command.args[0]) {
                length = Math.min(command.args[0].valueOf() || this.config.get("purgeLength", 100), this.config.get("maxPurgeLength", 100));
            } else {
                length = this.config.get("purgeLength", 100)
            }
            //get the log's delete the messages that pass the filter defined above.
            this.log(msg.channel.server, `Attempting to delete ${length} messages from ${channel.name} on orders from ${utils.removeBlocks(msg.author.username)} id:\`${msg.author.id}\``);
            getLogs(this.client, channel, length).then((messages)=> {
                if (user) {
                    messages = messages.filter((message)=> {
                        return message.author.id === user.id
                    })
                }

                //add the purged messages to a list of purged messages so they won't break the log.
                if (!this.purgedMessages[msg.channel.server.id]) {
                    this.purgedMessages[msg.channel.server.id] = {messages: {}};
                }
                let index = Object.keys(this.purgedMessages[msg.channel.server.id].messages).length;
                this.purgedMessages[msg.channel.server.id].messages[index] = messages;
                //split the arrays into chucks of 100 messages.
                var messagesChunks = messages.slice(0, Math.ceil(messages.length / 100)).map((x, i) => messages.slice(i * 100, i * 100 + 100));
                let deleteMessageArray = [];

                var logDelete = ()=> {
                    Promise.all(deleteMessageArray).then(()=> {
                        this.log(msg.channel.server, `${messages.length} messages deleted from ${channel.name} by order of ${utils.removeBlocks(msg.author.username)} id:\`${msg.author.id}\``);
                        msg.reply("Messages deleted").then((message)=> {
                            setTimeout(()=> {
                                this.client.deleteMessage(message);
                                delete this.purgedMessages[msg.channel.server.id].messages[index];
                            }, 5000);
                        })
                    })
                };

                var logError = () => {
                    msg.reply("Cannot delete messages.");
                    setTimeout(()=> {
                        delete this.purgedMessages[msg.channel.server.id].messages[index];
                    }, 60000);
                    console.error("ERROR that's probably a problem");
                    console.error(error);
                };

                console.log("Loop should run " + messagesChunks.length);

                let i = 0;
                var deleteTask = setInterval(()=> {
                    console.log("Place first " + i);
                    deleteMessageArray[i] = this.client.deleteMessages(messagesChunks[i]);
                    deleteMessageArray[i].catch(()=> {
                        clearInterval(deleteTask);
                        logError();
                    });
                    i++;
                    if (i >= messagesChunks.length) {
                        clearInterval(deleteTask);
                        logDelete();
                    }
                }, 1100);


            }).catch((error)=> {
                msg.reply("Cannot get channel history.");
                console.error(error);
            });

            return true;

        }
        return false;
    };
};

function findOverrideChanges(thing1, thing2) {
    var changes = [];
    if (thing1.length >= thing2.length) {
        console.log("removed");
        thing1.forEach(
            (i)=> {
                console.log(i);
                var j = thing2.get("id", i.id);
                if (j) {
                    for (var k in i) {
                        if (i.hasOwnProperty(k) && i[k] !== j[k]) {
                            changes.push({"change": k, "override": i, "from": i[k], "to": j[k]});
                        }
                    }
                }
                else {
                    changes.push({"change": "remove", "override": i})
                }
            }
        );
    } else {
        thing2.forEach(
            (i)=> {
                console.log(i);
                if (!thing1.get("id", i.id)) {
                    changes.push({"change": "add", "override": i})
                }
            }
        );
    }
    return changes;
}

function findNewOverrides(more, less) {
    for (var i of more) {
        if (!less.get("id", i.id)) {
            return i;
        }
    }
    return false;
}

/**
 * return {Object} roles present in oldR that are not in newR
 * @param more {Object} group of role's that has more roles
 * @param less {Object} group of role's that has less role's than more.
 */
function findNewRoles(more, less) {
    for (var i of more) {
        if (!i) console.error(new Error("Found a null role 1?"));
        else if (!roleIn(i, less)) {
            return i;
        }
    }
    return false;
}

function roleIn(role, newRoles) {
    for (var j of newRoles) {
        if (!j) console.error(new Error("Found a null role"));
        else if (role.id == j.id) {
            return true;
        }
    }
    return false;
}

function getLogs(client, channel, count, before) {
    return new Promise((resolve)=> {
        client.getChannelLogs(channel, count, before ? {before: before} : {}).then((newMessages)=> {
            count -= 100;
            console.log(count);
            if (count > 0 && newMessages.length == 100) {
                getLogs(client, channel, count, newMessages[99]).then(
                    (messages) => {
                        if (messages) {
                            resolve(messages.concat(newMessages));
                        } else {
                            resolve(messages);
                        }
                    }
                ).catch(
                    ()=> {
                        resolve(newMessages);
                    }
                )
            } else {
                resolve(newMessages);
            }
        })
    })
}