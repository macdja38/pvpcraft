/**
 * Created by macdja38 on 2016-05-04.
 */

"use strict";

import Eris from "eris";

import utils from "../lib/utils";
import { Module, ModuleCommand, ModuleConstructor } from "../types/moduleDefinition";
import { ModuleOptions } from "../types/lib";
import { translateTypeCreator } from "../types/translate";
import Config from "../lib/Config";
import Permissions from "../lib/Permissions";
import { GuildCommand } from "../lib/Command/Command";

let defaultURL = "https://bot.pvpcraft.ca/login/";

const permissionsManager: ModuleConstructor = class permissionsManager implements Module {
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
  getCommands(): ModuleCommand[] {
    return [{
      triggers: ["setting", "settings"],
      permissionCheck: (perms: any) => true,
      channels: ["guild"],
      execute: (command: GuildCommand) => {
        let urlRoot = this.config.get("website", { "settingsRoot": "https://bot.pvpcraft.ca" }).settingsRoot;
        command.reply(`${urlRoot}/bot/${this.client.user.id}/server/${command.channel.guild.id}/ranks`);
        return true;
      },
    }, {
      triggers: ["perms", "perm", "pex"],
      permissionCheck: () => true,
      channels: ["guild"],
      execute: (command: GuildCommand) => {
        //if no command is supplied supply help url
        command.reply(command.translate`You need help! visit <https://bot.pvpcraft.ca/docs> for more info`);
        return true;
      },
      subCommands: [
        {
          triggers: ["set"],
          permissionCheck: () => true,
          channels: ["guild"],
          execute: (command: GuildCommand) => {
            //check if they gave us enough args, if not tell them what to give us.
            if (command.args.length < 2) {
              return command.reply("perms set <allow|deny|remove> <node>");
            }
            let channel;
            let server;
            if (command.options.channel) {
              //user has specified a channel level permission
              let channelMatch = command.options.channel.match(/<#(\d+)>/);
              if (channelMatch) {
                channel = command.channel.guild.channels.get(channelMatch[1]);
              } else {
                channel = command.channel.guild.channels.find(c => c.name === command.options.channel);
              }
              if (channel) {
                server = command.channel.guild.id;
                channel = channel.id;
              } else {
                return command.reply(command.translate`Could not find channel specified please either mention the channel or use it's full name`);
              }
            } else {
              //user has not specified channel, assume server wide
              channel = "*";
              server = command.channel.guild.id;
            }
            if (!this.perms.checkAdminServer(command) && this.config.get("permissions", { admins: [] }).admins.indexOf(command.author.id) < 0) {
              return command.reply(command.translate`Discord permission \`Admin\` Required`);
            }
            //here we find the group's or users effected.
            let target;
            if (command.options.group && !command.options.role) {
              command.options.role = command.options.group
            }
            if (command.options.user) {
              const userMatch = command.options.user.match(/<@!?(\d+)>/)
              if (userMatch) {
                target = command.channel.guild.members.get(userMatch[1]);
              } else {
                target = command.channel.guild.members.find(m => m.nick === command.options.user || m.username === command.options.user)
              }
              if (target) {
                target = "u" + target.id
              } else {
                return command.reply(command.translate`Could not find user with that name, please try a mention or name, names are case sensitive`);
              }
            } else if (command.options.role) {
              const roleMatch = command.options.role.match(/<@&(\d+)>/)
              if (roleMatch) {
                target = command.channel.guild.roles.get(roleMatch[1]);
              } else {
                target = command.channel.guild.roles.find(r => r.name === command.options.role);
              }
              if (target) {
                target = "g" + target.id
              } else {
                return command.reply(command.translate`Could not find role with that name, please try a mention or name, names are case sensitive`);
              }
            } else {
              target = "*"
            }
            let action: string | number | undefined = command.args.shift()?.toLowerCase();
            if (!action) {
              throw new Error("Something we thought we checked turned out not to be true, this error has been reported.");
            }
            if (action === "remove") action = "remov";
            const node = server + "." + channel + "." + target + "." + command.args[0];
            command.reply(command.translate`${utils.clean(action)}ing node \`\`\`xl\n${node}\n\`\`\`\;
${utils.clean(action)}ing permission node ${utils.clean(command.args[0])} in ${channel === "*" ? command.translate`all channels` : channel} for \
${target === "*" ? command.translate`everyone` : utils.clean(target)}`);
            let numValue = parseInt(action);
            if (!isNaN(numValue)) {
              action = numValue;
            }
            this.perms.setLoseTypings(utils.stripNull(node), action).then((result) => {
              if (!result || result === undefined) {
                command.reply(command.translate`Error: while saving: Database write could not be confirmed. The permissions configuration will be cached locally, but may reset in the future.`)
              }
            }).catch(console.error);
            return true;
          },
        },
        {
          triggers: ["list"],
          permissionCheck: () => true,
          channels: ["guild"],
          execute: (command: GuildCommand) => {
            return command.reply(this.url.replace(/\$id/, command.channel.guild.id));
          },
        },
        {
          triggers: ["hardreset"],
          permissionCheck: () => true,
          channels: ["guild"],
          execute: (command: GuildCommand) => {
            if (command.author.id === command.channel.guild.ownerID) {
              this.perms.set(command.channel.guild.id, "remov");
              return command.reply(command.translate`All permissions have been reset!`)
            } else {
              return command.reply(command.translate`Only the server owner can use this command.`);
            }
          },
        },
      ],
    }];
  }
}

module.exports = permissionsManager;
