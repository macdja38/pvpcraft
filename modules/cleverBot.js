/**
 * Created by macdja38 on 2016-05-16.
 */
"use strict";

let utils = require('../lib/utils');

let CleverBot = require('cleverbot.io');

class cleverBot {
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
    this.client = e.client;
    this.raven = e.raven;
    this.config = e.config;
    this.cleverUser = e.auth.get("cleverbotUser");
    this.cleverKey = e.auth.get("cleverbotKey");
    this.cleverEnabled = (this.cleverKey !== null && this.cleverUser !== "") && (this.cleverKey !== null && this.cleverKey !== "");
    if (this.cleverEnabled) {
      this.middleRegex = new RegExp(`<@(?:!)?${e.client.user.id}>`, 'g');
      this.startRegex = new RegExp(`^<@(?:!)?${e.client.user.id}>(?:,)?(?: )?`);
      this.sessionMap = new WeakMap();
    }
  }

  static getCommands() {
    return [];
  }

  /**
   * Optional function that will be called with every message for the purpose of misc responses / other
   * @param {Message} msg
   * @param {Permissions} perms
   * @returns {boolean | Promise}
   */
  checkMisc(msg, perms) {
    if (msg.mentions.includes(this.client.user) && perms.check(msg, "cleverbot.misc")) {
      if (!this.cleverEnabled) {
        msg.channel.createMessage(msg.author.mention + ", " + "Bot was not configured with an api key and is therefore disabled.").catch(perms.getAutoDeny(msg));
        return true;
      }
      msg.channel.sendTyping();
      let query = msg.content.replace(this.startRegex, "").replace(this.middleRegex, "CleverBot");
      console.log(query);
      let bot;
      if (this.sessionMap.has(msg.channel)) {
        bot = this.sessionMap.get(msg.channel);
      } else {
        let botInstance = new CleverBot(this.cleverUser, this.cleverKey);
        bot = new Promise((resolve, reject) => {
          botInstance.create((err, session) => {
            if (err) {
              reject(err);
            } else {
              botInstance.setNick(session);
              resolve(botInstance);
            }
          });
        });
        this.sessionMap.set(msg.channel, bot);
      }
      return bot.then((botInstance) => {
        botInstance.ask(query, (err, response) => {
          console.log(err, response);
          if (err) {
            msg.channel.createMessage(msg.author.mention + ", " + `Encountered error "${response}" when trying to query cleverbot`).catch(perms.getAutoDeny(msg));
            this.raven.captureException(err);
            return true;
          }
          msg.channel.createMessage(msg.author.mention + ", " + utils.clean(response)).catch(perms.getAutoDeny(msg));
        });
      });
    }
    return false;
  }

  /**
   * Called with a command, returns true or a promise if it is handling the command, returns false if it should be passed on.
   * @param {Message} msg
   * @param {Command} command
   * @param {Permissions} perms
   * @returns {boolean | Promise}
   */
  onCommand(msg, command, perms) {
    return false;
  }
}

module.exports = cleverBot;