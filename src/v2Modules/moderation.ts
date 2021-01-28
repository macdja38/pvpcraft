/**
 * Created by macdja38 on 2016-06-13.
 */

"use strict";

import { v2Module, v2ModuleConstructor } from "../types/moduleDefinition";
import { ModuleOptions } from "../types/lib";
import ConfigDB from "../lib/ConfigDB";
import Eris from "eris";
import Permissions from "../lib/Permissions";

import { APPLICATION_COMMAND_TYPES } from "../lib/Command/CommandTypes";
import {
  PvPInteractiveCommandWithOpts,
  SlashCommand,
} from "../lib/Command/PvPCraftCommandHelper";
import { translateTypeCreator } from "../types/translate";
import PvPCraft from "../PvPCraft";
import { moderationV2 } from "../modules/moderationV2";
import Utils from "../lib/utils";
import * as Sentry from "@sentry/node";

const moderation: v2ModuleConstructor = class moderation implements v2Module {
  private client: Eris.Client;
  private pvpClient: any;
  private config: ConfigDB;
  private perms: Permissions;
  private i10010n: translateTypeCreator;
  private pvpcraft: PvPCraft;
  private baseModule: moderationV2;

  getModerationV2Module() {
    const bracketsWrapper = this.pvpcraft.moduleList.find(moduleWrapper => moduleWrapper.commands.find(command => command.triggers.includes("purge")));
    if (!bracketsWrapper) {
      return undefined
    }
    return bracketsWrapper.module as moderationV2;
  }

  getModerationV2Commands() {
    const bracketsWrapper = this.pvpcraft.moduleList.find(moduleWrapper => moduleWrapper.commands.find(command => command.triggers.includes("purge")));
    if (!bracketsWrapper) {
      return undefined
    }
    return bracketsWrapper.commands;
  }

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
    this.client = e.client;
    this.pvpClient = e.pvpClient;
    this.pvpcraft = e.pvpcraft;
    this.config = e.configDB;
    this.perms = e.perms;
    this.i10010n = e.i10010n;

    const baseModule = this.getModerationV2Module();
    if (!baseModule) {
      throw new Error("ModerationV2 must be loaded first");
    }
    this.baseModule = baseModule;
  }

  /**
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent() {
    return {
      name: "Moderation Commands",
      description: "Various moderation actions, mute, purge, ban, kick, unban etc.",
      key: "moderation",
      permNode: "admin.moderation",
      commands: this.getCommands(),
    };
  }

  /**
   * Returns an array of commands that can be called by the command handler
   */
  getCommands(): SlashCommand[] {
    return [
      (() => {
        const options = [{
          name: "user",
          description: "The user to ban.",
          type: APPLICATION_COMMAND_TYPES.USER,
          required: true,
        }, {
          name: "reason",
          description: "Why the user is being banned.",
          type: APPLICATION_COMMAND_TYPES.STRING,
          required: true,
        }, {
          name: "time",
          description: "The duration of messages to delete. Default is 24h.",
          type: APPLICATION_COMMAND_TYPES.INTEGER,
          choices: [{
            name: "Don't delete any",
            value: 0,
          }, {
            name: "24 hours",
            value: 1,
          }, {
            name: "7 days",
            value: 7,
          }],
          required: false,
        }] as const;

        return {
          name: "ban",
          description: "Bans a user.",
          permission: "moderation.ban",
          channels: "guild" as const,
          options: options,
          execute: (command: PvPInteractiveCommandWithOpts<typeof options>) => {
            const targetUser = command.opts.user

            // check to see if user has ban immunity
            if (this.perms.checkUserGuild(targetUser, command.guild, `moderation.immunity.ban`)) {
              return command.respond(command.translate`This user has the ban immunity permission \`moderation.immunity.ban\`, you may not ban them.`);
            }

            return this.baseModule.moderationActionCore(command.guild, "ban", targetUser.user, command.member.user, targetUser.id, command.opts.time, command.opts.reason);
          }
        }
      })(),
      (() => {
        const options = [{
          name: "user",
          description: "The user to kick.",
          type: APPLICATION_COMMAND_TYPES.USER,
          required: true,
        }, {
          name: "reason",
          description: "Why the user is being kicked.",
          type: APPLICATION_COMMAND_TYPES.STRING,
          required: false,
        }] as const;

        return {
          name: "kick",
          description: "kicks a user.",
          permission: "moderation.kick",
          channels: "guild" as const,
          options: options,
          execute: (command: PvPInteractiveCommandWithOpts<typeof options>) => {
            const targetUser = command.opts.user

            // check to see if user has kick immunity
            if (this.perms.checkUserGuild(targetUser, command.guild, `moderation.immunity.kick`)) {
              return command.respond(command.translate`This user has the kick immunity permission \`moderation.immunity.kick\`, you may not kick them.`);
            }

            return this.baseModule.moderationActionCore(command.guild, "kick", targetUser.user, command.member.user, targetUser.id, command.opts.reason);
          }
        }
      })(),
      (() => {
        const options = [{
          name: "user",
          description: "The user to unban.",
          type: APPLICATION_COMMAND_TYPES.USER,
          required: true,
        }, {
          name: "reason",
          description: "Why the user is being unbanned.",
          type: APPLICATION_COMMAND_TYPES.STRING,
          required: false,
        }] as const;

        return {
          name: "unban",
          description: "unbans a user.",
          permission: "moderation.unban",
          channels: "guild" as const,
          options: options,
          execute: (command: PvPInteractiveCommandWithOpts<typeof options>) => {
            const targetUser = command.opts.user

            return this.baseModule.moderationActionCore(command.guild, "unban", targetUser.user, command.member.user, targetUser.id, command.opts.reason);
          }
        }
      })(),
      (() => {
        const options = [{
          name: "user",
          description: "The user to mute.",
          type: APPLICATION_COMMAND_TYPES.USER,
          required: true,
        }, {
          name: "reason",
          description: "Why the user is being muted.",
          type: APPLICATION_COMMAND_TYPES.STRING,
          required: false,
        }, {
          name: "unmute",
          description: "How long to mute for. Try `3 days`, `4 hours`, or `1 week` for example.",
          type: APPLICATION_COMMAND_TYPES.STRING,
          required: false,
        }] as const;

        return {
          name: "mute",
          description: "mutes a user.",
          permission: "moderation.mute",
          channels: "guild" as const,
          options: options,
          execute: async (command: PvPInteractiveCommandWithOpts<typeof options>) => {
            const target = command.opts.user;

            // check to see if user has mute immunity
            if (this.perms.checkUserGuild(target, command.guild, `moderation.immunity.mute`)) {
              return command.respond(command.translate`This user has the mute immunity permission \`moderation.immunity.mute\`, you may not mute them.`);
            }

            return command.respond(await this.baseModule.mute(command.guild, command.translate, undefined, target, command.member, command.opts.unmute, command.opts.reason));
          }
        }
      })(),
    ];
  }
}

module.exports = moderation;
