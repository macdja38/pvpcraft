/**
 * Created by macdja38 on 2016-05-16.
 */
"use strict";

const utils = require('../lib/utils');
const i10010n = require("i10010n").init({});

let CleverBotIO = require('better-cleverbot-io');

class cleverBot {
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

  /**
   * Optional function that will be called with every message for the purpose of misc responses / other
   * @param {Message} msg
   * @param {Permissions} perms
   * @returns {boolean | Promise}
   */
  checkMisc(msg, perms) {
    if (msg.mentions.includes(this.client.user) && perms.check(msg, "cleverbot.misc")) {
      if (!this.cleverEnabled) {
        msg.channel.createMessage(i10010n() `${msg.author.mention}, Bot was not configured with an api key and is therefore disabled.`).catch(perms.getAutoDeny(msg));
        return true;
      }
      let query = msg.content.replace(this.startRegex, "").replace(this.middleRegex, "CleverBot").trim();
      if(query.length < 1) return false;
      utils.handleErisRejection(msg.channel.sendTyping());
      let bot;
      if (this.sessionMap.has(msg.channel)) {
        bot = this.sessionMap.get(msg.channel);
      } else {
        let botInstance = new CleverBotIO({user: this.cleverUser, key: this.cleverKey, nick: msg.channel.id});
        bot = botInstance.create();
        this.sessionMap.set(msg.channel, bot);
      }
      return bot.then((botInstance) => {
        return botInstance.ask(query).then((response) => {
          msg.channel.createMessage(msg.author.mention + ", " + utils.clean(response)).catch(perms.getAutoDeny(msg));
        });
      });
    }
    return false;
  }
}

module.exports = cleverBot;