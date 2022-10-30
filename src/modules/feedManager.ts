/**
 * Created by macdja38 on 2016-09-01.
 */
"use strict";

import Eris from "eris";
import utils from "../lib/utils";
import Permissions from "../lib/Permissions";
import { Module, ModuleCommand, ModuleConstructor } from "../types/moduleDefinition";
import { translateTypeCreator } from "../types/translate";
import { ModuleOptions } from "../types/lib";
import Feeds from "../lib/feeds";
import Command, { GuildCommand } from "../lib/Command/Command";

const feedManager: ModuleConstructor = class feedManager implements Module {
  private _client: Eris.Client;
  private _feeds: Feeds;
  private perms: Permissions;
  private i10010n: translateTypeCreator;
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
    this._client = e.client;
    this._feeds = e.feeds;
    this.perms = e.perms;
    this.i10010n = e.i10010n;
  }

  addOrRemoveFeed(adding: boolean, command: GuildCommand) {
    if (!command.args[0]) {
      command.reply(command.translate `Usage ${command.prefix}${command.command} <start|stop> <node>[ --channel <channel>]`);
      return true;
    }
    let channel = command.channel;
    if (command.options.hasOwnProperty("webhook")
      && /https:\/\/(?:ptb.|canary\.)?discordapp\.com\/api\/webhooks\/(\d+)\/(.+)/.test(command.options.webhook)) {
      let matches = command.options.webhook
        .match(/https:\/\/(?:ptb.|canary\.)?discordapp\.com\/api\/webhooks\/(\d+)\/(.+)/i);
      channel = {
        // @ts-ignore
        id: `https://discordapp.com/api/webhooks/${matches[1]}/${matches[2]}`,
        // @ts-ignore
        guild: {id: command.channel.guild.id},
        mention: `another Discord`,
      };
    }
    else if (!channel) {
      channel = command.channel;
    }
    this._feeds.set(adding, utils.stripNull(command.args[0].toLowerCase()), channel.id, channel.guild.id);
    return command.reply(command.translate `${adding ? "Starting" : "Stopping"} ${command.args[0].toLowerCase()} in channel ${channel.mention}`);
  }

  /**
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent() {
    return {
      name: "Feeds",
      description: "Commands used to manage feeds, see the feeds section of the documentation for more",
      key: "feeds",
      permNode: "feeds",
      commands: this.getCommands(),
    };
  }

  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands(): ModuleCommand[] {
    return [{
      triggers: ["feed", "feeds"],
      permissionCheck: this.perms.genCheckCommand("feeds.manage"),
      channels: ["guild"],
      subCommands: [
        {
          triggers: ["list"],
          permissionCheck: this.perms.genCheckCommand("feeds.manage"),
          channels: ["guild"],
          execute: (command: GuildCommand) => {
            let data = this._feeds.list(command.channel.guild.id);
            if (data && data.hasOwnProperty("feeds")) {
              console.log(data.feeds);
              command.createMessageAutoDeny(`\`\`\`json\n${JSON.stringify(data.feeds, null, 2)}\n\`\`\``);
            } else {
              command.createMessageAutoDeny(command.translate `No feeds are configured`);
            }
            return true;
          }
        },
        {
          triggers: ["start"],
          permissionCheck: this.perms.genCheckCommand("feeds.manage"),
          channels: ["guild"],
          execute: (command: GuildCommand) => {
            return this.addOrRemoveFeed(true, command);
          }
        },
        {
          triggers: ["stop"],
          permissionCheck: this.perms.genCheckCommand("feeds.manage"),
          channels: ["guild"],
          execute: (command: GuildCommand) => {
            return this.addOrRemoveFeed(false, command);
          }
        }
      ],
      execute: (command: Command) => {
        command.reply(command.translate `Usage ${command.prefix}${command.command} <start|stop> <node>[ --channel <channel>]`);
        return true;
      },
    }, {
      triggers: ["find"],
      permissionCheck: this.perms.genCheckCommand("feeds.find"),
      channels: ["guild"],
      execute: (command: GuildCommand) => {
        if (!command.args[0]) {
          return command.replyAutoDeny(command.translate `Usage ${command.prefix}${command.command} <node>`)
        }
        return command.replyAutoDeny(`${
          this._feeds.find(command.args[0].toLowerCase(), command.channel.id)
            .map(channelId => command.channel.guild.channels.get(channelId) || channelId)
          }`);
      },
    }];
  }
}

module.exports = feedManager;
