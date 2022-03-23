/**
 * Created by macdja38 on 2017-01-30.
 */
"use strict";

import { Module, ModuleCommand, ModuleConstructor } from "../types/moduleDefinition";
import { ModuleOptions } from "../types/lib";
import Permissions from "../lib/Permissions";
import { translateTypeCreator } from "../types/translate";
import Command from "../lib/Command/Command";
import ConfigDB from "../lib/ConfigDB";
import { isGuildChannel } from "../types/utils";

const musicDisabled: ModuleConstructor = class musicDisabled implements Module {
  private perms: Permissions;
  private i10010n: translateTypeCreator;
  private configDB: ConfigDB;
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
   * @param {Function} e.i10010n internationalization function
   */
  constructor(e: ModuleOptions) {
    this.perms = e.perms;
    this.i10010n = e.i10010n;
    this.configDB = e.configDB;
  }

  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands(): ModuleCommand[] {
    return [{
      triggers: ["init", "play", "list", "time", "pause", "resume", "volume", "shuffle", "next", "destroy", "logchannel", "link"],
      permissionCheck: (command) => this.perms.check(command, `music.${command.command}`),
      channels: ["guild"],
      execute: (command: Command) => {
        if (!isGuildChannel(command.channel)) throw new Error("TypeGuard Failed");
        const premium = this.configDB.get("premium", false, {server: command.channel.guild.id});

        if (premium === true) {
          return false;
        }

        return command.replyAutoDeny(command.translate `Sorry music is currently disabled at the moment, please join https://join.pvpcraft.ca and check the #announcements chat for info on why and status updates`);
      },
    }];
  }
}

module.exports = musicDisabled;
