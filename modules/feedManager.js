/**
 * Created by macdja38 on 2016-09-01.
 */
"use strict";

let utils = require('../lib/utils');

class feedManager {
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
   */
  constructor(e) {
    this._client = e.client;
    this._feeds = e.feeds;
    this.perms = e.perms;
  }

  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands() {
    return [{
      triggers: ["feed", "feeds"],
      permissionCheck: this.perms.genCheckCommand("feeds.manage"),
      channels: ["guild"],
      execute: command => {
        let adding;
        switch (command.args[0]) {
          case "list": {
            let data = this._feeds.list(command.channel.guild.id);
            if (data.hasOwnProperty("feeds")) {
              console.log(data.feeds);
              command.createMessageAutoDeny(`\`\`\`json\n${JSON.stringify(data.feeds, null, 2)}\n\`\`\``);
            } else {
              command.createMessageAutoDeny("No feeds are configured");
            }
            return true;
          }
          case "start":
            adding = true;
            break;
          case "stop":
            adding = false;
            break;
          default:
            command.reply(`Usage ${command.prefix}${command.command} <start|stop> <node>[ --channel <channel>]`);
            return true;
        }
        if (!command.args[1]) {
          command.reply(`Usage ${command.prefix}${command.command} <start|stop> <node>[ --channel <channel>]`);
          return true;
        }
        let channel = command.channel;
        if (command.options.hasOwnProperty("webhook")
          && /https:\/\/(?:ptb.|canary\.)?discordapp\.com\/api\/webhooks\/(\d+)\/(.+)/.test(command.options.webhook)) {
          let matches = command.options.webhook
            .match(/https:\/\/(?:ptb.|canary\.)?discordapp\.com\/api\/webhooks\/(\d+)\/(.+)/i);
          channel = {
            id: `https://discordapp.com/api/webhooks/${matches[1]}/${matches[2]}`,
            server: {id: command.channel.guild.id},
            mention: function mention() {
              return `another Discord`;
            }
          };
        }
        else if (!channel) {
          channel = command.channel;
        }
        this._feeds.set(adding, utils.stripNull(command.args[1].toLowerCase()), channel.id, channel.guild.id);
        command.reply(`${adding ? "Starting" : "Stopping"} ${command.args[1].toLowerCase()} in channel ${channel.mention}`);

        //return true, which tells the command dispatcher that we processed the command.
        return true;
      },
    }, {
      triggers: ["find"],
      permissionCheck: this.perms.genCheckCommand("feeds.find"),
      channels: ["guild"],
      execute: command => {
        if (!command.args[0]) {
          command.replyAutoDeny(`Usage ${command.prefix}${command.command} <node>`)
        }
        command.replyAutoDeny(`${
          this._feeds.find(command.args[0].toLowerCase(), command.channel.id)
            .map(channelId => command.channel.guild.channels.get(channelId) || channelId)
          }`);
      },
    }];
  }
}

module.exports = feedManager;