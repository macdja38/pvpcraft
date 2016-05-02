/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

var utilities = class Perms {
    constructor(cl, config) {
        this.client = cl;
        this.config = config;
    }

    getCommands() {
        return ["serverinfo", "server", "userinfo", "user"];
    }

    checkMisc() {
        return false;
    }

    onCommand(msg, command, perms, l) {
        console.log("Perms initiated");
        console.log(command);
        if (command.command === "serverinfo" || command.command === "server" ) {
            var botCount = 0;
            for (var i in msg.channel.server.members) {
                if (msg.channel.server.members[i]) {
                    if (msg.channel.server.members[i].bot) {
                        botCount++;
                    }
                } else {
                    console.log(msg.channel.server.members[i]);
                }
            }
            msg.reply(
                "```xl\n" +
                "Name: " + utils.clean(msg.channel.server.name) + "\n" +
                "Id: " + msg.channel.server.id + "\n" +
                "Owner: " + utils.clean(msg.channel.server.owner.name) + "\n" +
                "Humans: " + (msg.channel.server.members.length - botCount) + " Bots: " + botCount + "\n" +
                "IconURL: " + msg.channel.server.iconURL +
                "\n```"
            );
            return true;
        }
        if (command.command === 'userinfo' || command.command === 'user') {
            var string = "";
            var mentInfo;
            var comaUserNameCodes;
            var ment;
            var targets = command.arguments;
            if(command.arguments.length === 0) {
                targets.push("<@" + msg.author.id + ">");
            }
            for (var arg of targets) {
                if(/(?:<@|<@!)\d+>/.test(arg)) {
                    ment = msg.channel.server.members.get("id", arg.match(/(?:<@|<@!)(\d+)>/)[1]);
                } else {
                    ment = msg.channel.server.members.get("name", arg)
                }
                if(ment) {
                    mentInfo = msg.channel.server.detailsOf(ment);
                    comaUserNameCodes = '';
                    for (var i = 0; i < ment.username.length - 1; i++) {
                        comaUserNameCodes += ment.username.charCodeAt(i) + ',';
                        console.log('ID:' + ment.username.charCodeAt(i) + ' Char:' + ment.username[i]);
                    }
                    comaUserNameCodes += ment.username.charCodeAt(i);
                    console.log('ID:' + ment.username.charCodeAt(i) + ' Char:' + ment.username[i]);
                    string +=
                        "```xl\n" +
                        "Name: " + utils.clean(ment.username) + "\n" +
                        "Char Codes: " + comaUserNameCodes + "\n" +
                        ((mentInfo.nick) ? "Nick: " + utils.clean(mentInfo.nick) + "\n" : "") +
                        "Id: " + ment.id + "\n" +
                        "Descrim: " + ment.discriminator + "\n" +
                        "IconURL: " + ment.avatarURL + "\n" +
                        "```\n";
                }
                else {
                    string += "Could not find **" + utils.clean(arg) + "**.\n";
                }
            }
            msg.reply(string);
            return true;
        }
        msg.reply("ahh");
    }
};

module.exports = utilities;