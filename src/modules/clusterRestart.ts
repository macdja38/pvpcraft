/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

import { Module, ModuleCommand, ModuleConstructor } from "../types/moduleDefinition";
import { ModuleOptions } from "../types/lib";
import Config from "../lib/Config";
import Eris from "eris";
import Command from "../lib/Command/Command";

const clusterRestart: ModuleConstructor = class clusterRestart implements Module {
  private fileConfig: Config;
  private client: Eris.Client;
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
   */
  constructor(e: ModuleOptions) {
    //save the client as this.client for later use.
    this.client = e.client;
    this.fileConfig = e.config;
  }

  getCommands(): ModuleCommand[] {
    return [{
      triggers: ["restart"],
      permissionCheck: (command) => this.fileConfig.get("permissions", {"permissions": {admins: []}}).admins.includes(command.author.id),
      channels: ["*"],
      execute: (command: Command) => {
        console.log("Triggering restart");
        // @ts-ignore
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
