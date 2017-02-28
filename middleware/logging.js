/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

let Utils = require('../lib/utils.js');
let utils = new Utils();

let DB = require('../lib/database.js');
let db = new DB();

class logging {
  /**
   * Instantiates the module
   * @constructor
   * @param {Object} e
   * @param {Client} e.client Eris client
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
  }

  /**
   * Get's called every message.
   * @param msg
   * @param perms
   */
  onMessage(msg, perms) {
    //do something with the message like log it.
    // db.logMessage(msg);
  }
}

module.exports = logging;