/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

const utils = require('../lib/utils');

class template {
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
  onMessage(msg) {
    //do something with the message like log it.
    console.log("Got message")
  }

  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands() {
    return [{
      triggers: ["ao"],
      permissionCheck: this.perms.genCheckCommand("template.ao"),
      channels: ["*"],
      execute: command => {
        // check if this is a command we should handle and if the user has permissions to execute it.
        // provide user feedback.
        command.replyAutoDeny("eo");
        // return true, which tells the command dispatcher that we processed the command.
        // if false is returned bot will continue to search for commands that could match
        return true;
      },
    }];
  }

  /**
   * get's called every Message, (unless a previous middleware on the list override it.) can modify message.
   * @param {Message} msg
   * @returns {Message} msg that will be passed to modules and other middleware
   */
  changeMessage(msg) {
    //return a modified version of the message.
    console.log("Changed Message");
    return msg;
  }

  /**
   * get's called every Command, (unless a previous middleware on the list override it.) can modify message.
   * @param {Message} msg
   * @param {Command} command
   * @returns {Command | boolean}
   */
  changeCommand(msg, command) {
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