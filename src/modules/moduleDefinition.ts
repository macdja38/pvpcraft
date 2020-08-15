import { ModuleOptions } from "../types/lib";
import Command from "../lib/Command";
import { Message } from "eris";

export interface ModuleConstructor {
  new(e: ModuleOptions): Module;
}

export type ModuleCommand = {
  triggers: string[];
  permissionCheck: (any: any) => any;
  channels: string[];
  execute: (command: Command) => Promise<any> | boolean
  subCommands?: ModuleCommand[]
}

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
