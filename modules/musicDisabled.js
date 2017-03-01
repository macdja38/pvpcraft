/**
 * Created by macdja38 on 2017-01-30.
 */
"use strict";

class music {
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
  }

  static getCommands() {
    return ["init", "play", "skip", "list", "time", "pause", "resume", "volume", "shuffle", "next", "destroy", "logchannel", "link"];
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
    if (!msg.channel.server) return false; //this is a pm... we can't do music stuff here.
    if (!perms.check(msg, `music.${command.command}`)) return false;
    command.reply("Sorry music is currently disabled at the moment, please join https://join.pvpcraft.ca and check the #announcements chat for info on why and status updates");
    return true;
  }
}

module.exports = music;