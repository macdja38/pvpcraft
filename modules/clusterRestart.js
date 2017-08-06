/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

let utils = require('../lib/utils');

class clusterRestart {
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
    //save the client as this.client for later use.
    this.client = e.client;
    this.fileConfig = e.config;
    //save the bug reporting thing raven for later use.
    this.raven = e.raven;
  }

  getCommands() {
    return [{
      triggers: ["restart"],
      permissionCheck: (command) => this.fileConfig.get("permissions", {"permissions": {admins: []}}).admins.includes(command.author.id),
      channels: ["*"],
      execute: (command) => {
        console.log("Triggering restart");
        process.send({
          op: 1,
          command: "restart",
          global: command.flags.indexOf("g") > -1,
          profile: command.flags.indexOf("p") > -1
        });
        return true;
      }
    }];
  }
}

module.exports = clusterRestart;