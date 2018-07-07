/**
 * Created by macdja38 on 2017-04-20.
 */
"use strict";

const utils = require('../lib/utils');
const i10010n = require("i10010n").init({});

let inviteRegex = /discord(?:(?:.{0,7})(?:gg|me)(?:\/)(?:\w{5}|\w{7})(?:\s|\n)|\.me(?:\/\w*)|app\.com\/invite)/i;
let inviteRegex2 = /(?:discord(?:(?:\.|.?dot.?)(?:me|gg)|app(?:\.|.?dot.?)com\/invite)\/([\w]{10,16}|[abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789]{4,8}))/g;
let inviteRegex3 = /(?:^|\s)discord(?:app\.com\/invite|\.gg)\/(?:[0-9a-z\-]+)(?:$|\s)/i;

class template {
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
    this.pvpClient = e.pvpClient;
  }

  /**
   * Optional function that will be called with every message for the purpose of misc responses / other
   * @param {Message} msg
   * @param {Permissions} perms
   * @returns {boolean | Promise}
   */
  checkMisc(msg, perms) {
    if (!msg.channel.guild) return false;
    if (!this.pvpClient.get(`${msg.channel.guild.id}.automod.invites.autodelete`, {fallBack: false})) return false;
    if (perms.check(msg, "moderation.whitelist.invites") && (inviteRegex.test(msg.content) || inviteRegex2.test(msg.content))) {
      msg.author.getDMChannel().then(channel =>
        channel.createMessage(i10010n() `Hello, I've removed an invite link you posted in channel ${
          msg.channel.mention} on ${msg.channel.guild.name} as Invite filtering is enabled and you do not have the whitelist permission, please contact the moderation team if you believe this is in error.`)
      );
      utils.handleErisRejection(msg.delete());
      return true;
    }
    return false;
  }
}

module.exports = template;