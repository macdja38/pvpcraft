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
    constructor(e) {
        this.client = e.client;
        this.modules = e.modules;
        this.config = e.configDB;
        this.fileConfig = e.config;
    }

    getCommands() {
        return ["eval", "setavatar"];
    }

    onCommand(msg, command, perms) {
        console.log("Perms initiated");
        //id is hardcoded to prevent problems stemming from the misuse of eval.
        //no perms check because this extends paste the bounds of a server.
        //if you know what you are doing and would like to use the id in the config file you may replace msg.author.id == id, with
        //this.config.get("permissions", {"permissions": {admins: []}}).admins.includes(msg.author.id)
        if (command.command === "eval" && msg.author.id === "85257659694993408") {
            var code = command.args.join(" ");

            //these are so that others code will run in the eval if they depend on things.
            let client = this.client;
            let bot = this.client;
            let message = msg;
            let config = this.config;

            let raven = this.raven;
            let modules = this.modules;
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

        if (command.command === "setavatar" && this.fileConfig.get("permissions", {"permissions": {admins: []}}).admins.includes(msg.author.id)) {
            request({
                method: 'GET',
                url: command.args[0],
                encoding: null
            }, (err, res, image) => {
                if (err) {
                    this.client.sendMessage(msg.channel, "Failed to get a valid image.");
                    return true;
                }
                this.client.setAvatar(image, (err) => {
                    if (err) {
                        this.client.sendMessage(msg.channel, "Failed setting avatar.");
                        return true;
                    }
                    this.client.sendMessage(msg.channel, "Changed avatar.");
                });
            });
            return true;
        }
        return false;
    }
};