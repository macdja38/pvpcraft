/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

const utils = require('../lib/utils');
const request = require("request");

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
   * @param {Function} e.i10010n internationalization function
   */
  constructor(e) {
    this.client = e.client;
    this.pvpcraft = e.pvpcraft;
    this.raven = e.raven;
    this.perms = e.perms;
    this.i10010n = e.i10010n;
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
      headers: {'cache-control': 'no-cache'},
    };
    return this.duFetch(options)
  }

  getOrg(name) {
    const options = {
      method: 'GET',
      url: 'http://api.du-tools.com/docs/du/duexplorer/orgs',
      qs: {fields: 'name', query: JSON.stringify({org: name.toLowerCase()})},
      headers: {'cache-control': 'no-cache'},
    };
    return this.duFetch(options)
  }

  /**
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent() {
    return {
      name: "Dual Universe",
      description: "Commands surrounding the video game dual universe",
      key: "du",
      permNode: "du",
      commands: this.getCommands(),
    };
  }

  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands() {
    return [{
      triggers: ["duuser", "duser"],
      permissionCheck: this.perms.genCheckCommand("du.user"),
      channels: ["*"],
      execute: command => {
        let targetUser = command.args.join(" ");
        return this.getUser(targetUser).then(body => {
          if (body.data.length < 1) {
            command.replyAutoDeny(command.translate `Could not find user ${utils.clean(targetUser)}`);
            return true;
          }
          const user = body.data[0];
          console.log(user);
          command.replyAutoDeny({
            embed: {
              title: "Du User info",
              url: command.translate `https://community.dualthegame.com/accounts/profile/${targetUser.toLowerCase()}`,
              color: user.hasOwnProperty("pledgeStatus") && pledges.hasOwnProperty(user.pledgeStatus) ? pledges[user.pledgeStatus] : 0,
              fields: [
                {name: "username", value: user.user},
                {name: "created", value: user.createdDate},
                {name: "org count", value: user.organizations.length},
              ],
            },
          });
        });
      },
    }, {
      triggers: ["duorg"],
      permissionCheck: this.perms.genCheckCommand("du.org"),
      channels: ["*"],
      execute: command => {
        let targetOrg = command.args.join(" ");
        return this.getOrg(targetOrg).then(body => {
          if (body.data.length < 1) {
            command.replyAutoDeny(command.translate `Could not find organisation ${utils.clean(targetOrg)}`);
            return true;
          }
          const org = body.data[0];
          console.log(org);
          command.replyAutoDeny({
            embed: {
              title: "Du User info",
              url: command.translate `https://community.dualthegame.com/organization/${targetOrg.toLowerCase()}`,
              color: org.hasOwnProperty("pledgeStatus") && pledges.hasOwnProperty(org.pledgeStatus) ? pledges[org.pledgeStatus] : 0,
              fields: [
                {name: "name", value: org.name},
              ],
            },
          });
        });
      },
    }];
  }
}

module.exports = dualUniverse;