/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

const SlowSender = require('../lib/SlowSender');

const ConfigDB = require('../lib/ConfigDB');

class giveaways {
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
    this.client = e.client;
    this.raven = e.raven;
    this.perms = e.perms;
    this._slowSender = new SlowSender(e);
    this.entries = new ConfigDB(e.r, "entries", e.client);
    this.ready = this.entries.reload();
  }

  onDisconnect() {
    this._slowSender.onDisconnect();
  }

  onReady() {
    this._slowSender.onReady();
  }

  /**
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent() {
    return {
      name: "Giveaways",
      description: "Start a giveaway using the discord bot, have users enter, then draw one or more winners!",
      key: "giveaway",
      permNode: "giveaway",
      commands: this.getCommands(),
    };
  }

  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands() {
    return [{
      triggers: ["giveaway"],
      permissionCheck: this.perms.genCheckCommand("admin.giveaway.setup"),
      channels: ["guild"],
      execute: command => {
        if (command.args.length > 0 && (command.args[0] === "enable" || command.args[0] === "disable")) {
          let data = this.entries.get(null, {}, {server: command.channel.guild.id});
          data.enable = command.args[0] === "enable";
          if (command.hasOwnProperty("channel")) {
            data.channel = command.channel.id;
          } else if (!data.hasOwnProperty("channel")) {
            data.channel = command.channel.id;
          }
          if (!data.hasOwnProperty("entries")) {
            data.entries = [];
          }
          this.entries.set(null, data, {server: command.channel.guild.id});
          command.replyAutoDeny(i10010n `Giveaways ${data.enable ? "enabled" : "disabled"} in channel <#${data.channel}>`);
        }
        return true;
      },
    }, {
      triggers: ["gclear"],
      permissionCheck: this.perms.genCheckCommand("admin.giveaway.clear"),
      channels: ["guild"],
      execute: command => {
        if (!this.entries.get("channel", false, {server: command.channel.guild.id})) {
          command.replyAutoDeny(i10010n `Sorry but there is no record of a giveaway ever existing.`);
          return true;
        }
        this.entries.set("entries", [], {server: command.channel.guild.id});
        command.replyAutoDeny(i10010n `Entries cleared`);
      },
    }, {
      triggers: ["gcount"],
      permissionCheck: this.perms.genCheckCommand("admin.giveaway.count"),
      channels: ["guild"],
      execute: command => {
        if (!this.entries.get("channel", false, {server: command.channel.guild.id})) {
          command.replyAutoDeny(i10010n `Sorry but there is no record of a giveaway ever existing.`);
          return true;
        }
        this.entries.count("entries", {server: command.channel.guild.id}).then((entries) => {
          command.replyAutoDeny(i10010n `${entries} entries so far.`);
        });
      },
    }, {
      triggers: ["gdraw"],
      permissionCheck: this.perms.genCheckCommand("admin.giveaway.draw"),
      channels: ["guild"],
      execute: command => {
        if (!this.entries.get("channel", false, {server: command.channel.guild.id})) {
          command.replyAutoDeny(i10010n `Sorry but there is no record of a giveaway ever existing.`);
          return true;
        }
        let winnersCount = 1;
        if (command.args[0]) {
          let count = parseInt(command.args[0]);
          if (count > 0) {
            winnersCount = count;
          }
        }
        this.entries.getRandom("entries", winnersCount, {server: command.channel.guild.id}).then((winners) => {
          if (winners.length > 0) {
            const winner = winners.map(winnerId => {
              const winnerUser = command.channel.guild.members.get(winnerId);
              return winnerUser ? winnerUser.mention : `<@${winnerId}>`;
            }).join(", ");
            command.replyAutoDeny(i10010n `Congrats to ${winner} for winning!`);
          } else {
            command.replyAutoDeny(i10010n `No winner could be decided, make sure at least 1 person has entered.`);
          }
        });
      },
    }, {
      triggers: ["enter"],
      permissionCheck: this.perms.genCheckCommand("giveaway.enter"),
      channels: ["guild"],
      execute: command => {
        if (this.entries.get("enable", false, {server: command.channel.guild.id})) {
          this.entries.add("entries", command.author.id, {
            server: command.channel.guild.id,
            conflict: "update",
          }).then((result) => {
            console.log(result);
            if (result.replaced === 1) {
              this._slowSender.sendMessage(command.channel, i10010n `${command.author.mention}, You have entered.`);
            } else if (result.unchanged === 1) {
              this._slowSender.sendMessage(command.channel, i10010n `${command.author.mention}, Sorry but you can only enter once.`);
            } else {
              this._slowSender.sendMessage(command.channel, i10010n `${command.author.mention}, Error processing entry.`);
            }
          });
        } else {
          this._slowSender.sendMessage(command.channel, i10010n `${command.author.mention}, Sorry but there are no giveaways open at this time.`);
        }
        return true;
      },
    }];
  }
}

module.exports = giveaways;