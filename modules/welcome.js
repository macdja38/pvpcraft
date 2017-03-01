/**
 * Created by macdja38 on 2016-05-23.
 */
"use strict";

let utils = require('../lib/utils');

class welcome {
  /**
   * Instantiates the module
   * @constructor
   * @param {Object} e
   * @param {Client} e.client Eris client
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
    this.config = e.configDB;
    this.raven = e.raven;

    this.onJoin = (server, user) => {
      //TODO: once config loader v2 is done make this configurable.
      if (server.id == "77176186148499456") {
        this.client.createMessage("171382498020950016",
          `Hop to it @here, ${utils.clean(user.username)} Just joined ${utils.clean(server.name)} ` +
          `announce it in <#77176186148499456>\n\`\`\`\nWelcome **${utils.clean(user.username)}**!\n\`\`\``
        );
      }
      if (server.id == "191052428228034560") {
        this.client.createMessage("215030357727117313",
          `Hop to it @here, <@${user.id}> baru saja bergabung di ${utils.clean(server.name)}, umumkan di  <#191052428228034560>
\`\`\`Selamat datang <@${user.id}> di **Warframe Indonesia Community**!\`\`\``
        );
      }
      let welcomeInfo = this.config.get("welcome", {}, {server: server.id});
      let pm = welcomeInfo.private;
      if (welcomeInfo.message) {
        let welcomeChannel;
        if (pm !== true) {
          if (welcomeInfo.channel) {
            welcomeChannel = server.channels.get(welcomeInfo.channel);
          }
          if (!welcomeChannel) {
            welcomeChannel = server.defaultChannel;
          }
        } else {
          welcomeChannel = user;
        }
        let message = welcomeInfo.message.replace(/\$user/gi, utils.clean(user.username)).replace(/\$mention/gi, user.mention).replace(/\$server/gi, utils.clean(server.name));
        if (welcomeInfo.delay && welcomeInfo.delay > 1000) {
          setTimeout(() => {
            this.client.createMessage(welcomeChannel.id, message);
          }, welcomeInfo.delay);
        } else {
          this.client.createMessage(welcomeChannel.id, message)
        }
      }

    };
  }

  onDisconnect() {
    this.client.removeListener("guildMemberAdd", this.onJoin);
  }

  onReady() {
    this.client.on("guildMemberAdd", this.onJoin);
  }

  static getCommands() {
    return ["setwelcome"];
  }

  /**
   * Called with a command, returns true or a promise if it is handling the command, returns false if it should be passed on.
   * @param {Message} msg
   * @param {Command} command
   * @param {Permissions} perms
   * @returns {boolean | Promise}
   */
  onCommand(msg, command, perms) {
    if (command.command === "setwelcome" && perms.check(msg, "admin.welcome.set")) {
      if (!command.args && !command.channel) {
        return true;
      }
      let settings = this.config.get("welcome", {}, {server: msg.channel.guild.id});
      if (command.args.length > 0 && command.args[0].toLowerCase() === "false") {
        this.config.set("welcome", {}, {server: msg.channel.guild.id, conflict: "replace"});
        command.replyAutoDeny(":thumbsup::skin-tone-2:");
        return true;
      }
      if (command.args.length > 0) {
        settings.message = command.args.join(" ");
      }
      if (command.channel) {
        settings.channel = command.channel.id;
      }
      settings.private = command.flags.indexOf('p') > -1;
      if (command.options.delay) {
        settings.delay = Math.max(Math.min(command.options.delay.valueOf() || 0, 20), 0) * 1000;
      }
      this.config.set("welcome", settings, {server: msg.channel.guild.id});
      command.replyAutoDeny(":thumbsup::skin-tone-2:");
      return true;
    }
    return false;
  }
}

module.exports = welcome;