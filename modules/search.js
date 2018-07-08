/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

const utils = require("../lib/utils");

let google = require("google");

let request = require("request");

let cheerio = require("cheerio");

class search {
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
    this.raven = e.raven;
    this.perms = e.perms;
    this.i10010n = e.i10010n;
  }

  getCommands() {
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
  executeSearch(command) {
    if (command.args.length < 1) {
      command.replyAutoDeny(this.i10010n() `Please supply something to search for.`);
      return true;
    }
    let search = command.args.join(" ");
    google(search, (err, response) => {
      if (err || !response || !response.links) command.reply(this.i10010n() `Your search resulted in an error`);
      else if (response.links.length < 1) command.reply(this.i10010n() `No results found`);
      else {
        if (response.links[0].link === null) {
          for (let i = 1; i < response.links.length; i++) {
            if (response.links[i].link !== null) {
              command.createMessageAutoDeny(this.i10010n() `Found ${utils.clean(response.links[i].link)})`);
              return;
            }
          }
        } else {
          command.createMessageAutoDeny(this.i10010n() `Found ${utils.clean(response.links[0].link)}`);
        }
      }
    });
    return true;
  }
}

function search_gus(query) {
  return request.get(`https://www.google.com/search?ie=ISO-8859-1&hl=en&source=hp&q=${query}&btnG=Google+Search&gbv=1`)
    .then(body => cheerio.load(body))
    .then(($) => {
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