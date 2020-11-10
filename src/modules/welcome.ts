/**
 * Created by macdja38 on 2016-05-23.
 */

"use strict";

import utils from "../lib/utils";
import { Module, ModuleCommand, ModuleConstructor } from "../types/moduleDefinition";
import { ModuleOptions } from "../types/lib";
import Eris from "eris";
import ConfigDB from "../lib/ConfigDB";
import Permissions from "../lib/Permissions";
import * as Sentry from "@sentry/node";
import { GuildCommand } from "../lib/Command";

const welcome: ModuleConstructor = class welcome implements Module {
  private client: Eris.Client;
  private config: ConfigDB;
  private perms: Permissions;
  private i10010n: any;

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
  constructor(e: ModuleOptions) {
    this.client = e.client;
    this.config = e.configDB;
    this.perms = e.perms;
    this.i10010n = e.i10010n;


    this.onJoin = this.onJoin.bind(this);
  }

  async onJoin(server: Eris.Guild, user: Eris.User) {
    try {
      //TODO: once config loader v2 is done make this configurable.
      if (server.id === "77176186148499456") {
        utils.handleErisRejection(this.client.createMessage("171382498020950016",
          `Hop to it @here, ${utils.clean(user.username)} Just joined ${utils.clean(server.name)} ` +
          `announce it in <#77176186148499456>\n\`\`\`\nWelcome **${utils.clean(user.username)}**!\n\`\`\``
        ));
      }
      if (server.id === "191052428228034560") {
        utils.handleErisRejection(this.client.createMessage("215030357727117313",
          `Hop to it @here, <@${user.id}> baru saja bergabung di ${utils.clean(server.name)}, umumkan di  <#191052428228034560>
\`\`\`Selamat datang <@${user.id}> di **Warframe Indonesia Community**!\`\`\``
        ));
      }
      let welcomeInfo = this.config.get("welcome", {}, {server: server.id});
      let pm = welcomeInfo.private;
      if (welcomeInfo.message) {
        let welcomeChannel: Eris.AnyGuildChannel | Eris.PrivateChannel | undefined;
        if (pm !== true) {
          if (welcomeInfo.channel) {
            welcomeChannel = server.channels.get(welcomeInfo.channel);
          } else {
            welcomeChannel = server.channels.get(server.id);
          }
          if (!welcomeChannel) {
            return;
          }
        } else {
          welcomeChannel = await this.client.getDMChannel(user.id);
        }
        if (!(welcomeChannel && "createMessage" in welcomeChannel)) {
          throw new Error("Welcome channel was not a TextableChannel");
        }
        let message = welcomeInfo.message.replace(/\$user/gi, utils.clean(user.username)).replace(/\$mention/gi, user.mention).replace(/\$server/gi, utils.clean(server.name));
        const savedWelcomeChannel: Eris.TextableChannel = welcomeChannel;
        if (welcomeInfo.delay && welcomeInfo.delay > 1000) {
          setTimeout(() => {
            utils.handleErisRejection(savedWelcomeChannel.createMessage(message));
          }, welcomeInfo.delay);
        } else {
          utils.handleErisRejection(savedWelcomeChannel.createMessage(message));
        }
      }
    } catch (error) {
      Sentry.captureException(error);
    }
  };

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
      name: `Join messages`,
      description: `Welcome new users to your server with a customised join message`,
      key: "welcome",
      permNode: "welcome",
      commands: this.getCommands(),
    };
  }

  getCommands(): ModuleCommand[] {
    return [{
      triggers: ["setwelcome"],
      permissionCheck: this.perms.genCheckCommand("admin.welcome.set"),
      channels: ["guild"],
      execute: (command: GuildCommand) => {
        let settings = this.config.get("welcome", {}, {server: command.channel.guild.id});
        if (command.args.length > 0 && command.args[0].toLowerCase() === "false") {
          this.config.set("welcome", {}, {server: command.channel.guild.id, conflict: "replace"});
          return command.replyAutoDeny(command.translate `:thumbsup::skin-tone-2:`);
        }
        if (command.args.length > 0) {
          settings.message = command.args.join(" ");
        }
        if (command.channel) {
          settings.channel = command.channel.id;
        }
        settings.private = command.flags.indexOf('p') > -1;
        if (command.options.delay) {
          settings.delay = Math.max(Math.min(parseInt(command.options.delay, 10) || 0, 20), 0) * 1000;
        }
        this.config.set("welcome", settings, {server: command.channel.guild.id});
        return command.replyAutoDeny(command.translate `:thumbsup::skin-tone-2:`);
      }
    }];
  }
}

module.exports = welcome;
