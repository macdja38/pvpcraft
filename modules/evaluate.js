/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

var colors = require('colors');

var request = require('request');

var now = require("performance-now");

var Utils = require('../lib/utils');
var utils = new Utils();

module.exports = class evaluate {
    constructor(cl) {
        this.client = cl;
    }

    getCommands() {
        return ["eval"];
    }

    onCommand(msg, command, perms, l) {
        console.log("Perms initiated");
        //id is hardcoded to prevent problems stemming from the misuse of eval.
        //no perms check because this extends paste the bounds of a server.
        if (command.command === "eval" && msg.author.id === "85257659694993408") {
            var code = command.arguments.join(" ");

            //these are so that others code will run in the eval if they depend on things.
            let client = this.client;
            let bot = this.client;
            let message = msg;

            let server = message.channel.server;
            let channel = msg.channel;
            let t0;
            let t1;
            t0 = now();
            try {
                var evaluated = eval(code);
                t1 = now();
                this.client.sendMessage(msg.channel, "```xl\n" +
                    utils.clean(code) +
                    "\n- - - - - - evaluates-to- - - - - - -\n" +
                    utils.clean(evaluated) +
                    "\n- - - - - - - - - - - - - - - - - - -\n" +
                    "In " + (t1 - t0) + " milliseconds!\n```");
                console.log(evaluated);
            }
            catch (error) {
                t1 = now();
                this.client.sendMessage(msg.channel, "```xl\n" +
                    utils.clean(code) +
                    "\n- - - - - - - errors-in- - - - - - - \n" +
                    utils.clean(error) +
                    "\n- - - - - - - - - - - - - - - - - - -\n" +
                    "In " + (t1 - t0) + " milliseconds!\n```");
                console.error(error);
            }
            return true;
        }
        return false;
    }
};