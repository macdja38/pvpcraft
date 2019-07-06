/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

const utils = require('../lib/utils');
const EE = require("eris-errors");

class invites {
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
   * @param {PvPCraft} e.pvpcraft PvPCraft instance
   * @param {Function} e.i10010n internationalization function
   */
  constructor(e) {
    // save the client as this.client for later use.
    this.client = e.client;
    this.pvpcraft = e.pvpcraft;
    // save the bug reporting thing raven for later use.
    this.raven = e.raven;
    this.perms = e.perms;
    this.config = e.configDB;
    this.inviteCache = {};
    this.clearInviteCache = this.clearInviteCache.bind(this);
    this.i10010n = e.i10010n;
  }

  onReady() {
    this.clearCacheInterval = setInterval(this.clearInviteCache, 60000);
    this.inviteCache = {};
  }

  onDisconnect() {
    if (this.clearCacheInterval) {
      clearInterval(this.clearCacheInterval)
    }
  }

  clearInviteCache() {
    this.inviteCache = {};
  }

  getPossiblyCachedInviteData(guild) {
    if (this.inviteCache.hasOwnProperty(guild.id)) {
      Promise.resolve(this.inviteCache[guild.id]);
    }
    return guild.getInvites();
  }

  addRoleIfNotAdded(member, role) {
    if (member.roles.includes(role.id)) {
      return role;
    }
    return member.addRole(role.id, "achieved necessary invites").then(() => role);
  }

  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands() {
    return [{
      triggers: ["checkinvite", "checkinvites"],
      permissionCheck: this.perms.genCheckCommand("invites.check"),
      channels: ["guild"],
      description: "Adds you to join-able roles formatted as name-number (eg dj-3) if you have invited more users than the number (only invites that still exist count, advise users not to use temporary invites). To add a role to the list of roles the user can join with this command see the `rank add` command. ",
      execute: command => {
        return this.getPossiblyCachedInviteData(command.channel.guild).then(invites => {
          let inviteCount = invites.filter(invite => invite.inviter && invite.inviter.id === command.member.id).reduce((acc, invite) => acc + invite.uses || 0, 0);

          let roles = this.config.get("roles", {}, {server: command.channel.guild.id});
          let coloredRolesList = "";
          for (let role in roles) {
            if (roles.hasOwnProperty(role) && role != "joinrole") {
              if (this.perms.check(command, `rank.join.${role}`)) {
                coloredRolesList += `+${role}\n`;
              } else {
                coloredRolesList += `-${role}\n`;
              }
            }
          }

          const addRoleIfNotAddedWithMember = this.addRoleIfNotAdded.bind(this, command.member);

          const obtainableRoles = Object.entries(roles)
            .filter(([name, id]) => /-\d+/.test(name))
            .map(([name, id]) => ({name, id, invites: parseInt(name.match(/-(\d+)/)[1])}));

          const rolesUserShouldHave = obtainableRoles.filter(r => r.invites <= inviteCount).sort((a, b) => b.invites - a.invites);

          const rolesUserShouldNotHave = obtainableRoles.filter(r => r.invites > inviteCount).sort((a, b) => a.invites - b.invites);

          const addedRolesPromises = rolesUserShouldHave
            .map(addRoleIfNotAddedWithMember);

          const highestRole = rolesUserShouldHave.length > 0 ? rolesUserShouldHave[0] : false;

          const nextRole = rolesUserShouldNotHave.length > 0 ? rolesUserShouldNotHave[0] : false;

          return Promise.all(addedRolesPromises)
            .then(addedRoles => command.replyAutoDeny(command.translate `You have ${inviteCount} invite${inviteCount !== 1 ? "s" : ""}` +
              (highestRole ? command.translate `\nCongratulations on reaching ${utils.clean(highestRole.name)}` : "") +
              (nextRole ? command.translate `\n${nextRole.invites - inviteCount} invite${nextRole.invites - inviteCount !== 1 ? "s" : ""} left to become ${utils.clean(nextRole.name)}`: "")));
        }).catch(error => {
          if (error.code == EE.DISCORD_RESPONSE_MISSING_PERMISSIONS) {
            command.replyAutoDeny(command.translate `Bot does not have sufficient permissions to check guild invites.`)
          }
          throw error;
        });
      },
    }];
  }

  /**
   * Optional function that will be called with every message for the purpose of misc responses / other
   * @param {Message} msg
   * @returns {boolean | Promise}
   */
  checkMisc(msg) {
    if (!msg.channel.guild) return false;
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage(msg.channel.id));
    let deleteChannels = this.config.get("deleteNonCommands", [], {server: msg.channel.guild.id});
    if (deleteChannels.includes(msg.channel.id)) {
      msg.channel.createMessage(translate `<@${msg.member.id}> Sorry but this channel is restricted to commands only. What you entered was not seen as a valid command or you do not have permission to use it. If this is an error please contact a moderator.`).then(botMsg => {
        setTimeout(() => botMsg.delete(), 10000);
      });
      return msg.delete(translate `used a command in a non command channel`);
    }
    return false;
  }
}

module.exports = invites;