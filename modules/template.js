/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

module.exports = class template {
    constructor(cl, config, raven) {
        this.client = cl;
        this.raven = raven;
    }

    getCommands() {
        return ["ao"];
    }

    checkMisc(msg, perms) {
        return false;
    }

    onCommand(msg, command, perms, l) {
        console.log("Perms initiated");
        console.log(msg);
        if(command.command === "ao") {
            msg.reply("eo");
            return true;
        }
        return false;
    }
};