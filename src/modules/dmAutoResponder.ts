/**
 * Created by macdja38 on 2017-07-02.
 */
"use strict";

import { Module, ModuleConstructor } from "../types/moduleDefinition";
import { ModuleOptions } from "../types/lib";
import { translateTypeCreator } from "../types/translate";
import PvPCraft from "../PvPCraft";
import Eris, { TextChannel } from "eris";

const dmAutoResponder: ModuleConstructor = class dmAutoResponder implements Module {
  private i10010n: translateTypeCreator;
  private pvpcraft: PvPCraft;
  private client: Eris.Client;

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
    this.pvpcraft = e.pvpcraft;
    this.i10010n = e.i10010n;
  }

  /**
   * Optional function that will be called with every message for the purpose of misc responses / other
   * @param {Message} msg
   * @returns {boolean | Promise}
   */
  checkMisc(msg: Eris.Message<TextChannel> | Eris.Message) {
    if ("guild" in msg.channel) return false;
    if (msg.author.bot) return false;
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage(msg.channel.id));
    const lowercaseContents = msg.content.toLowerCase();
    if (lowercaseContents.includes("invite") || lowercaseContents.includes("discord.gg")) return msg.channel.createMessage(translate`https://invite.pvpcraft.ca`);
    if (lowercaseContents.includes("help") || lowercaseContents.includes("docs")) return msg.channel.createMessage(translate`https://bot.pvpcraft.ca/docs`);
    if (lowercaseContents.startsWith("/") || lowercaseContents.startsWith("!!") || lowercaseContents.startsWith("//")) return msg.channel.createMessage(translate`This command cannot be used in dms`);
    return false;
  }

  getCommands() {
    return []
  }
}

module.exports = dmAutoResponder;
