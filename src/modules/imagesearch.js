/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

const utils = require('../lib/utils');

class image {
    /**
     * Instantiates the module
     * @constructor
     * @param {Object} e
     * @param {Eris} e.client Eris client
     * @param {Config} e.config File based config
     * @param {Raven?} e.raven Raven error logging system
     * @param {Config} e.auth File based config for keys and tokens and authorisation data
     * @param {ConfigDB} e.configDB database based config system, specifically for per guild settings
     * @param {R} e.r Rethinkdb r
     * @param {Permissions} e.perms Permissions Object
     * @param {Feeds} e.feeds Feeds Object
     * @param {MessageSender} e.messageSender Instantiated message sender
     * @param {SlowSender} e.slowSender Instantiated slow sender
     * @param {PvPClient} e.pvpClient PvPCraft client library instance
     */
    constructor(e) {
        // save the client as this.client for later use.
        this.client = e.client;
        // save the bug reporting thing raven for later use.
        this.raven = e.raven;
        this.perms = e.perms;
    }

    /**
     * Returns an array of commands that can be called by the command handler
     * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
     */
    getCommands() {
        return [{
            triggers: ["image"],
            permissionCheck: this.perms.genCheckCommand("search.image"),
            channels: ["*"],
            execute: command => {
                if (command.args.length < 0) {
                    return command.reply(`${command.prefix}image <search term>`);
                }

                return command.reply(`https://jpg.cool/${utils.clean(command.args[0]).replace(/ /g, ".")}`);
            }
        }];
    }
}

module.exports = search;