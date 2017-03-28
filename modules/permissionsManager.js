/**
 * Created by macdja38 on 2016-05-04.
 */
"use strict";

let utils = require('../lib/utils');

let defaultURL = "https://bot.pvpcraft.ca/login/";

class permissionsManager {
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
    this.config = e.config;

    //url where permissions are exposed at.
    this.url = this.config.get("permissions", {url: defaultURL}).url
  }

  /**
   * returns a list of commands in the module
   * @returns {string[]}
   */
  static getCommands() {
    return ["pex", "perm", "setting"];
  }

  /**
   * Called with a command, returns true or a promise if it is handling the command, returns false if it should be passed on.
   * @param {Message} msg
   * @param {Command} command
   * @param {Permissions} perms
   * @returns {boolean | Promise}
   */
  onCommand(msg, command, perms) {
    //commands that deal with permissions

    if (command.commandnos === "setting") {
      let urlRoot = this.config.get("website", {"settingsRoot": "https://bot.pvpcraft.ca"}).settingsRoot;
      command.reply(`${urlRoot}/bot/${this.client.user.id}/server/${msg.channel.guild.id}/ranks`);
      return true;
    }

    if (command.command === "pex" || command.commandnos === "perm") {

      //if no command is supplied supply help url
      if (command.args.length === 0) {
        command.reply("You need help! visit \<https://bot.pvpcraft.ca/docs\> for more info");
        return true;
      }
      if (!msg.channel.guild) {
        command.reply("Must be used from within a server");
        return true;
      }
      //command to set permissions.
      if (command.args[0] === "set") {

        //remove command from arguemnts
        command.args.splice(0, 1);

        //check if they gave us enough args, if not tell them what to give us.
        if (command.args.length < 2) {
          command.reply("perms set <allow|deny|remove> <node>");
          return true;
        }
        let channel;
        let server;
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
            command.reply("Could not find channel specified please either mention the channel or use it's full name");
            return true;
          }
        }
        else {
          //user has not specified channel, assume server wide
          channel = "*";
          server = msg.channel.guild.id;
        }
        if (!perms.checkAdminServer(msg) && this.config.get("permissions", {admins: []}).admins.indexOf(msg.author.id) < 0) {
          command.reply("Discord permission \`Admin\` Required");
          return true;
        }
        //here we find the group's or users effected.
        let target;
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
            command.reply("Could not find user with that name, please try a mention or name, names are case sensitive");
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
            command.reply("Could not find role with that name, please try a mention or name, names are case sensitive");
            return true;
          }
        }
        else {
          target = "*"
        }
        let action = command.args.shift();
        if (action === "remove") action = "remov";
        const node = server + "." + channel + "." + target + "." + command.args[0];
        command.reply(`${utils.clean(action)}ing node \`\`\`xl\n${node}\n\`\`\`\
${utils.clean(action)}ing permission node ${utils.clean(command.args[0])} in ${channel === "*" ? "all channels" : channel } for \
${target === "*" ? "everyone" : utils.clean(target)}`);
        let numValue = parseInt(action);
        if (!isNaN(numValue)) {
          action = numValue;
        }
        perms.set(utils.stripNull(node), action).then((result) => {
          if (!result || result === undefined) {
            command.reply("Error: while saving: Database write could not be confirmed the permissions configuration," +
              " will be cached locally but may reset in the future.")
          }
        }).catch(console.error);
      }
      if (command.args[0] === "list") {
        command.reply(this.url.replace(/\$id/, msg.channel.guild.id));
      }
      if (command.args[0].toLowerCase() === "hardreset") {
        if (msg.author.id === msg.channel.guild.ownerID) {
          perms.set(msg.channel.guild.id, "remov");
          command.reply(`All permissions have been reset!`)
        } else {
          command.reply(`Only the server owner can use this command.`);
        }
      }
      return true;
    }
    return false;
  }
}

module.exports = permissionsManager;
