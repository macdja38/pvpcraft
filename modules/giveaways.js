/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

var SlowSender = require('../lib/slowSender');

var ConfigDB = require('../lib/configDB');

module.exports = class giveaways {
    constructor(e) {
        this.client = e.client;
        this.raven = e.raven;
        this.purgedMessages = {};
        this._slowSender = new SlowSender(e);
        e.conn.then((conn)=> {
            this.entries = new ConfigDB("entries", e.client, conn);
            this.entries.reload().then(()=> {
                this.ready = true;
            });
        });
    }

    getCommands() {
        //this needs to return a list of commands that should activate the onCommand function
        //of this class. array of strings with trailing s's removed.
        return ["enter", "count", "draw", "clear", "giveaway"];
    }

    onDisconnect() {
        this._slowSender.onDisconnect();
    }

    onReady() {
        this._slowSender.onReady();
    }

    //if this exists it will be called on every message unless it contains a command that is
    //consumed by another module.
    checkMisc(msg, perms) {
        return false;
    }

    onCommand(msg, command, perms) {
        if (!this.ready) {
            console.log("Giveaway module called but config was not ready");
            return false;
        }

        if (command.commandnos === "giveaway" && perms.check(msg, "admin.giveaway.setup")) {
            if (command.args.length > 0 && (command.args[0] === "enable" || command.args[0] === "disable")) {
                let data = this.entries.get(null, {}, {server: msg.server.id});
                data.enable = command.args[0] === "enable";
                if (command.hasOwnProperty("channel")) {
                    data.channel = command.channel.id;
                } else if (!data.hasOwnProperty("channel")) {
                    data.channel = msg.channel.id;
                }
                if (!data.hasOwnProperty("entries")) {
                    data.entries = [];
                }
                console.log(data);
                this.entries.set(null, data, {server: msg.server.id});
                msg.reply(`Giveaways ${data.enable ? "enabled" : "disabled"} in channel <#${data.channel}>`);
            }
            return true;
        }

        if (command.command === "clear" && perms.check(msg, "admin.giveaway.clear")) {
            if (!this.entries.get("channel", false, {server: msg.server.id})) {
                msg.reply("Sorry but there is no record of a giveaway ever existing.");
                return true;
            }
            this.entries.set("entries", [], {server: msg.server.id});
            msg.reply(`Entries cleared`);
        }

        if (command.command === "count" && perms.check(msg, "admin.giveaway.count")) {
            if (!this.entries.get("channel", false, {server: msg.server.id})) {
                msg.reply("Sorry but there is no record of a giveaway ever existing.");
                return true;
            }
            this.entries.count("entries", {server: msg.server.id}).then((entries) => {
                msg.reply(`${entries} entries so far.`);
            });
        }

        if (command.command === "draw" && perms.check(msg, "admin.giveaway.draw")) {
            if (!this.entries.get("channel", false, {server: msg.server.id})) {
                msg.reply("Sorry but there is no record of a giveaway ever existing.");
                return true;
            }
            let winnersCount = 1;
            if (command.args[0]) {
                let count = parseInt(command.args[0]);
                if (count > 0) {
                    winnersCount = count;
                }
            }
            this.entries.getRandom("entries", winnersCount, {server: msg.server.id}).then((winners)=> {
                if(winners.length > 0) {
                    console.log("Winners");
                    console.log(winners);
                    let string = "Congrats to";
                    winners.forEach((winnerId)=>{
                        let winnerUser = msg.server.members.get("id", winnerId);
                        if(winnerUser) {
                            string += ` ${winnerUser}, `;
                        } else {
                            string += ` \`User number ${winnerId}\`, `;
                        }
                    });
                    msg.reply(string + "for winning!");
                } else {
                    msg.reply(`No winner could be decided, make sure at least 1 person has entered.`);
                }
            });
        }

        //check if this is a command we should handle and if the user has permissions to execute it.
        if (command.command === "enter" && perms.check(msg, "giveaway.enter")) {
            if (this.entries.get("enable", false, {server: msg.server.id})) {
                this.entries.add("entries", msg.author.id, {
                    server: msg.server.id,
                    conflict: "update"
                }).then((result)=> {
                    console.log(result);
                    if (result.replaced === 1) {
                        this._slowSender.sendMessage(msg.channel, `${msg.author}, You have entered.`);
                    } else if (result.unchanged === 1) {
                        this._slowSender.sendMessage(msg.channel, `${msg.author}, Sorry but you can only enter once.`);
                    } else {
                        this._slowSender.sendMessage(msg.channel, `${msg.author}, Error processing entry.`);
                    }
                });
            } else {
                this._slowSender.sendMessage(msg.channel, `${msg.author}, Sorry but there are no giveaways open at this time.`);
            }
            return true;
        }
        //return false, telling the command dispatcher the command was not handled and to keep looking,
        //or start passing it to misc responses.
        return false;
    }
};