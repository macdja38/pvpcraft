/**
 * Created by macdja38 on 2016-05-12.
 */

"use strict";

import { ModuleOptions } from "../types/lib";
import Eris from "eris";
import { Module, ModuleCommand, ModuleConstructor } from "../types/moduleDefinition";
import Command from "../lib/Command/Command";

const help: ModuleConstructor = class help implements Module {
  private i10010n: any;

  /**
   * Instantiates the module
   * @constructor
   * @param {Object} e
   * @param {Eris} e.client Eris client
   * @param {Config} e.config File based config
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
    this.i10010n = e.i10010n;
  }

  /**
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent() {
    return {
      name: "Help",
      description: "Help",
      key: "help",
      permNode: "",
      commands: this.getCommands(),
    };
  }

  // noinspection JSMethodCanBeStatic
  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands(): ModuleCommand[] {
    return [{
      triggers: ["help", "commands", "command"],
      permissionCheck: command => true,
      channels: ["*"],
      execute: (command: Command) => {
        return command.reply(command.translate `Help can be found at https://bot.pvpcraft.ca/docs`);
      },
    }];
  }
}

module.exports = help;
