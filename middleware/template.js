/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

let utils = require('../lib/utils');

class template {
  /**
   * Instantiates the module
   * @constructor
   * @param {Object} e
   * @param {Client} e.client Eris client
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
   * @param {Message} msg
   * @param {Permissions} perms
   */
  onMessage(msg, perms) {
    //do something with the message like log it.
    console.log("Got message")
  }

  /**
   * Get's called every command.
   * @param {Message} msg
   * @param {Command} command
   * @param {Permissions} perms
   */
  onCommand(msg, command, perms) {
    //do something with the command like logging it to a mod log
    console.log("Got Command");
    // Every command will pass through this template entry if your module contains it.
    // This can't modify commands only log/process them.
  }

  /**
   * get's called every Message, (unless a previous middleware on the list override it.) can modify message.
   * @param {Message} msg
   * @param {Permissions} perms
   * @returns {Message} msg that will be passed to modules and other middleware
   */
  changeMessage(msg, perms) {
    //return a modified version of the message.
    console.log("Changed Message");
    return msg;
  }

  /**
   * get's called every Command, (unless a previous middleware on the list override it.) can modify message.
   * @param {Message} msg
   * @param {Command} command
   * @param {Permissions} perms
   * @returns {Command | boolean}
   */
  changeCommand(msg, command, perms) {
    console.log("Changed Command");
    //modify the command like rate limiting it.
    if (command.command === "ahh") {
      msg.channel.sendMessage("ahh");
      return false;
    }
    return command;
  }
}

module.exports = template;