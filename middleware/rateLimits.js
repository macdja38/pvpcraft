/**
 * Created by macdja38 on 2016-07-11.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

var colors = require('colors');

module.exports = class rateLimits {
    constructor(e) {
        this.client = e.client;

        this.channelRateLimitWhiteList = e.config.get("channelRateLimitWhiteList", []);

        this.userCommandCount = {};
        this.channelCommandCount = {};
        this.serverCommandCount = {};

        this.userLimit = e.config.get("userLimit", 2);
        this.userPerTick = e.config.get("userPerTick", 2);
        this.userTickInterval = e.config.get("userTickInterval", 4000);

        this.channelLimit = e.config.get("channelLimit", 5);
        this.channelPerTick = e.config.get("channelPerTick", 2);
        this.channelTickInterval = e.config.get("channelTickInterval", 2500);

        this.serverLimit = e.config.get("serverLimit", 15);
        this.serverPerTick = e.config.get("serverPerTick", 10);
        this.serverTickInterval = e.config.get("serverTickInterval", 10000);
    }

    /**
     * Get's called every time the bot connects, not just the first time.
     */
    onReady() {
        this.reduceUsers = setInterval(()=> {
            try {
                for (let user of Object.keys(this.userCommandCount)) {
                    if (this.userCommandCount.hasOwnProperty(user)) {
                        if (this.userCommandCount[user] > this.userPerTick) {
                            this.userCommandCount[user] -= this.userPerTick;
                        } else {
                            delete this.userCommandCount[user];
                        }
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }, this.userTickInterval);

        this.reduceChannels = setInterval(()=> {
            try {
                for (let channel of Object.keys(this.channelCommandCount)) {
                    if (this.channelCommandCount.hasOwnProperty(channel)) {
                        if (this.channelCommandCount[channel] > this.channelPerTick) {
                            this.channelCommandCount[channel] -= this.channelPerTick;
                        } else {
                            delete this.channelCommandCount[channel];
                        }
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }, this.channelTickInterval);

        this.reduceServers = setInterval(()=> {
            try {
                for (let server of Object.keys(this.serverCommandCount)) {
                    if (this.serverCommandCount.hasOwnProperty(server)) {
                        if (this.serverCommandCount[server] > this.serverPerTick) {
                            this.serverCommandCount[server] -= this.serverPerTick;
                        } else {
                            delete this.serverCommandCount[server];
                        }
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }, this.serverTickInterval);
    }

    /**
     * Get's called every time the bot disconnects.
     */
    onDisconnect() {
        clearInterval(this.reduceUsers);
        clearInterval(this.reduceChannels);
        clearInterval(this.reduceServers);
        this.userCommandCount = {};
        this.channelCommandCount = {};
        this.serverCommandCount = {};
    }

    /**
     * get's called every Command, (unless a previous middleware on the list override it.) can modify message.
     * @param msg
     * @param command
     * @param perms
     * @param l
     * @returns {command || boolean} object (may be modified.)
     */
    changeCommand(msg, command, perms, l) {
        if (!this.userCommandCount.hasOwnProperty(msg.author.id)) {
            this.userCommandCount[msg.author.id] = 1; 
        }
        else {
            this.userCommandCount[msg.author.id]++;
        }
        if (this.userCommandCount[msg.author.id] === this.userLimit + 1) {
            this.userCommandCount[msg.author.id] += this.userLimit * 2;
            msg.reply("WOAH THERE. WAY TOO SPICY\nYou have exceeded the rate limit.");
            console.log(`User ${msg.author.username} was rate Limited running command ${command.prefix}${command.command}, userId:${msg.author.id}`.magenta);
        }
        if (this.userCommandCount[msg.author.id] > this.userLimit) {
            msg.rateLimited = true;
            return false;
        }

        if (msg.server) {
            if(this.channelRateLimitWhiteList.includes(command.commandnos)) {
                console.log("Command Whitelisted.");
                return command;
            }

            if (!this.channelCommandCount.hasOwnProperty(msg.channel.id)) {
                this.channelCommandCount[msg.channel.id] = 1;
            }
            else {
                this.channelCommandCount[msg.channel.id]++;
            }
            if (this.channelCommandCount[msg.channel.id] === this.channelLimit + 1) {
                this.channelCommandCount[msg.channel.id] += this.channelLimit * 2;
                msg.reply("WOAH THERE. WAY TOO SPICY\nChannel has exceeded the rate limit.");
                console.log(`Channel ${msg.channel.name}:${msg.channel.id} was rate Limited running command ${command.prefix}${command.command} in ${msg.server.name}:${msg.server.id}`.magenta);
            }
            if (this.channelCommandCount[msg.channel.id] > this.channelLimit) {
                msg.rateLimited = true;
                return false;
            }


            if (!this.serverCommandCount.hasOwnProperty(msg.server.id)) {
                this.serverCommandCount[msg.server.id] = 1;
            }
            else {
                this.serverCommandCount[msg.server.id]++;
            }
            if (this.serverCommandCount[msg.server.id] === this.serverLimit + 1) {
                this.serverCommandCount[msg.server.id] += this.serverLimit * 2;
                msg.reply("WOAH THERE. WAY TOO SPICY\nServer has exceeded the rate limit.");
                console.log(`Server ${msg.server.name}:${msg.server.id} was rate Limited running command ${command.prefix}${command.command}`.magenta);
            }
            if (this.serverCommandCount[msg.server.id] > this.serverLimit) {
                msg.rateLimited = true;
                return false;
            }
        }

        return command;
    }
};