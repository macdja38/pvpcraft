/**
 * Created by macdja38 on 2016-05-04.
 */
"use strict";

import utils from "../lib/utils";

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
   * @param {Function} e.i10010n internationalization function
   */
  constructor(e) {
    this.client = e.client;
    this.config = e.config;
    this.perms = e.perms;
    this.i10010n = e.i10010n;

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
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent() {
    return {
      name: "Permissions Management",
      description: "The commands to manage pvpcraft permissions via bot commands, see the documentation for usage.",
      key: "perms",
      permNode: "",
      commands: this.getCommands(),
    };
  }

  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands() {
    return [{
      triggers: ["setting", "settings"],
      permissionCheck: () => true,
      channels: ["guild"],
      execute: command => {
        let urlRoot = this.config.get("website", {"settingsRoot": "https://bot.pvpcraft.ca"}).settingsRoot;
        command.reply(`${urlRoot}/bot/${this.client.user.id}/server/${command.channel.guild.id}/ranks`);
        return true;
      },
    }, {
      triggers: ["perms", "perm", "pex"],
      permissionCheck: () => true,
      channels: ["guild"],
      // eslint-disable-next-line complexity
      execute: command => {
        //if no command is supplied supply help url
        if (command.args.length === 0) {
          command.reply(command.translate `You need help! visit <https://bot.pvpcraft.ca/docs> for more info`);
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
              channel = command.channel.guild.channels.get(command.options.channel.match(/<#(\d+)>/)[1]);
            }
            else {
              channel = command.channel.guild.channels.find(c => c.name === command.options.channel);
            }
            if (channel) {
              server = command.channel.guild.id;
              channel = channel.id;
            }
            else {
              command.reply(command.translate `Could not find channel specified please either mention the channel or use it's full name`);
              return true;
            }
          }
          else {
            //user has not specified channel, assume server wide
            channel = "*";
            server = command.channel.guild.id;
          }
          if (!this.perms.checkAdminServer(command) && this.config.get("permissions", {admins: []}).admins.indexOf(command.author.id) < 0) {
            command.reply(command.translate `Discord permission \`Admin\` Required`);
            return true;
          }
          //here we find the group's or users effected.
          let target;
          if (command.options.group && !command.options.role) {
            command.options.role = command.options.group
          }
          if (command.options.user) {
            if (/<@!?\d+>/.test(command.options.user)) {
              target = command.channel.guild.members.get(command.options.user.match(/<@!?(\d+)>/)[1]);
            }
            else {
              target = command.channel.guild.members.find(m => m.name === command.options.user)
            }
            if (target) {
              target = "u" + target.id
            }
            else {
              command.reply(command.translate `Could not find user with that name, please try a mention or name, names are case sensitive`);
              return true;
            }
          }
          else if (command.options.role) {
            if (/<@&\d+>/.test(command.options.role)) {
              target = command.channel.guild.roles.get(command.options.role.match(/<@&(\d+)>/)[1]);
            }
            else {
              target = command.channel.guild.roles.find(r => r.name === command.options.role);
            }
            if (target) {
              target = "g" + target.id
            }
            else {
              command.reply(command.translate `Could not find role with that name, please try a mention or name, names are case sensitive`);
              return true;
            }
          }
          else {
            target = "*"
          }
          let action = command.args.shift();
          if (action === "remove") action = "remov";
          const node = server + "." + channel + "." + target + "." + command.args[0];
          command.reply(command.translate `${utils.clean(action)}ing node \`\`\`xl\n${node}\n\`\`\`\
${utils.clean(action)}ing permission node ${utils.clean(command.args[0])} in ${channel === "*" ? command.translate `all channels` : channel } for \
${target === "*" ? command.translate `everyone` : utils.clean(target)}`);
          let numValue = parseInt(action);
          if (!isNaN(numValue)) {
            action = numValue;
          }
          this.perms.set(utils.stripNull(node), action).then((result) => {
            if (!result || result === undefined) {
              command.reply(command.translate `Error: while saving: Database write could not be confirmed the permissions configuration, will be cached locally but may reset in the future.`)
            }
          }).catch(console.error);
        }
        if (command.args[0] === "list") {
          command.reply(this.url.replace(/\$id/, command.channel.guild.id));
        }
        if (command.args[0].toLowerCase() === "hardreset") {
          if (command.author.id === command.channel.guild.ownerID) {
            this.perms.set(command.channel.guild.id, "remov");
            command.reply(command.translate `All permissions have been reset!`)
          } else {
            command.reply(command.translate `Only the server owner can use this command.`);
          }
        }
        return true;
      },
    }];
  }
}

module.exports = permissionsManager;
