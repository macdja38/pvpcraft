/**
 * Created by macdja38 on 2017-04-28.
 */
"use strict";

const utils = require('../lib/utils');
const i10010n = require("i10010n").init({});

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
    this.configDB = e.configDB;
    this.raven = e.raven;
    this.perms = e.perms;
  }

  getCommands() {
    return [{
      triggers: ["custom"],
      permissionCheck: (command) => true,
      channels: ["guild"],
      execute: (command) => {
        if (command.args.length < 1 && (this.perms.check(command, "admin.custom.add")
            || this.perms.check(command, "admin.custom.edit")
            || this.perms.check(command, "admin.custom.remove")
            || this.perms.check(command, "custom.add")
            || this.perms.check(command, "custom.edit")
            || this.perms.check(command, "custom.remove"))) {
          command.replyAutoDeny(i10010n() `${command.prefix}custom <add|edit|remove>`);
          return true;
        }

        let commandPart2 = command.args[0];
        if (commandPart2 === "add") {
          let addPerm = this.perms.check(command, "custom.add");
          let addPermAdmin = this.perms.check(command, "admin.custom.add");
          if (addPerm || addPermAdmin) {
            if (command.args.length < 3) {
              command.replyAutoDeny(i10010n() `${command.prefix}custom add <name> <content>`);
              return true;
            }
            let tagName = command.args[1];
            let tagText = command.args.slice(2).join(" ");
            if (this.configDB.get("custom", {}, {server: command.channel.guild.id}).hasOwnProperty(tagName)) {
              command.replyAutoDeny(i10010n() `Custom command with this name already exists`);
              return true;
            }
            this.configDB.directSet({custom: {[tagName]: {text: tagText}}}, {server: command.channel.guild.id});
            command.replyAutoDeny(i10010n() `Custom command created with name ${tagName} and description ${utils.clean(tagText)}`);
          }
          return false;
        }

        if (commandPart2 === "edit") {

        }
        command.replyAutoDeny("eo");
        return true;
      },
    }, {
      triggers: ["*"],
      permissionCheck: (command) => true,
      channels: ["guild"],
      execute: (command) => {
        let customCommands = this.configDB.get("custom", {}, {server: command.channel.guild ? command.channel.guild.id : "*"});
        if (customCommands.hasOwnProperty(command.command) && this.perms.check(command, `custom.command.${command.command}`)) {
          command.replyAutoDeny(customCommands[command.command].text);
          return true;
        }
        return false;
      },
    }];
  }


  getTagText(args) {

  }
}

module.exports = template;
