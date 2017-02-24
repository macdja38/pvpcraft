/**
 * Created by macdja38 on 2016-05-04.
 */
"use strict";

let utils = require('../lib/utils');

let defaultURL = "https://bot.pvpcraft.ca/login/";

module.exports = class permissionsManager {
  constructor(e) {
    this.client = e.client;
    this.config = e.config;

    //url where permissions are exposed at.
    this.url = this.config.get("permissions", {url: defaultURL}).url
  }

  getCommands() {
    return ["pex", "perm", "setting"];
  }

  onCommand(msg, command, perms) {
    //commands that deal with permissions

    if (command.commandnos === "setting") {
      let urlRoot = this.config.get("website", {"settingsRoot": "https://bot.pvpcraft.ca"}).settingsRoot;
      msg.channel.createMessage(msg.author.mention + ", " + `${urlRoot}/bot/${this.client.user.id}/server/${msg.server.id}/ranks`);
      return true;
    }

    if (command.command === "pex" || command.commandnos === "perm") {

      //if no command is supplied supply help url
      if (command.args.length === 0) {
        msg.channel.createMessage(msg.author.mention + ", " + "You need help! visit \<https://bot.pvpcraft.ca/docs\> for more info");
        return true;
      }
      if (!msg.channel.guild) {
        msg.channel.createMessage(msg.author.mention + ", " + "Must be used from within a server");
        return true;
      }
      //command to set permissions.
      if (command.args[0] === "set") {

        //remove command from arguemnts
        command.args.splice(0, 1);

        //check if they gave us enough args, if not tell them what to give us.
        if (command.args.length < 2) {
          msg.channel.createMessage(msg.author.mention + ", " + "perms set <allow|deny|remove> <node>");
          return true;
        }
        var channel;
        var server;
        if (command.options.channel) {
          //user has specified a channel level permission
          if (/<#\d+>/.test(command.options.channel)) {
            channel = msg.channel.guild.channels.get(command.options.channel.match(/<#(\d+)>/)[1]);
          }
          else {
            channel = msg.channel.guild.channels.find(c => c.name === command.options.channel);
          }
          if (channel) {
            server = msg.channel.guild.id;
            channel = channel.id;
          }
          else {
            msg.channel.createMessage(msg.author.mention + ", " + "Could not find channel specified please either mention the channel or use it's full name");
            return true;
          }
        }
        else {
          //user has not specified channel, assume server wide
          if (!perms.checkAdminServer(msg) && this.config.get("permissions", {admins: []}).admins.indexOf(msg.author.id) < 0) {
            msg.channel.createMessage(`${msg.author.mention}, Discord permission \`Admin\` Required`);
            return true;
          }
          channel = "*";
          server = msg.channel.guild.id;
        }
        //here we find the group's or users effected.
        var target;
        if (command.options.group && !command.options.role) {
          command.options.role = command.options.group
        }
        if (command.options.user) {
          if (/<@!?\d+>/.test(command.options.user)) {
            target = msg.channel.guild.members.get(command.options.user.match(/<@!?(\d+)>/)[1]);
          }
          else {
            target = msg.channel.guild.members.find(m => m.name === command.options.user)
          }
          if (target) {
            target = "u" + target.id
          }
          else {
            msg.channel.createMessage(msg.author.mention + ", " + "Could not find user with that name, please try a mention or name, names are case sensitive");
            return true;
          }
        }
        else if (command.options.role) {
          if (/<@&\d+>/.test(command.options.role)) {
            target = msg.channel.guild.roles.get(command.options.role.match(/<@&(\d+)>/)[1]);
          }
          else {
            target = msg.channel.guild.roles.find(r => r.name === command.options.role);
          }
          if (target) {
            target = "g" + target.id
          }
          else {
            msg.channel.createMessage(msg.author.mention + ", " + "Could not find role with that name, please try a mention or name, names are case sensitive");
            return true;
          }
        }
        else {
          target = "*"
        }
        var action = command.args.shift();
        if (action === "remove") action = "remov";
        var node = server + "." + channel + "." + target + "." + command.args[0];
        msg.channel.createMessage(msg.author.mention + ", " + `${utils.clean(action)}ing node \`\`\`xl\n${node}\n\`\`\`\
${utils.clean(action)}ing permission node ${utils.clean(command.args[0])} in ${channel === "*" ? "all channels" : channel } for \
${target === "*" ? "everyone" : utils.clean(target)}`);
        let numValue = parseInt(action);
        if (!isNaN(numValue)) {
          action = numValue;
        }
        perms.set(utils.stripNull(node), action).then((result) => {
          if (!result || result === undefined) {
            msg.channel.createMessage(msg.author.mention + ", " + "Error: while saving: Database write could not be confirmed the permissions configuration," +
              " will be cached locally but may reset in the future.")
          }
        }).catch(console.error);
      }
      if (command.args[0] === "list") {
        msg.channel.createMessage(msg.author.mention + ", " + this.url.replace(/\$id/, msg.channel.guild.id));
      }
      if (command.args[0].toLowerCase() === "hardreset") {
        if (msg.author.id == msg.channel.guild.ownerID) {
          perms.set(msg.channel.guild.id, "remov");
          msg.channel.createMessage(msg.author.mention + ", " + `All permissions have been reset!`)
        } else {
          msg.channel.createMessage(msg.author.mention + ", " + `Only the server owner can use this command.`);
        }
      }
      return true;
    }
    return false;
  }
};
