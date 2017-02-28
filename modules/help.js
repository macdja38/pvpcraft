/**
 * Created by macdja38 on 2016-05-12.
 */
"use strict";

class help {
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
    this.raven = e.raven;
  }

  static getCommands() {
    return ["help", "command"];
  }

  //noinspection JSMethodCanBeStatic
  /**
   * Called with a command, returns true or a promise if it is handling the command, returns false if it should be passed on.
   * @param {Message} msg
   * @param {Command} command
   * @param {Permissions} perms
   * @returns {boolean | Promise}
   */
  onCommand(msg, command, perms) {
    //permissions have not yet been added, this is a preliminary version of the help command. Final version will be dynamic.
    if (command.command === "help" || command.commandnos === "command") {
      msg.channel.createMessage(`${msg.author.mention}, Help can be found at https://bot.pvpcraft.ca/docs`);
      return true;
    }
    return false;
  }
}

module.exports = help;