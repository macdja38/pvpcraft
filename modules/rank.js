/**
 * Created by macdja38 on 2016-06-13.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

module.exports = class rank {
  constructor(e) {
    this.client = e.client;
    this.config = e.configDB;
    this.raven = e.raven;

    this.onJoin = (server, user) => {
      var rank = this.config.get("roles", false, {server: server.id});
      if (rank && rank.joinrole) {
        rank = server.roles.get("id", rank.joinrole);
        if (rank) {
          this.client.addMemberToRole(user, rank).then(() => {
            let logChannel = this.config.get("msgLog", false, {server: server.id});
            if (logChannel) {
              logChannel = server.channels.get("id", logChannel);
              if (logChannel) {
                this.client.sendMessage(logChannel, `${utils.clean(user.username)} was promoted to ${utils.clean(rank.name)}!`)
              }
            }
          }).catch(error => {
            let logChannel = this.config.get("msgLog", false, {server: server.id});
            if (logChannel) {
              logChannel = server.channels.get("id", logChannel);
              if (logChannel) {
                this.client.sendMessage(logChannel, `${error} encountered when promoting ${user} please redefine your rank and make sure the bot has enough permissions.`)
              }
            }
          })
        }
      }
    };
  }

  onDisconnect() {
    this.client.removeListener("serverNewMember", this.onJoin);
  }

  onReady() {
    this.client.on("serverNewMember", this.onJoin);
  }

  getCommands() {
    return ["rank"];
  }

  onCommand(msg, command, perms) {
    if (command.command === "rank") {
      if (command.args[0] === "add" && perms.check(msg, "admin.rank.add")) {
        let roleId;
        if (command.options.group && !command.options.role) {
          command.options.role = command.options.group;
        }
        if (command.options.role) {
          if (/<@&\d+>/.test(command.options.role)) {
            roleId = msg.channel.server.roles.get("id", command.options.role.match(/<@&(\d+)>/)[1]);
          }
          else {
            roleId = msg.channel.server.roles.get("name", command.options.role);
          }
          if (roleId) {
            roleId = roleId.id
          }
          else {
            msg.reply("Could not find role with that name, please try a mention or name, names are case sensitive");
            return true;
          }
          let roleName = command.args[1].toLowerCase();
          let oldRoles = this.config.get("roles", {}, {server: msg.server.id});
          oldRoles[roleName] = roleId;
          this.config.set("roles", oldRoles, {server: msg.server.id});
          msg.reply(":thumbsup::skin-tone-2:");
          return true;
        }
        return true;
      }
      if (command.args[0] === "remove" && perms.check(msg, "admin.rank.remove")) {
        if (!command.args[1]) {
          msg.reply(`Please supply a rank to remove using \`${command.prefix}rank remove \<rank\>\`, for a list of ranks use \`${command.prefix}rank list\``);
          return true;
        }
        let rankToJoin = command.args[1].toLowerCase();
        let oldRoles = this.config.get("roles", {}, {server: msg.server.id});
        if (oldRoles.hasOwnProperty(rankToJoin)) {
          delete oldRoles[rankToJoin];
          this.config.set("roles", oldRoles, {server: msg.server.id, conflict: "replace"});
          msg.reply(":thumbsup::skin-tone-2:");
        } else {
          msg.reply(`Role could not be found, use \`${command.prefix}rank list\` to see the current ranks.`);
        }
        return true;
      }
      if (command.args[0] === "list" && perms.check(msg, "rank.list")) {
        let roles = this.config.get("roles", {}, {server: msg.server.id});
        let coloredRolesList = "";
        for (var role in roles) {
          if (roles.hasOwnProperty(role) && role != "joinrole") {
            if (perms.check(msg, `rank.join.${role}`)) {
              coloredRolesList += `+${role}\n`;
            } else {
              coloredRolesList += `-${role}\n`;
            }
          }
        }
        if (coloredRolesList != "") {
          msg.channel.sendMessage(`Roles you can join are highlighted in green\`\`\`diff\n${coloredRolesList}\`\`\``)
        } else {
          msg.reply(`No ranks are setup to be join-able.`)
        }
        return true;
      }
      if (command.args[0] === "join" && perms.check(msg, "rank.join.use")) {
        if (!command.args[1]) {
          msg.reply(`Please supply a rank to join using \`${command.prefix}rank join \<rank\>\`, for a list of ranks use \`${command.prefix}rank list\``);
          return true;
        }
        let rankToJoin = command.args[1].toLowerCase();
        if (rankToJoin[0] == "+" || rankToJoin[0] == "-") {
          rankToJoin = rankToJoin.substring(1);
        }
        let roles = this.config.get("roles", rankToJoin, {server: msg.server.id});
        if (!roles[rankToJoin]) {
          msg.reply(`Invalid rank, for a list of ranks use \`${command.prefix}rank list\``);
          return true;
        }
        if (!perms.check(msg, `rank.join.${rankToJoin}`)) {
          msg.reply(`You do not have perms to join this rank for a list of ranks use \`${command.prefix}rank list\``);
          return true;
        }
        role = msg.server.roles.get("id", roles[rankToJoin]);
        if (role) {
          this.client.addMemberToRole(msg.author, role).then(()=> {
            let logChannel = this.config.get("msgLog", false, {server: msg.server.id});
            if (logChannel) {
              logChannel = msg.server.channels.get("id", logChannel);
              if (logChannel) {
                this.client.sendMessage(logChannel, `${utils.removeBlocks(msg.author.username)} added themselves to ${utils.removeBlocks(role.name)}!`)
              }
            }
            msg.reply(":thumbsup::skin-tone-2:");
          }).catch((error)=> {
            if (error) {
              let logChannel = this.config.get("msgLog", false, {server: msg.server.id});
              if (logChannel) {
                logChannel = msg.server.channels.get("id", logChannel);
                if (logChannel) {
                  this.client.sendMessage(logChannel, `${error} encountered when promoting ${utils.removeBlocks(msg.author.username)} try redefining your rank and making sure the bot has enough permissions.`).catch(console.error)
                }
              }
              msg.reply(`Error ${error} promoting ${utils.removeBlocks(msg.author.username)} try redefining your rank and making sure the bot has enough permissions.`)
            }
          });
        } else {
          msg.reply(`Role could not be found, have an administrator use \`${command.prefix}rank add\` to update it.`);
        }
        return true;
      }
      if (command.args[0] === "leave" && perms.check(msg, "rank.leave.use")) {
        if (!command.args[1]) {
          msg.reply(`Please supply a rank to leave using \`${command.prefix}rank leave \<rank\>\`, for a list of ranks use \`${command.prefix}rank list\``);
          return true;
        }
        let rankToLeave = command.args[1].toLowerCase();
        if (rankToLeave[0] == "+" || rankToLeave[0] == "-") {
          rankToLeave = rankToLeave.substring(1);
        }
        let roles = this.config.get("roles", rankToLeave, {server: msg.server.id});
        if (!roles[rankToLeave]) {
          msg.reply(`Invalid rank, for a list of ranks use \`${command.prefix}rank list\``);
          return true;
        }
        if (!perms.check(msg, `rank.leave.${rankToLeave}`)) {
          msg.reply(`You do not have perms to leave this rank for a list of ranks use \`${command.prefix}rank list\``);
          return true;
        }
        role = msg.server.roles.get("id", roles[rankToLeave]);
        if (role) {
          this.client.removeMemberFromRole(msg.author, role).then(() => {
            let logChannel = this.config.get("msgLog", false, {server: msg.server.id});
            if (logChannel) {
              logChannel = msg.server.channels.get("id", logChannel);
              if (logChannel) {
                this.client.sendMessage(logChannel, `${utils.removeBlocks(msg.author.username)} removed themselves from ${utils.removeBlocks(role.name)}!`)
              }
            }
            msg.reply(":thumbsup::skin-tone-2:");
          }).catch((error) => {
            this.client.sendMessage(msg.channel, `${error} demoting ${utils.removeBlocks(msg.author.username)} try redefining your rank and making sure the bot has enough permissions.`).catch(console.error)
          })
        } else {
          msg.reply(`Role could not be found, have an administrator use \`${command.prefix}rank add\` to update it.`);
          return true;
        }
        return true;
      }
    }
    return false;
  }
};
