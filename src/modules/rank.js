/**
 * Created by macdja38 on 2016-06-13.
 */
"use strict";

const utils = require('../lib/utils');

class rank {
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
  constructor(e) {
    this.client = e.client;
    this.pvpClient = e.pvpClient;
    this.config = e.configDB;
    this.raven = e.raven;
    this.perms = e.perms;
    this.i10010n = e.i10010n;

    this.onJoin = (guild, member) => {
      let roles = this.config.get("roles", false, {server: guild.id});
      if (roles.hasOwnProperty("joinrole")) {
        utils.handleErisRejection(guild.addMemberRole(member.id, roles.joinrole, "Automated joinrole, use `/rank remove joinrole` to disable"));
      }
    };

    this.possiblyDelete = this.possiblyDelete.bind(this);
  }

  onDisconnect() {
    this.client.removeListener("guildMemberAdd", this.onJoin);
  }

  onReady() {
    this.client.on("guildMemberAdd", this.onJoin);
  }

  /**
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent() {
    return {
      name: "Role commands",
      description: "Create joinable roles, or assign a role to users when they join",
      key: "role",
      permNode: "role",
      commands: this.getCommands(),
    };
  }

  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands() {
    return [{
      triggers: ["role", "rank"],
      permissionCheck: () => true,
      channels: ["guild"],
      execute: command => {
        command.replyAutoDeny(command.translate `Usage ${command.prefix}${command.command} <add|remove|list|join|leave>`)
      },
      subCommands: [
        {
          triggers: ["add"],
          permissionCheck: this.perms.genCheckCommand("admin.rank.add"),
          channels: ["guild"],
          execute: command => {
            if (command.args.length < 1 || (!command.options.group && !command.options.role)) {
              command.createMessage(command.translate `Usage \`${utils.clean(command.prefix)}rank add <simpleName> --role <role>\``);
              return true;
            }
            let roleId;
            if (command.options.group && !command.options.role) {
              command.options.role = command.options.group;
            }
            if (command.options.role) {
              if (/<@&\d+>/.test(command.options.role)) {
                roleId = command.channel.guild.roles.get(command.options.role.match(/<@&(\d+)>/)[1]);
              }
              else {
                roleId = command.channel.guild.roles.find(r => r.name === command.options.role);
              }
              if (roleId) {
                roleId = roleId.id
              }
              else {
                command.replyAutoDeny(command.translate `Could not find role with that name, please try a mention or name, names are case sensitive`);
                return true;
              }
              let roleName = command.args[0].toLowerCase();
              let oldRoles = this.config.get("roles", {}, {server: command.channel.guild.id});
              oldRoles[roleName] = roleId;
              this.config.set("roles", oldRoles, {server: command.channel.guild.id});
              command.replyAutoDeny(command.translate `Role added to list of join-able roles`);
              return true;
            }
            return true;
          }
        },
        {
          triggers: ["remove"],
          permissionCheck: this.perms.genCheckCommand("admin.rank.remove"),
          channels: ["guild"],
          execute: command => {
            if (!command.args[0]) {
              command.replyAutoDeny(command.translate `Please supply a rank to remove using \`${command.prefix}rank remove \<rank\>\`, for a list of ranks use \`${command.prefix}rank list\``);
              return true;
            }
            let rankToJoin = command.args[0].toLowerCase();
            let oldRoles = this.config.get("roles", {}, {server: command.channel.guild.id});
            if (oldRoles.hasOwnProperty(rankToJoin)) {
              delete oldRoles[rankToJoin];
              this.config.set("roles", oldRoles, {server: command.channel.guild.id, conflict: "replace"});
              command.replyAutoDeny(command.translate `:thumbsup::skin-tone-2:`);
            } else {
              command.replyAutoDeny(command.translate `Role could not be found, use \`${command.prefix}rank list\` to see the current ranks.`);
            }
            return true;
          }
        },
        {
          triggers: ["list"],
          permissionCheck: this.perms.genCheckCommand("rank.list"),
          channels: ["guild"],
          execute: command => {
            let roles = this.config.get("roles", {}, {server: command.channel.guild.id});
            let coloredRolesList = "";
            for (let role in roles) {
              if (roles.hasOwnProperty(role) && role !== "joinrole") {
                if (this.perms.check(command, `rank.join.${role}`)) {
                  coloredRolesList += `+${role}\n`;
                } else {
                  coloredRolesList += `-${role}\n`;
                }
              }
            }
            if (coloredRolesList !== "") {
              command.createMessageAutoDeny(command.translate `Roles you can join are highlighted in green\`\`\`diff\n${coloredRolesList}\`\`\``)
                .then(this.possiblyDelete(command.msg));
            } else {
              command.replyAutoDeny(command.translate `No ranks are setup to be join-able.`)
                .then(this.possiblyDelete(command.msg));
            }
            return true;
          }
        },
        {
          triggers: ["join"],
          permissionCheck: this.perms.genCheckCommand("rank.join.use"),
          channels: ["guild"],
          execute: command => {
            if (!command.args[0]) {
              command.replyAutoDeny(command.translate `Please supply a rank to join using \`${command.prefix}rank join \<rank\>\`, for a list of ranks use \`${command.prefix}rank list\``)
                .then(this.possiblyDelete(command.msg));
              return true;
            }
            let rankToJoin = command.args[0].toLowerCase();
            if (rankToJoin[0] === "+" || rankToJoin[0] === "-") {
              rankToJoin = rankToJoin.substring(1);
            }
            let roles = this.config.get("roles", rankToJoin, {server: command.channel.guild.id});
            if (!roles[rankToJoin]) {
              command.replyAutoDeny(command.translate `Invalid rank, for a list of ranks use \`${command.prefix}rank list\``)
                .then(this.possiblyDelete(command.msg));
              return true;
            }
            if (!this.perms.check(command, `rank.join.${rankToJoin}`)) {
              command.replyAutoDeny(command.translate `You do not have perms to join this rank for a list of ranks use \`${command.prefix}rank list\``)
                .then(this.possiblyDelete(command.msg));
              return true;
            }
            let role = command.channel.guild.roles.get(roles[rankToJoin]);
            if (role) {
              command.channel.guild.addMemberRole(command.author.id, role.id).then(() => {
                command.replyAutoDeny(command.translate `:thumbsup::skin-tone-2:`)
                  .then(this.possiblyDelete(command.msg));
              }).catch((error) => {
                if (error) {
                  command.replyAutoDeny(command.translate `Error ${error} promoting ${utils.removeBlocks(command.author.username)} try making sure the bot's highest role is above the role you want it to add and that the bot has Manage Permissions or Admin.`)
                }
              });
            } else {
              command.replyAutoDeny(command.translate `Role could not be found, have an administrator use \`${command.prefix}rank add\` to update it.`);
            }
            return true;
          }
        },
        {
          triggers: ["leave"],
          permissionCheck: this.perms.genCheckCommand("rank.leave.use"),
          channels: ["guild"],
          execute: command => {
            if (!command.args[0]) {
              command.replyAutoDeny(command.translate `Please supply a rank to leave using \`${command.prefix}rank leave \<rank\>\`, for a list of ranks use \`${command.prefix}rank list\``)
                .then(this.possiblyDelete(command.msg));
              return true;
            }
            let rankToLeave = command.args[0].toLowerCase();
            if (rankToLeave[0] == "+" || rankToLeave[0] == "-") {
              rankToLeave = rankToLeave.substring(1);
            }
            let roles = this.config.get("roles", rankToLeave, {server: command.channel.guild.id});
            if (!roles[rankToLeave]) {
              command.replyAutoDeny(command.translate `Invalid rank, for a list of ranks use \`${command.prefix}rank list\``)
                .then(this.possiblyDelete(command.msg));
              return true;
            }
            if (!this.perms.check(command, `rank.leave.${rankToLeave}`)) {
              command.replyAutoDeny(command.translate `You do not have perms to leave this rank for a list of ranks use \`${command.prefix}rank list\``)
                .then(this.possiblyDelete(command.msg));
              return true;
            }
            let role = command.channel.guild.roles.get(roles[rankToLeave]);
            if (role) {
              command.channel.guild.removeMemberRole(command.author.id, role.id).then(() => {
                command.replyAutoDeny(command.translate `:thumbsup::skin-tone-2:`)
                  .then(this.possiblyDelete(command.msg));
              }).catch((error) => {
                command.createMessageAutoDeny(command.translate `${error} demoting ${utils.removeBlocks(command.author.username)} try redefining your rank and making sure the bot has enough permissions.`).catch(console.error)
              })
            } else {
              command.replyAutoDeny(command.translate `Role could not be found, have an administrator use \`${command.prefix}rank add\` to update it.`);
              return true;
            }
            return true;
          }
        }
      ],
    }];
  }

  possiblyDelete(triggerMessage) {
    return (msg) => {
      if (msg == null) return;
      let serverId = msg.channel.guild.id;
      let deleteAfter = this.pvpClient.get(`${serverId}.ranks.deleteAfter.value`, {fallBack: false});
      if (deleteAfter) {
        let deleteDelay = this.pvpClient.get(`${serverId}.ranks.deleteDelay.value`, { fallBack: 5 });
        setTimeout(() => {
          msg.delete();
          triggerMessage.delete();
        }, deleteDelay * 1000);
      }
    }
  }
}

module.exports = rank;
