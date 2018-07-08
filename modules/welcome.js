/**
 * Created by macdja38 on 2016-05-23.
 */
"use strict";

const utils = require('../lib/utils');

class welcome {
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
    this.config = e.configDB;
    this.raven = e.raven;
    this.perms = e.perms;
    this.i10010n = e.i10010n;

    /**
     *
     * @param {Guild} server
     * @param {Member} user
     */
    this.onJoin = async (server, user) => {
      try {
        //TODO: once config loader v2 is done make this configurable.
        if (server.id === "77176186148499456") {
          utils.handleErisRejection(this.client.createMessage("171382498020950016",
            this.i10010n() `Hop to it @here, ${utils.clean(user.username)} Just joined ${utils.clean(server.name)} ` +
            this.i10010n() `announce it in <#77176186148499456>\n\`\`\`\nWelcome **${utils.clean(user.username)}**!\n\`\`\``
          ));
        }
        if (server.id === "191052428228034560") {
          utils.handleErisRejection(this.client.createMessage("215030357727117313",
            this.i10010n() `Hop to it @here, <@${user.id}> baru saja bergabung di ${utils.clean(server.name)}, umumkan di  <#191052428228034560>
\`\`\`Selamat datang <@${user.id}> di **Warframe Indonesia Community**!\`\`\``
          ));
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
              welcomeChannel = server.channels.get(server.id);
            }
            if (!welcomeChannel) {
              return;
            }
          } else {
            welcomeChannel = await this.client.getDMChannel(user.id);
          }
          let message = welcomeInfo.message.replace(/\$user/gi, utils.clean(user.username)).replace(/\$mention/gi, user.mention).replace(/\$server/gi, utils.clean(server.name));
          if (welcomeInfo.delay && welcomeInfo.delay > 1000) {
            setTimeout(() => {
              utils.handleErisRejection(this.client.createMessage(welcomeChannel.id, message));
            }, welcomeInfo.delay);
          } else {
            utils.handleErisRejection(this.client.createMessage(welcomeChannel.id, message));
          }
        }
      } catch (error) {
        if (this.raven) {
          this.raven.captureException(error);
        } else {
          console.error(error);
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

  /**
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent() {
    return {
      name: this.i10010n() `Join messages`,
      description: this.i10010n() `Welcome new users to your server with a customised join message`,
      key: "welcome",
      permNode: "welcome",
      commands: this.getCommands(),
    };
  }

  getCommands() {
    return [{
      triggers: ["setwelcome"],
      permissionCheck: this.perms.genCheckCommand("admin.welcome.set"),
      channels: ["guild"],
      execute: (command) => {
        let settings = this.config.get("welcome", {}, {server: command.channel.guild.id});
        if (command.args.length > 0 && command.args[0].toLowerCase() === "false") {
          this.config.set("welcome", {}, {server: command.channel.guild.id, conflict: "replace"});
          command.replyAutoDeny(this.i10010n() `:thumbsup::skin-tone-2:`);
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
        this.config.set("welcome", settings, {server: command.channel.guild.id});
        command.replyAutoDeny(this.i10010n() `:thumbsup::skin-tone-2:`);
        return true;
      }
    }];
  }
}

module.exports = welcome;