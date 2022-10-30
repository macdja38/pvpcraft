/**
 * Created by macdja38 on 2016-06-13.
 */

"use strict";

import utils from "../lib/utils";
import { Module, ModuleCommand, ModuleConstructor } from "../types/moduleDefinition";
import { ModuleOptions } from "../types/lib";
import Eris from "eris";
import Permissions from "../lib/Permissions";
import * as Sentry from "@sentry/node";
import { combineTwoImages, getImageFromFile, getImageFromUrl } from "../lib/hats";
import { GuildCommand } from "../lib/Command/Command";
import { translateTypeCreator } from "../types/translate";

const hat: ModuleConstructor = class hat implements Module {
  private client: Eris.Client;
  private perms: Permissions;
  private i10010n: translateTypeCreator;

  /**
   * Instantiates the module
   * @constructor
   * @param {Object} e
   * @param {Eris} e.client Eris client
   * @param {Config} e.config File based config
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
    this.perms = e.perms;
    this.i10010n = e.i10010n;
  }

  /**
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent() {
    return {
      name: "Hat",
      description: "Gives out christmas hats",
      key: "hat",
      permNode: "hat",
      commands: this.getCommands(),
    };
  }

  /**
   * Returns an array of commands that can be called by the command handler
   */
  getCommands(): ModuleCommand[] {
    return [{
      triggers: ["hat"],
      description: "Gives a user a hat",
      permissionCheck: (command: GuildCommand) => {
        if (this.client.user.username.toLowerCase() === "pvpcraft") {
          return this.perms.check(command, "hat.hat");
        }
        return true
      },
      channels: "guild" as "guild",
      execute: async (command: GuildCommand) => {
        let userID = command.targetUser?.id || command.member.user.id;
        let avatarHash = command.targetUser?.avatar || command.member.user.avatar;
        let avatarURL = command.targetUser?.avatarURL || command.member.user.avatarURL;

        let imgPromise;
        if (avatarURL) {
          imgPromise = getImageFromUrl(avatarURL);
        } else {
          imgPromise = getImageFromUrl("https://discord.com/assets/6debd47ed13483642cf09e832ed0bc1b.png");
        }
        let hatPromise = getImageFromFile("./resources/hat.png");

        let img = await imgPromise;
        let hatImg = await hatPromise;

        try {
          let buffer = await combineTwoImages(img, hatImg);

          const response = {
            embed: {
              image: { url: "attachment://hat.png" },
              description: `Here is your hat!\nEdit [here](https://christmas.ryke.xyz/?id=${userID}&hash=${avatarHash}) | Invite bot [here](https://hat.pvpcraft.ca)\n\nI support discord slash commands.\n[Reinvite](https://hat.pvpcraft.ca) to try it out!`,
            },
          };
          return command.reply(response, { name: "hat.png", file: buffer })
        } catch (errors) {
          command.reply(`Sorry the error ${errors} occurred while processing your command, make sure you have a non-default avatar`);
          Sentry.captureException(errors);
          console.error("error", errors);
        }
        return true;
      },
    },
    ];
  }
}

module.exports = hat;
