import { ModuleOptions } from "../types/lib";
import Command, { GuildCommand } from "../lib/Command";
import { Message } from "eris";

export interface ModuleConstructor {
  new(e: ModuleOptions): Module;
}

export type ModuleCommandAnywhere = {
  triggers: string[];
  permissionCheck: (any: any) => any;
  channels: "*" | ["*"];
  execute: (command: GuildCommand) => Promise<any> | boolean
  subCommands?: ModuleCommand[]
}

export type ModuleCommandGuild = {
  triggers: string[];
  permissionCheck: (any: any) => any;
  channels: "guild" | ["guild"];
  execute: (command: GuildCommand) => Promise<any> | boolean
  subCommands?: ModuleCommandGuild[]
}

export type ModuleCommand = ModuleCommandAnywhere | ModuleCommandGuild;

export interface Module {
  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands(): ModuleCommand[]

  /**
   * Optional function that will be called with every message for the purpose of misc responses / other
   * @param {Message} msg
   * @returns {boolean | Promise}
   */
  checkMisc?(msg: Message): boolean | Promise<any>

  onDisconnect?(): void

  onReady?(): void

  /**
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent?(): { name: string; description: string; key: string; permNode: string; commands: ModuleCommand[] }
}
