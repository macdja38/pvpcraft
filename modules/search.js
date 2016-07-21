/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

var google = require('google');

module.exports = class template {
    constructor(e) {
        this.client = e.client;
        this.raven = e.raven;
    }

    getCommands() {
        //this needs to return a list of commands that should activate the onCommand function
        //of this class. array of strings with trailing s's removed.
        return ["google"];
    }

    onCommand(msg, command, perms) {
        //log that the module was called.
        console.log("Template initiated");

        //check if this is a command we should handle and if the user has permissions to execute it.
        if (command.command === "google" && perms.check(msg, "search.google")) {
            if (command.args.length < 1) {
                msg.reply("Please supply something to search for.");
                return true;
            }
            let search = command.args.join(" ");
            google(search, (err, response) => {
                if (err || !response || !response.links) msg.reply("Your search resulted in an error");
                else if (response.links.length < 1) msg.reply("No results found");
                else {
                    if (response.links[0].link === null) {
                        for (let i = 1; i < response.links.length; i++) {
                            if (response.links[i].link !== null) {
                                this.client.sendMessage(msg.channel, `Found ${utils.clean(response.links[i].link)})`);
                                return;
                            }
                        }
                    } else {
                        this.client.sendMessage(msg.channel, `Found ${utils.clean(response.links[0].link)}`);
                    }
                }
            });
            return true;
        }
        return false;
    }
};