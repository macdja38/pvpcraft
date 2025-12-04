/**
 * Created by macdja38 on 2016-04-25.
 */

"use strict";

import utils from "../lib/utils";
import { Module, ModuleCommand, ModuleConstructor } from "../types/moduleDefinition";
import { ModuleOptions } from "../types/lib";
import Config from "../lib/Config";
import Permissions from "../lib/Permissions";
import Eris from "eris";
import Command, { GuildCommand } from "../lib/Command/Command";
const now = require('performance-now');

const os = require('os');
const numCPUs = os.cpus().length;

const utilities: ModuleConstructor = class utilities implements Module {
  private git: any;
  private perms: Permissions;
  private client: Eris.Client;
  private config: Config;
  private i10010n: any;

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
    this.git = e.git;
    this.perms = e.perms;
    this.client = e.client;
    this.config = e.config;
    this.i10010n = e.i10010n;
  }

  /**
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent() {
    return {
      name: "Utilities",
      description: "Miscellaneous utility commands",
      key: "utils",
      permNode: "utils",
      commands: this.getCommands(),
    };
  }

  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands(): ModuleCommand[] {
    return [{
      triggers: ["serverinfo", "server"],
      permissionCheck: this.perms.genCheckCommand("utils.serverinfo"),
      channels: ["guild"],
      execute: (command: GuildCommand) => {
        let guild = command.channel.guild;
        let botCount = guild.members.filter(m => m.bot).length;
        let owner = guild.members.get(guild.ownerID);

        const embed: Eris.EmbedOptions = {
          title: `Server Info for ${utils.clean(command.channel.guild.name)}`,
          description: `Id: ${guild.id}\n` +
            `Created: ${new Date(guild.createdAt).toUTCString()}\n` +
            `Owner: ${utils.clean(owner?.username || guild.ownerID)}\n` +
            `Humans: ${(guild.members.size - botCount)} Bots: ${botCount}\n` +
            `Roles: ${utils.clean(guild.roles.map(r => r.name).join(", "))}\n` +
            `Icon URL: ${guild.iconURL}`,
        }

        if (guild.iconURL) {
          embed.thumbnail = {url: guild.iconURL};
        }

        command.createMessageAutoDeny({
          embed,
        });
        return true;
      },
    }, {
      triggers: ["userinfo", "user"],
      permissionCheck: this.perms.genCheckCommand("utils.userinfo"),
      channels: ["guild"],
      execute: (command: GuildCommand) => {
        let string = "";
        let member;
        let targets = command.args;
        if (command.args.length === 0) {
          targets.push("<@" + command.author.id + ">");
        }
        for (let arg of targets) {
          const targetID = (() => {
            const match = arg.match(/(?:<@|<@!)(\d+)>/);
            if (match) {
              return match[1];
            }
            return null;
          })();

          if (targetID) {
            member = command.channel.guild.members.get(targetID);
          } else {
            member = command.channel.guild.members.find(m => m.username === arg)
          }
          if (member) {
            let comaUserNameCodes = [...member.username].map(char => char.charCodeAt(0)).join(", ");
            command.createMessageAutoDeny({
              embed: {
                title: command.translate `User Info for ${utils.clean(member.username)}`,
                description: command.translate `Char Codes: ${comaUserNameCodes}\n` +
                ((member.nick) ? command.translate `Nick: ${utils.clean(member.nick)}\n` : "") +
                `Id: ${member.id}\n` +
                command.translate `Descrim: ${member.discriminator}\n` +
                command.translate `Created: ${new Date(member.createdAt).toUTCString()}\n` +
                command.translate `Joined: ${new Date(member.joinedAt).toUTCString()}\n` +
                command.translate `Avatar URL: ${member.avatarURL}\n`,
                thumbnail: {url: member.avatarURL},
              },
            });
          }
          else {
            string += command.translate `Could not find **${utils.clean(arg)}**.
`;
          }
        }
        if (string !== "") command.createMessageAutoDeny(string);
        return true;
      },
    }, {
      triggers: ["ping"],
      permissionCheck: this.perms.genCheckCommand("utils.ping"),
      channels: ["*"],
      execute: (command: Command) => {
        let t1 = now();
        command.createMessageAutoDeny("Testing Ping").then((message) => {
          let t2 = now();
          if (!message) {
            throw new Error("Failed to send first message to test ping");
          }
          utils.handleErisRejection(this.client.editMessage(message.channel.id, message.id, "Ping is `" + (t2 - t1) + "`ms!"));
        });
        return true;
      },
    }, {
      triggers: ["lmgtfy"],
      permissionCheck: this.perms.genCheckCommand("utils.lmgtfy"),
      channels: ["*"],
      execute: (command: Command) => {
        // http://lmgtfy.com/?q=How+to+hug
        command.createMessageAutoDeny(`http://lmgtfy.com/?q=${command.args.join("+")}`);
        return true;
      },
    }, {
      triggers: ["status"],
      permissionCheck: this.perms.genCheckCommand("utils.status"),
      channels: ["*"],
      execute: (command: Command) => {
        command.createMessageAutoDeny({
          embed: {
            title: command.translate `Status info`,
            description: command.translate `\`\`\`xl\nShard: ${process.env.id}/${process.env.shards}\n` +
            command.translate `CPU: ${os.loadavg()[0] / numCPUs * 100}%\n` +
            command.translate `LoadAverage ${os.loadavg()}\n` +
            command.translate `Memory usage: ${process.memoryUsage().heapTotal / 1000000}MB\n` +
            `RSS: ${process.memoryUsage().rss / 1000000}MB\n\`\`\`` +
            command.translate `Version: [current](https://github.com/macdja38/pvpcraft/commit/${this.git.commit}), [outdated by](https://github.com/macdja38/pvpcraft/compare/${this.git.commit}...${this.git.branch})`,
            thumbnail: {url: this.client.user.avatarURL},
          },
        });
        return true;
      },
    }];
  }
}

module.exports = utilities;
