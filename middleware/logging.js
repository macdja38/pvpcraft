/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

var Utils = require('../lib/utils.js');
var utils = new Utils();

var DB = require('../lib/database.js');
var db = new DB();

module.exports = class logging {
    constructor(e) {
        this.client = e.client;
    }

    /**
     * Get's called every time the bot connects, not just the first time.
     */
    onReady() {

    }

    /**
     * Get's called every time the bot disconnects.
     */
    onDisconnect() {

    }

    /**
     * Get's called every message.
     * @param msg
     * @param perms
     */
    onMessage(msg, perms) {
        //do something with the message like log it.
        db.logMessage(msg);
    }

    /**
     * Get's called every command.
     * @param msg
     * @param command
     * @param perms
     * @param l
     */
    onCommand(msg, command, perms, l) {
        //do something with the command like logging it to a mod log
        //maybe you want to do something here? idk. one possible use for middleware would be a rate limiting module
    }

    /**
     * get's called every Message, (unless a previous middleware on the list override it.) can modify message.
     * @param msg
     * @param perms
     * @returns msg that will be passed to modules and other middleware
     */
    changeMessage(msg, perms) {
        //return a modified version of the message.
        return msg;
    }

    /**
     * get's called every Command, (unless a previous middleware on the list override it.) can modify message.
     * @param msg
     * @param command
     * @param perms
     * @param l
     * @returns command object (may be modified.)
     */
    changeCommand(msg, command, perms, l) {
        //modify the command like rate limiting it.
        if (command.command === "ahh") {
            msg.reply("ahh");
            return false;
        }
        return command;
    }
};