import { ModuleOptions } from "../types/lib";
import Command, { GuildCommand } from "../lib/Command/Command";
import Eris, { Message } from "eris";
import Permissions from "../lib/Permissions";
import { SlashCommand } from "../lib/Command/PvPCraftCommandHelper";

export interface ModuleConstructor {
  new(e: ModuleOptions): Module;
}

export interface v2ModuleConstructor {
  new(e: ModuleOptions): v2Module;
}

export type ModuleCommandAnywhere = {
  name?: string;
  triggers: string[];
  permissionCheck: (any: any) => any;
  permNode?: string[];
  channels: "*" | ["*"];
  usage?: string;
  description?: string;
  execute: (command: Command) => Promise<any> | boolean
  subCommands?: ModuleCommand[]
}

export type ModuleCommandGuild = {
  name?: string;
  triggers: string[];
  permissionCheck: (any: any) => any;
  permNode?: string[];
  channels: "guild" | ["guild"];
  usage?: string;
  description?: string;
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
   * @param perms
   * @param prefixes
   * @returns {boolean | Promise}
   */
  checkMisc?(msg: Message, perms: Permissions, prefixes: string[]): boolean | Promise<any>

  onDisconnect?(): void

  onReady?(): void

  onGuildCreate?(guild: Eris.Guild): void;
  onGuildDelete?(guild: Eris.Guild): void;

  /**
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent?(): { name: string; description: string; key: string; permNode: string; commands: ModuleCommand[] }
}

export interface v2Module extends Omit<Module, "getCommands" | "getContent"> {
  getCommands(): SlashCommand[];

  getContent?(): { name: string; description: string; key: string, permNode: string; commands: SlashCommand[] }
}

export interface Middleware extends Module {
  /**
   * Get's called every message.
   * @param {Message} msg
   * @param {Permissions} perms
   */
  onMessage?(msg: Message, perms: Permissions): void

  /**
   * Get's called every Message, (unless a previous middleware on the list override it.) can modify message.
   * @param {Message} msg
   * @param perms
   * @returns {Message} msg that will be passed to modules and other middleware
   */
  changeMessage?(msg: Message, perms: Permissions): Message

  /**
   * Get's called every Command, (unless a previous middleware on the list override it.) can modify message.
   * @param {Message} msg
   * @param {Command} command
   * @param perms
   * @returns {Command | boolean}
   */
  changeCommand?(msg: Message, command: Command | false, perms: Permissions): Command | false
}
