/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

module.exports = class template {
  constructor(e) {
    //save the client as this.client for later use.
    this.client = e.client;
    this.fileConfig = e.config;
    //save the bug reporting thing raven for later use.
    this.raven = e.raven;
  }

  getCommands() {
    return ["restart"];
  }

  //if this exists it will be called on every message unless it contains a command that is
  //consumed by another module.
  checkMisc(msg, perms) {
    return false;
  }

  onCommand(msg, command, perms) {
    if (command.command === "restart" && this.fileConfig.get("permissions", {"permissions": {admins: []}}).admins.includes(msg.author.id)) {
      console.log(command);
      process.send({op: 1, command: "restart", global: command.flags.indexOf("g") > -1, profile: command.flags.indexOf("p") > -1});
      return true;
    }
    return false;
  }
};