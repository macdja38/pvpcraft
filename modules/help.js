/**
 * Created by macdja38 on 2016-05-12.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

var colors = require('colors');

module.exports = class help {
    constructor(e) {
        this.client = e.client;
        this.raven = e.raven;
    }

    getCommands() {
        return ["help", "command"];
    }

    onCommand(msg, command, perms) {
        //permissions have not yet been added, this is a preliminary version of the help command. Final version will be dynamic.        
        if (command.command === "help" || command.commandnos === "command") {
            msg.reply("Help can be found at https://bot.pvpcraft.ca/docs");
            return true;
        }
        return false;
    }
};