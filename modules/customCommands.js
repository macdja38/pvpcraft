/**
 * Created by macdja38 on 2017-04-28.
 */
"use strict";

let utils = require('../lib/utils');

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
  }

  /**
   * Returns the triggers that will cause this module's onCommand function to be called
   * @returns {string[]}
   */
  static getCommands() {
    return ["custom", "*"];
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

    if (command.command === "custom") {
      if (command.args.length < 1 && (perms.check(msg, "admin.custom.add")
        || perms.check(msg, "admin.custom.edit")
        || perms.check(msg, "admin.custom.remove")
        || perms.check(msg, "custom.add")
        || perms.check(msg, "custom.edit")
        || perms.check(msg, "custom.remove"))) {
        command.replyAutoDeny(`${command.prefix}custom <add|edit|remove>`);
        return true;
      }

      let commandPart2 = command.args[0];
      if (commandPart2 === "add") {
        let addPerm = perms.check(msg, "custom.add");
        let addPermAdmin = perms.check(msg, "admin.custom.add");
        if (addPerm || addPermAdmin) {
          if (command.args.length < 3) {
            command.replyAutoDeny(`${command.prefix}custom add <name> <content>`);
            return true;
          }
          let tagName = command.args[1];
          let tagText = command.args.slice(2).join(" ");
          if (this.configDB.get("custom", {}, {server: msg.channel.guild.id}).hasOwnProperty(tagName)) {
            command.replyAutoDeny("Custom command with this name already exists");
            return true;
          }
          this.configDB.directSet({custom: {[tagName]: {text: tagText}}}, {server: msg.channel.guild.id});
          command.replyAutoDeny(`Custom command created with name ${tagName} and description ${utils.clean(tagText)}`);
        }
        return false;
      }

      if (commandPart2 === "edit") {

      }
      command.replyAutoDeny("eo");
      return true;
    }


    let customCommands = this.configDB.get("custom", {}, {server: msg.channel.guild ? msg.channel.guild.id : "*"});
    console.log(customCommands);
    if (customCommands.hasOwnProperty(command.command) && perms.check(msg, `custom.command.${command.command}`)) {
      command.replyAutoDeny(customCommands[command.command].text);
      return true;
    }
    return false;
  }

  getTagText(args) {

  }
}

module.exports = template;
