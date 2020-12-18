/**
 * Created by macdja38 on 2016-04-25.
 */

"use strict";

import utils from "../lib/utils";
import { Module, ModuleCommand, ModuleConstructor } from "../types/moduleDefinition";
import { ModuleOptions } from "../types/lib";
import Permissions from "../lib/Permissions";
import Eris from "eris";
import Command from "../lib/Command/Command";

let google = require("google");

let request = require("request");

let cheerio = require("cheerio");

const search: ModuleConstructor = class search implements Module {
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

  getCommands(): ModuleCommand[] {
    return [{
      triggers: ["g", "google"],
      permissionCheck: this.perms.genCheckCommand("search.google"),
      channels: ["*"],
      execute: this.executeSearch.bind(this),
    }];
  }

  /**
   * Searches google
   * @param {Command} command
   */
  executeSearch(command: Command) {
    if (command.args.length < 1) {
      command.replyAutoDeny(command.translate `Please supply something to search for.`);
      return true;
    }
    let search = command.args.join(" ");
    google(search, (err: Error, response: any) => {
      if (err || !response || !response.links) command.reply(command.translate `Your search resulted in an error`);
      else if (response.links.length < 1) command.reply(command.translate `No results found`);
      else {
        if (response.links[0].link === null) {
          for (let i = 1; i < response.links.length; i++) {
            if (response.links[i].link !== null) {
              command.createMessageAutoDeny(command.translate `Found ${utils.clean(response.links[i].link)})`);
              return;
            }
          }
        } else {
          command.createMessageAutoDeny(command.translate `Found ${utils.clean(response.links[0].link)}`);
        }
      }
    });
    return true;
  }
}

function search_gus(query: string) {
  return request.get(`https://www.google.com/search?ie=ISO-8859-1&hl=en&source=hp&q=${query}&btnG=Google+Search&gbv=1`)
    .then((body: string) => cheerio.load(body))
    .then(($: any) => {
      const element = $('body p a').first();
      if (!element) return false;
      let href = element.attr('href');
      if (!href) return false;
      href = href.replace(/^\/url\?q=/, '');
      href = href.slice(0, href.indexOf('&sa='));
      return href;
    });
}

module.exports = search;
