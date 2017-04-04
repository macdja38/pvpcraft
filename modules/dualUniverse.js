/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

const utils = require('../lib/utils');

const request = require("request");
//const qs = require("querystring");

const pledges = {
  iron: 5066827,
  bronze: 10244641,
  silver: 11908541,
  gold: 13421619,
  sapphire: 2718657,
  ruby: 10162462,
  emerald: 41603,
  diamond: 13559022,
  kyrium: 138325,
};

class dualUniverse {
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

  duFetch(options) {
    return new Promise((resolve, reject) => {
      request(options, function (error, response, bodyString) {
        if (error) {
          if (this.raven) this.raven.captureException(error, {extra: options});
          return reject(error);
        }
        const body = JSON.parse(bodyString);
        if (body.success) return resolve(body);
        reject(body);
      })
    })
  }

  getUser(name) {
    const options = {
      method: 'GET',
      url: 'http://api.du-tools.com/docs/du/duexplorer/users',
      qs: {fields: 'user,pledgeStatus,organizations,createdDate', query: JSON.stringify({user: name.toLowerCase()})},
      headers: {'cache-control': 'no-cache'}
    };
    return this.duFetch(options)
  }

  getOrg(name) {
    const options = {
      method: 'GET',
      url: 'http://api.du-tools.com/docs/du/duexplorer/orgs',
      qs: {fields: 'name', query: JSON.stringify({org: name.toLowerCase()})},
      headers: {'cache-control': 'no-cache'}
    };
    return this.duFetch(options)
  }

  /**
   * Returns the triggers that will cause this module's onCommand function to be called
   * @returns {string[]}
   */
  static getCommands() {
    return ["duuser", "duser", "duorg"];
  }

  /**
   * Called with a command, returns true or a promise if it is handling the command, returns false if it should be passed on.
   * @param {Message} msg
   * @param {Command} command
   * @param {Permissions} perms
   * @returns {boolean | Promise}
   */
  onCommand(msg, command, perms) {
    if (command.command === "duuser" || command.command === "duser" && perms.check(msg, "du.user")) {
      let targetUser = command.args.join(" ");
      return this.getUser(targetUser).then(body => {
        if (body.data.length < 1) {
          command.replyAutoDeny(`Could not find user ${utils.clean(targetUser)}`);
          return true;
        }
        const user = body.data[0];
        console.log(user);
        command.replyAutoDeny({
          embed: {
            title: "Du User info",
            url: `https://community.dualthegame.com/accounts/profile/${targetUser.toLowerCase()}`,
            color: user.hasOwnProperty("pledgeStatus") && pledges.hasOwnProperty(user.pledgeStatus) ? pledges[user.pledgeStatus] : 0,
            fields: [
              {name: "username", value: user.user},
              {name: "created", value: user.createdDate},
              {name: "org count", value: user.organizations.length}
            ],
          }
        });
      });
    }

    if (command.command === "duorg" && perms.check(msg, "du.org")) {
      let targetOrg = command.args.join(" ");
      return this.getOrg(targetOrg).then(body => {
        if (body.data.length < 1) {
          command.replyAutoDeny(`Could not find user ${utils.clean(targetOrg)}`);
          return true;
        }
        const org = body.data[0];
        console.log(org);
        command.replyAutoDeny({
          embed: {
            title: "Du User info",
            url: `https://community.dualthegame.com/organization/${targetOrg.toLowerCase()}`,
            color: org.hasOwnProperty("pledgeStatus") && pledges.hasOwnProperty(org.pledgeStatus) ? pledges[org.pledgeStatus] : 0,
            fields: [
              {name: "name", value: org.name},
            ],
          }
        });
      });
    }
    return false;
  }
}

module.exports = dualUniverse;