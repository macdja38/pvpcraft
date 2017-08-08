/**
 * Created by macdja38 on 2017-01-30.
 */
"use strict";

class music {
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
    this.perms = e.perms;
  }

  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands() {
    return [{
      triggers: ["init", "play", "list", "time", "pause", "resume", "volume", "shuffle", "next", "destroy", "logchannel", "link"],
      permissionCheck: (command) => this.perms.check(command, `music.${command.command}`),
      channels: ["guild"],
      execute: command => {
        return command.replyAutoDeny("Sorry music is currently disabled at the moment, please join https://join.pvpcraft.ca and check the #announcements chat for info on why and status updates");
      },
    }];
  }
}

module.exports = music;