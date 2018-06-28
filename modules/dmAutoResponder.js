/**
 * Created by macdja38 on 2017-07-02.
 */
"use strict";

class dmAutoResponder {
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
  }

  /**
   * Optional function that will be called with every message for the purpose of misc responses / other
   * @param {Message} msg
   * @returns {boolean | Promise}
   */
  checkMisc(msg) {
    if (msg.channel.guild) return false;
    if (msg.author.bot) return false;
    const lowercaseContents = msg.content.toLowerCase();
    if (lowercaseContents.includes("invite") || lowercaseContents.includes("discord.gg")) return msg.channel.createMessage(i10010n `https://invite.pvpcraft.ca`);
    if (lowercaseContents.includes("help") || lowercaseContents.includes("docs")) return msg.channel.createMessage(i10010n `https://bot.pvpcraft.ca/docs`);
    if (lowercaseContents.startsWith("/") || lowercaseContents.startsWith("!!") || lowercaseContents.startsWith("//")) return msg.channel.createMessage(i10010n `This command cannot be used in dms`);
    return false;
  }
}

module.exports = dmAutoResponder;