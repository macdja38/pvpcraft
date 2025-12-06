/**
 * Created by macdja38 on 2016-06-13.
 */

"use strict";

import {v2Module, v2ModuleConstructor} from "../types/moduleDefinition";
import {ModuleOptions} from "../types/lib";
import ConfigDB from "../lib/ConfigDB";
import Eris from "eris";
import Permissions from "../lib/Permissions";

import {APPLICATION_COMMAND_TYPES} from "../lib/Command/CommandTypes";
import {
  PvPInteractiveCommandWithOpts,
  SlashCommand,
} from "../lib/Command/PvPCraftCommandHelper";
import {translateTypeCreator} from "../types/translate";
import PvPCraft from "../PvPCraft";
import {moderationV2} from "../modules/moderationV2";
import Utils from "../lib/utils";
import * as Sentry from "@sentry/node";
import Purger from "../lib/Purger";

const purge: v2ModuleConstructor = class moderation implements v2Module {
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
        const options = [
          {
            name: "count",
            description: "Number of messages to purge",
            type: APPLICATION_COMMAND_TYPES.INTEGER,
            required: true,
          }, {
            name: "user",
            description: "user who's messages to purge.",
            type: APPLICATION_COMMAND_TYPES.USER,
            required: false,
          }, {
            name: "channel",
            description: "channel to purge, defaults to the current channel.",
            type: APPLICATION_COMMAND_TYPES.CHANNEL,
            required: false,
          }, {
            name: "reason",
            description: "Reason why a purge is being performed",
            type: APPLICATION_COMMAND_TYPES.STRING,
            required: false,
          }, {
            name: "before",
            description: "Delete messages before this message.",
            type: APPLICATION_COMMAND_TYPES.STRING,
            required: false,
          }, {
            name: "after",
            description: "Delete messages after this message.",
            type: APPLICATION_COMMAND_TYPES.STRING,
            required: false,
          }, {
            name: "d",
            description: "Don't log these messages",
            type: APPLICATION_COMMAND_TYPES.BOOLEAN,
            required: false,
          }, {
            name: "ignorepins",
            description: "Ignore pinned messages, as in don't delete them. Defaults to ignoring",
            type: APPLICATION_COMMAND_TYPES.BOOLEAN,
            required: false,
          }, {
            name: "purgeoldmessages",
            description: "purge old messages, this will be really slow",
            type: APPLICATION_COMMAND_TYPES.BOOLEAN,
            required: false,
          }
        ] as const;

        return {
          name: "purge",
          description: "purges messages.",
          permission: "moderation.tools.purge",
          channels: "guild" as const,
          options: options,
          execute: async (command: PvPInteractiveCommandWithOpts<typeof options>) => {
            const targetUser = command.opts.user

            const channel = command.opts.channel || command.channel;

            if (!(channel instanceof Eris.TextChannel || channel instanceof Eris.ThreadChannel)) {
              return command.respond(`Must be run in a guild text channel`)
            }

            const fetchOptions: Parameters<typeof this.baseModule["fetchMessages"]>[2] = {
              after: command.opts.after,
              before: command.opts.before,
              user: targetUser?.user
            }

            const pins = await channel.getPins();
            
            // Enable server ignores if "d" flag is set
            if (command.opts.d && channel.guild) {
              this.baseModule.updateServerIgnores(1, channel.guild.id);
            }

            // Translate function for the purger
            const translate = command.translate.bind(command);

            let statusMessage: Eris.Message<Eris.TextableChannel> | null = null;

            const updateStatus = async (text: string) => {
              if (statusMessage) {
                Utils.handleErisRejection(this.client.editMessage(channel.id, statusMessage.id, text));
              } else {
                try {
                  await command.editResponse(text)
                } catch (error) {
                  let responseCode;
                  if (error.response) {
                    responseCode = error.response.code;
                  }
                  if (responseCode === 50027) {
                    try {
                      statusMessage = await this.client.createMessage(channel.id, text)
                    } catch (error) {
                      Utils.handleErisRejection(Promise.reject(error));
                    }
                  }
                }
              }
            };

            // Create a Set of pinned message IDs if we should ignore pins (default behavior)
            // Only delete pins if ignorepins is explicitly set to false
            const shouldIgnorePins = command.opts.ignorepins !== false;
            const pinnedMessageIds = shouldIgnorePins 
              ? new Set(pins.map(pin => pin.id))
              : undefined;

            // Create and start the purger
            const purger = new Purger({
              channel,
              updateStatus,
              fetchMessages: this.baseModule.fetchMessages.bind(this.baseModule),
              translate,
              pinnedMessageIds,
            });

            purger.start(command.opts.count, fetchOptions, command.opts.purgeoldmessages);

            // Set up status updates
            const updateStatusFunction = async () => {
              const stats = purger.getStats();
              
              if (purger.isDone()) {
                if (!stats.errorMessage) {
                  const finalStatus = this.baseModule.getStatus(
                    stats.totalPurged,
                    stats.totalFetched,
                    command.opts.count,
                    stats.oldMessagesFound,
                    stats.purgeOldMessages,
                    { translate } as any
                  );
                  updateStatus(finalStatus);
                }
                
                // Clean up after 5 seconds
                setTimeout(() => {
                  if (command.opts.d && channel.guild) {
                    this.baseModule.updateServerIgnores(-1, channel.guild.id);
                  }
                }, 5000);
                return;
              } else {
                if (!stats.errorMessage) {
                  const currentStatus = this.baseModule.getStatus(
                    stats.totalPurged,
                    stats.totalFetched,
                    command.opts.count,
                    stats.oldMessagesFound,
                    stats.purgeOldMessages,
                    { translate: (s: TemplateStringsArray, ...v: any[]) => s.reduce((r, str, i) => r + str + (v[i] || ''), '') } as any
                  );
                  await updateStatus(currentStatus);
                }
              }
              setTimeout(updateStatusFunction, 2500);
            };
            
            setTimeout(updateStatusFunction, 500);
            return command.respond(`Starting purge of ${command.opts.count} messages...`);
          }
        }
      })(),
    ];
  }
}

module.exports = purge;
