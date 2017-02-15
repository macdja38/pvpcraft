/**
 * Created by macdja38 on 2016-05-16.
 */
"use strict";

let Utils = require('../lib/utils');
let utils = new Utils();

let CleverBot = require('cleverbot.io');


module.exports = class cleverBot {
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

  getCommands() {
    return [];
  }

  checkMisc(msg, perms) {
    if (msg.isMentioned(this.client.user) && perms.check(msg, "cleverbot.misc")) {
      if (!this.cleverEnabled) {
        msg.reply("Bot was not configured with an api key and is therefore disabled.").catch(perms.getAutoDeny(msg));
        return true;
      }
      this.client.startTyping(msg.channel).catch(() => {
        this.client.stopTyping(msg.channel).catch(() => {
        });
      });
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
        console.log(botInstance);
        botInstance.ask(query, (err, response) => {
          console.log(err, response);
          if (err) {
            msg.reply(`Encountered error "${response}" when trying to query cleverbot`).catch(perms.getAutoDeny(msg));
            this.client.stopTyping(msg.channel).catch(() => {
            });
            this.raven.captureException(err);
            return true;
          }
          msg.reply(utils.clean(response)).then(() => {
            this.client.stopTyping(msg.channel).catch(() => {
            });
          }).catch((err) => {
            this.client.stopTyping(msg.channel).catch(() => {
            });
            return err;
          }).catch(perms.getAutoDeny(msg));
        });
      });
    }
    return false;
  }

  onCommand(msg, command, perms, l) {
    return false;
  }
};