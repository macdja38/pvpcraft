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
    //save the client as this.client for later use.
    this.client = e.client;
    //save the bug reporting thing raven for later use.
    this.raven = e.raven;
  }

  /**
   * Returns the triggers that will cause this module's onCommand function to be called
   * @returns {string[]}
   */
  static getCommands() {
    //this needs to return a list of commands that should activate the onCommand function
    //of this class. array of strings with trailing s's removed.
    return ["ao"];
  }

  /**
   * Optional function that will be called with every message for the purpose of misc responses / other
   * @param {Message} msg
   * @param {Permissions} perms
   * @returns {boolean | Promise}
   */
  checkMisc(msg, perms) {
    return false;
  }

  /**
   * Called with a command, returns true or a promise if it is handling the command, returns false if it should be passed on.
   * @param {Message} msg
   * @param {Command} command
   * @param {Permissions} perms
   * @returns {boolean | Promise}
   */
  onCommand(msg, command, perms) {
    //log that the module was called.
    console.log("Template initiated");

    //check if this is a command we should handle and if the user has permissions to execute it.
    if (command.command === "ao" && perms.check(msg, "template.ao")) {
      //provide user feedback.
      command.replyAutoDeny("eo");
      //return true, which tells the command dispatcher that we processed the command.
      return true;
    }
    //return false, telling the command dispatcher the command was not handled and to keep looking,
    //or start passing it to misc responses.
    return false;
  }
}

module.exports = template;