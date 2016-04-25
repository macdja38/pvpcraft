/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

var Perms = class Perms {
    constructor(cl) {
        this.client = cl;
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
    }
};

module.exports = Perms;