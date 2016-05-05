/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

module.exports = class template {
    constructor(cl) {
        this.client = cl;
    }

    getCommands() {
        return ["ao"];
    }

    checkMisc() {
        return false;
    }

    onCommand(msg, command, perms, l) {
        console.log("Perms initiated");
        console.log(msg);
        if(command.command === "ahh") {
            msg.reply("ahh");
            return true;
        }
        return false;
    }
};