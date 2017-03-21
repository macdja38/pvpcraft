/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

let utils = require('../lib/utils');

let google = require('google');

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
   */
  constructor(e) {
    this.client = e.client;
    this.raven = e.raven;
  }

  static getCommands() {
    //this needs to return a list of commands that should activate the onCommand function
    //of this class. array of strings with trailing s's removed.
    return ["google"];
  }

  /**
   * Called with a command, returns true or a promise if it is handling the command, returns false if it should be passed on.
   * @param {Message} msg
   * @param {Command} command
   * @param {Permissions} perms
   * @returns {boolean | Promise}
   */
  onCommand(msg, command, perms) {

    //check if this is a command we should handle and if the user has permissions to execute it.
    if (command.command === "google" && perms.check(msg, "search.google")) {
      if (command.args.length < 1) {
        command.replyAutoDeny("Please supply something to search for.");
        return true;
      }
      let search = command.args.join(" ");
      google(search, (err, response) => {
        if (err || !response || !response.links) command.reply("Your search resulted in an error");
        else if (response.links.length < 1) command.reply("No results found");
        else {
          if (response.links[0].link === null) {
            for (let i = 1; i < response.links.length; i++) {
              if (response.links[i].link !== null) {
                command.createMessageAutoDeny(`Found ${utils.clean(response.links[i].link)})`);
                return;
              }
            }
          } else {
            command.createMessageAutoDeny(`Found ${utils.clean(response.links[0].link)}`);
          }
        }
      });
      return true;
    }
    return false;
  }
}

module.exports = search;