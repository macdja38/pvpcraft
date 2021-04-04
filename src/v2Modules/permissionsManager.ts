/**
 * Created by macdja38 on 2021-04-04.
 */

"use strict";

import Eris from "eris";
import * as Sentry from "@sentry/node";

import utils from "../lib/utils";
import { v2Module, v2ModuleConstructor } from "../types/moduleDefinition";
import { ModuleOptions } from "../types/lib";
import { translateTypeCreator } from "../types/translate";
import Config from "../lib/Config";
import Permissions from "../lib/Permissions";
import {
  PvPInteractiveCommand,
  PvPInteractiveCommandWithOpts,
  SlashCommand,
} from "../lib/Command/PvPCraftCommandHelper";
import { APPLICATION_COMMAND_TYPES } from "../lib/Command/CommandTypes";

let defaultURL = "https://bot.pvpcraft.ca/login/";


let nodeOption = {
  name: "permissionnode",
  description: "Permission node to edit. List on https://bot.pvpcraft.ca/docs * is wildcard mod.ban & mod.bar =mod.*",
  type: APPLICATION_COMMAND_TYPES.STRING,
  required: true,
} as const;

let actionOption = {
  name: "action",
  description: "The action to take on the user/channel/everyone selected",
  type: APPLICATION_COMMAND_TYPES.STRING,
  required: true,
  choices: [
    {
      name: "Allow",
      value: "allow",
    },
    {
      name: "Deny",
      value: "deny",
    },
    {
      name: "Remove",
      value: "remove",
    },
  ],
} as const;

let channelOption = {
  name: "channel",
  description: "Only edit permissions for this channel",
  type: APPLICATION_COMMAND_TYPES.CHANNEL,
} as const;

let roleOption = {
  name: "role",
  description: "Only edit permissions for this role",
  type: APPLICATION_COMMAND_TYPES.ROLE,
} as const;

let userOption = {
  name: "user",
  description: "Only edit permissions for this user. If both user and role is selected 2 permissions will be created",
  type: APPLICATION_COMMAND_TYPES.USER,
} as const;


const setOptions = [
  actionOption,
  nodeOption,
  channelOption,
  userOption,
  roleOption,
] as const;

const permissionsManager: v2ModuleConstructor = class permissionsManager implements v2Module {
  private client: Eris.Client;
  private config: Config;
  private perms: Permissions;
  private i10010n: translateTypeCreator;
  private url: string;

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
    this.client = e.client;
    this.config = e.config;
    this.perms = e.perms;
    this.i10010n = e.i10010n;

    //url where permissions are exposed at.
    this.url = this.config.get("permissions", { url: defaultURL }).url
  }

  /**
   * returns a list of commands in the module
   * @returns {string[]}
   */
  static getCommands() {
    return ["pex", "perm", "setting"];
  }

  /**
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent() {
    return {
      name: "Permissions Management",
      description: "The commands to manage pvpcraft permissions via bot commands, see the documentation for usage.",
      key: "perms",
      permNode: "",
      commands: this.getCommands(),
    };
  }

  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands(): SlashCommand[] {
    return [{
      name: "settings",
      description: "[BETA] Links to the web based PvPCraft settings.",
      channels: "guild",
      options: [],
      execute: (command: PvPInteractiveCommand) => {
        let urlRoot = this.config.get("website", { "settingsRoot": "https://bot.pvpcraft.ca" }).settingsRoot;
        return command.respond(`${urlRoot}/bot/${this.client.user.id}/server/${command.guild.id}/ranks`);
      },
    }, {
      name: "perms",
      description: "Allows editing permissions, a web panel is also available in `/perms list`",
      channels: "guild",
      options: [],
      subCommands: [
        {
          name: "help",
          description: "Learn more about the permissions system.",
          channels: "guild" as "guild",
          options: [],
          execute: (command: PvPInteractiveCommand) => {
            //if no command is supplied supply help url
            return command.respond(command.translate`You need help! visit <https://bot.pvpcraft.ca/docs> for more info`);
          },
        },
        {
          name: "set",
          description: "Edit/Create/Delete a permission.",
          options: setOptions,
          channels: "guild" as "guild",
          execute: (command: PvPInteractiveCommandWithOpts<typeof setOptions>) => {
            // custom auth
            if (!this.perms.checkAdminServer(command) && this.config.get("permissions", { admins: [] }).admins.indexOf(command.member.id) < 0) {
              return command.respond(command.translate`Discord permission \`Admin\` Required`);
            }
            // check if they gave us enough args, if not tell them what to give us.
            if (command.opts.permissionnode.length < 2) {
              return command.respond("This doesn't look like a valid permission node. <https://bot.pvpcraft.ca/docs> has a fairly complete list.");
            }
            if (command.opts.user && command.opts.role) {
              return command.respond("You can't apply a permission node to a user and a role at the same time.");
            }

            // Start assembling the permission node
            let channel;
            let channelMention;
            if (command.opts.channel) {
              channel = command.opts.channel.id;
              channelMention = command.opts.channel.mention;
            } else {
              channel = "*";
              channelMention = command.translate`all channels`;
            }
            let server = command.guild.id;

            // here we find the group's or users effected.
            let target: string;
            let targetMention: string;

            if (command.opts.user) {
              target = `u${command.opts.user.id}`;
              targetMention = command.opts.user.mention;
            } else if (command.opts.role) {
              target = `g${command.opts.role.id}`;
              targetMention = command.opts.role.mention;
            } else {
              target = "*";
              targetMention = command.translate`everyone`;
            }

            // and then the action to take
            let action = command.opts.action as "allow" | "deny" | "remove";
            let actionRoot: "allow" | "deny" | "remov";
            if (action === "remove") {
              actionRoot = "remov";
            } else {
              actionRoot = action;
            }

            // Apply all the info gathered
            const node = server + "." + channel + "." + target + "." + command.opts.permissionnode;
            command.respond({
              content:
                command.translate`${utils.clean(actionRoot)}ing node \`\`\`xl\n${node}\n\`\`\`\
${utils.clean(actionRoot)}ing permission node ${utils.clean(command.opts.permissionnode)} in ${channelMention} for \
${targetMention}`,
              allowedMentions: {},
            });
            this.perms.set(utils.stripNull(node), actionRoot).then((result) => {
              if (!result || result === undefined) {
                return command.channel.createMessage(command.translate`Error: while saving: Database write could not be confirmed. The permissions configuration will be cached locally, but may reset in the future.`)
              }
            }).catch((error) => {
              console.error(error);
              Sentry.captureException(error);
            });
            return true;
          },
        },
        {
          name: "list",
          description: "Links to the permissions site.",
          channels: "guild",
          options: [],
          execute: (command: PvPInteractiveCommand) => {
            return command.respond(this.url.replace(/\$id/, command.guild.id));
          },
        },
        {
          name: "hardreset",
          description: "Guild owner only, Start with a blank slate. Wipe all permissions from the bot.",
          channels: "guild",
          options: [],
          execute: (command: PvPInteractiveCommand) => {
            if (command.member.id === command.guild.ownerID) {
              this.perms.set(command.guild.id, "remov");
              return command.respond(command.translate`All permissions have been reset!`)
            } else {
              return command.respond(command.translate`Only the server owner can use this command.`);
            }
          },
        },
      ],
    }];
  }
}

module.exports = permissionsManager;
