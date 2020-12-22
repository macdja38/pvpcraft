/**
 * Created by macdja38 on 2016-06-13.
 */

"use strict";

import utils from "../lib/utils";
import { v2Module, v2ModuleConstructor } from "../types/moduleDefinition";
import { ModuleOptions } from "../types/lib";
import Eris from "eris";
import Permissions from "../lib/Permissions";
import { APPLICATION_COMMAND_TYPES } from "../lib/Command/CommandTypes";
import {
  PvPInteractiveCommandWithOpts,
  SlashCommand,
} from "../lib/Command/PvPCraftCommandHelper";
import * as Sentry from "@sentry/node";
import { combineTwoImages, getImageFromFile, getImageFromUrl } from "../lib/hats";

const hat: v2ModuleConstructor = class hat implements v2Module {
  private client: Eris.Client;
  private perms: Permissions;
  private i10010n: any;

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
  getCommands(): SlashCommand[] {
    return [
      (() => {
        const options = [{
          name: "user" as "user",
          description: "Optionally a user to target with a hat",
          type: APPLICATION_COMMAND_TYPES.USER,
          required: false as false,
        }];

        return {
          name: "hat",
          description: "Gives a user a hat",
          channels: "guild" as "guild",
          options: options,
          execute: async (command: PvPInteractiveCommandWithOpts<typeof options>) => {
            let userID = command.opts.user?.id || command.member.user.id;
            let avatarHash = command.opts.user?.avatar || command.member.user.avatar;
            let avatarURL = command.opts.user?.avatarURL || command.member.user.avatarURL;

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
              const discordMessage = await this.client.createMessage("790914073260064799", `Someone asked for a christmas hat. Use this channel as a CDN cause / commands don't let you upload images.`, { name: "hat.png", file: buffer });

              // discord doesn't let us do this cause they won't let you send files with embeds.
              /* const response = {
                embeds: [{
                  image: { url: "attachment://hat.png" },
                  description: `Here is your hat!\nEdit [here](https://christmas.ryke.xyz/?id=${userID}&hash=${avatarHash}) | Invite bot [here](https://hat.pvpcraft.ca)`,
                }],
              };
              return command.respond(response, { name: "hat.png", file: buffer })
                .catch((error: any) => {
                  console.error(error);
                  console.log(error._errors);
                  console.log(JSON.stringify(error))
                }); */
              const response = {
                embeds: [{
                  image: { url: discordMessage.attachments[0].url },
                  description: `Here is your hat!\nEdit [here](https://christmas.ryke.xyz/?id=${userID}&hash=${avatarHash}) | Invite bot [here](https://hat.pvpcraft.ca)`,
                }],
              };
              return command.respond(response);
            } catch (errors) {
              command.respond(`Sorry the error ${errors} occurred while processing your command, make sure you have a non-default avatar`);
              Sentry.captureException(errors);
              console.error("error", errors);
            }

            return true;
          },
        }
      })(),
    ];
  }
}

module.exports = hat;
