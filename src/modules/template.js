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
    // save the client as this.client for later use.
    this.client = e.client;
    // save the bug reporting thing raven for later use.
    this.raven = e.raven;
    this.perms = e.perms;
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
   * Optional function that will be called with every message for the purpose of misc responses / other
   * @param {Message} msg
   * @returns {boolean | Promise}
   */
  checkMisc(msg) {
    return false;
  }
}

module.exports = template;