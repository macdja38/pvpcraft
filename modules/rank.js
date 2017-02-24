/**
 * Created by macdja38 on 2016-06-13.
 */
"use strict";

let utils = require('../lib/utils');

module.exports = class rank {
  constructor(e) {
    this.client = e.client;
    this.pvpClient = e.pvpClient;
    this.config = e.configDB;
    this.raven = e.raven;

    this.onJoin = (server, user) => {
      let rank = this.config.get("roles", false, {server: server.id});
      server.addMemberRole(user.id, rank);
    };

    this.possiblyDelete = this.possiblyDelete.bind(this);
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

  possiblyDelete(triggerMessage) {
    return (msg) => {
      let serverId = msg.channel.guild.id;
      let deleteAfter = this.pvpClient.get(`${serverId}.ranks.deleteAfter.value`, {fallBack: false});
      console.log("deleteAfter", deleteAfter);
      let deleteDelay = this.pvpClient.get(`${serverId}.ranks.deleteDelay.value`, {fallBack: 5});
      if (deleteAfter) {
        setTimeout(() => {
          msg.delete();
          triggerMessage.delete();
        }, deleteDelay * 1000);
      }
    }
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
            roleId = msg.channel.guild.roles.get(command.options.role.match(/<@&(\d+)>/)[1]);
          }
          else {
            roleId = msg.channel.guild.roles.get("name", command.options.role);
          }
          if (roleId) {
            roleId = roleId.id
          }
          else {
            msg.channel.createMessage(msg.author.mention + ", Could not find role with that name, please try a mention or name, names are case sensitive");
            return true;
          }
          let roleName = command.args[1].toLowerCase();
          let oldRoles = this.config.get("roles", {}, {server: msg.channel.guild.id});
          oldRoles[roleName] = roleId;
          this.config.set("roles", oldRoles, {server: msg.channel.guild.id});
          msg.channel.createMessage(`${msg.author.mention}, Role added to list of join-able roles`);
          return true;
        }
        return true;
      }


      if (command.args[0] === "remove" && perms.check(msg, "admin.rank.remove")) {
        if (!command.args[1]) {
          msg.channel.createMessage(`${msg.author.mention}, Please supply a rank to remove using \`${command.prefix}rank remove \<rank\>\`, for a list of ranks use \`${command.prefix}rank list\``);
          return true;
        }
        let rankToJoin = command.args[1].toLowerCase();
        let oldRoles = this.config.get("roles", {}, {server: msg.channel.guild.id});
        if (oldRoles.hasOwnProperty(rankToJoin)) {
          delete oldRoles[rankToJoin];
          this.config.set("roles", oldRoles, {server: msg.channel.guild.id, conflict: "replace"});
          msg.channel.createMessage(msg.author.mention + ", " + ":thumbsup::skin-tone-2:");
        } else {
          msg.channel.createMessage(msg.author.mention + ", " + `Role could not be found, use \`${command.prefix}rank list\` to see the current ranks.`);
        }
        return true;
      }


      if (command.args[0] === "list" && perms.check(msg, "rank.list")) {
        let roles = this.config.get("roles", {}, {server: msg.channel.guild.id});
        let coloredRolesList = "";
        for (let role in roles) {
          if (roles.hasOwnProperty(role) && role != "joinrole") {
            if (perms.check(msg, `rank.join.${role}`)) {
              coloredRolesList += `+${role}\n`;
            } else {
              coloredRolesList += `-${role}\n`;
            }
          }
        }
        if (coloredRolesList != "") {
          msg.channel.createMessage(`Roles you can join are highlighted in green\`\`\`diff\n${coloredRolesList}\`\`\``)
            .then(this.possiblyDelete(msg));
        } else {
          msg.channel.createMessage(msg.author.mention + ", " + `No ranks are setup to be join-able.`)
            .then(this.possiblyDelete(msg));
        }
        return true;
      }


      if (command.args[0] === "join" && perms.check(msg, "rank.join.use")) {
        if (!command.args[1]) {
          msg.channel.createMessage(`${msg.author.mention}, Please supply a rank to join using \`${command.prefix}rank join \<rank\>\`, for a list of ranks use \`${command.prefix}rank list\``)
            .then(this.possiblyDelete(msg));
          return true;
        }
        let rankToJoin = command.args[1].toLowerCase();
        if (rankToJoin[0] == "+" || rankToJoin[0] == "-") {
          rankToJoin = rankToJoin.substring(1);
        }
        let roles = this.config.get("roles", rankToJoin, {server: msg.channel.guild.id});
        if (!roles[rankToJoin]) {
          msg.channel.createMessage(msg.author.mention + ", " + `Invalid rank, for a list of ranks use \`${command.prefix}rank list\``)
            .then(this.possiblyDelete(msg));
          return true;
        }
        if (!perms.check(msg, `rank.join.${rankToJoin}`)) {
          msg.channel.createMessage(msg.author.mention + ", " + `You do not have perms to join this rank for a list of ranks use \`${command.prefix}rank list\``)
            .then(this.possiblyDelete(msg));
          return true;
        }
        let role = msg.channel.guild.roles.get(roles[rankToJoin]);
        if (role) {
          msg.channel.guild.addMemberRole(msg.author.id, role.id).then(() => {
            msg.channel.createMessage(msg.author.mention + ", :thumbsup::skin-tone-2:")
              .then(this.possiblyDelete(msg));
          }).catch((error) => {
            if (error) {
              msg.channel.createMessage(`${msg.author.mention}, Error ${error} promoting ${utils.removeBlocks(msg.author.username)} try redefining your rank and making sure the bot has enough permissions.`)
            }
          });
        } else {
          msg.channel.createMessage(`${msg.author.mention}, Role could not be found, have an administrator use \`${command.prefix}rank add\` to update it.`);
        }
        return true;
      }


      if (command.args[0] === "leave" && perms.check(msg, "rank.leave.use")) {
        if (!command.args[1]) {
          msg.channel.createMessage(`${msg.author.mention}, Please supply a rank to leave using \`${command.prefix}rank leave \<rank\>\`, for a list of ranks use \`${command.prefix}rank list\``)
            .then(this.possiblyDelete(msg));
          return true;
        }
        let rankToLeave = command.args[1].toLowerCase();
        if (rankToLeave[0] == "+" || rankToLeave[0] == "-") {
          rankToLeave = rankToLeave.substring(1);
        }
        let roles = this.config.get("roles", rankToLeave, {server: msg.channel.guild.id});
        if (!roles[rankToLeave]) {
          msg.channel.createMessage(msg.author.mention + ", " + `Invalid rank, for a list of ranks use \`${command.prefix}rank list\``)
            .then(this.possiblyDelete(msg));
          return true;
        }
        if (!perms.check(msg, `rank.leave.${rankToLeave}`)) {
          msg.channel.createMessage(msg.author.mention + ", " + `You do not have perms to leave this rank for a list of ranks use \`${command.prefix}rank list\``)
            .then(this.possiblyDelete(msg));
          return true;
        }
        let role = msg.channel.guild.roles.get(roles[rankToLeave]);
        if (role) {
          msg.channel.guild.removeMemberRole(msg.author.id, role.id).then(() => {
            msg.channel.createMessage(msg.author.mention + ", " + ":thumbsup::skin-tone-2:")
              .then(this.possiblyDelete(msg));
          }).catch((error) => {
            this.client.createMessage(msg.channel.id, `${error} demoting ${utils.removeBlocks(msg.author.username)} try redefining your rank and making sure the bot has enough permissions.`).catch(console.error)
          })
        } else {
          msg.channel.createMessage(msg.author.mention + ", " + `Role could not be found, have an administrator use \`${command.prefix}rank add\` to update it.`);
          return true;
        }
        return true;
      }

    }
    return false;
  }
};
