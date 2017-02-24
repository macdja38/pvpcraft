/**
 * Created by macdja38 on 2016-05-23.
 */
"use strict";

let utils = require('../lib/utils');

module.exports = class welcome {
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

  getCommands() {
    return ["setwelcome"];
  }

  onCommand(msg, command, perms, l) {
    if (command.command === "setwelcome" && perms.check(msg, "admin.welcome.set")) {
      if (!command.args && !command.channel) {
        return true;
      }
      let settings = this.config.get("welcome", {}, {server: msg.channel.guild.id});
      if (command.args.length > 0 && command.args[0].toLowerCase() === "false") {
        this.config.set("welcome", {}, {server: msg.channel.guild.id, conflict: "replace"});
        msg.channel.createMessage(msg.author.mention + ", " + ":thumbsup::skin-tone-2:");
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
      msg.channel.createMessage(msg.author.mention + ", " + ":thumbsup::skin-tone-2:");
      return true;
    }
    return false;
  }
};