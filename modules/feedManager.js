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
   * @param {Client} e.client Eris client
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
    //save the client as this.client for later use.
    this._client = e.client;
    //save the bug reporting thing raven for later use.
    this._feeds = e.feeds;
  }

  static getCommands() {
    //this needs to return a list of commands that should activate the onCommand function
    //of this class. array of strings with trailing s's removed.
    return ["feed", "find"];
  }

  /**
   * Called with a command, returns true or a promise if it is handling the command, returns false if it should be passed on.
   * @param {Message} msg
   * @param {Command} command
   * @param {Permissions} perms
   * @returns {boolean | Promise}
   */
  onCommand(msg, command, perms) {
    if (!msg.channel.guild) return false; // will not work in pms
    //check if this is a command we should handle and if the user has permissions to execute it.
    if (command.commandnos === "feed" && perms.check(msg, "feeds.manage")) {
      let adding;
      switch (command.args[0]) {
        case "list": {
          let data = this._feeds.list(msg.channel.guild.id);
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
          server: {id: msg.channel.guild.id},
          mention: function mention() {
            return `another Discord`;
          }
        };
      }
      else if (!channel) {
        channel = msg.channel;
      }
      this._feeds.set(adding, utils.stripNull(command.args[1].toLowerCase()), channel.id, channel.guild.id);
      command.reply(`${adding ? "Starting" : "Stopping"} ${command.args[1].toLowerCase()} in channel ${channel.mention}`);

      //return true, which tells the command dispatcher that we processed the command.
      return true;
    }

    if (command.command === "find" && perms.check(msg, "feeds.find")) {
      if (!command.args[0]) {
        command.replyAutoDeny(`Usage ${command.prefix}${command.command} <node>`)
      }
      command.replyAutoDeny(`${
        this._feeds.find(command.args[0].toLowerCase())
          .map(channelId => msg.channel.guild.channels.get(channelId) || channelId)
        }`);
    }
    //return false, telling the command dispatcher the command was not handled and to keep looking,
    //or start passing it to misc responses.
    return false;
  }
}

module.exports = feedManager;