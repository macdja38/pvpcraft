/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

let colors = require('colors');
const i10010n = require("i10010n").init({});

let request = require('request-promise-native');

let now = require("performance-now");

let SlowSender = require('../lib/SlowSender');

let packer;
try {
  packer = require("erlpack").unpack;
} catch (e) {
  packer = JSON.stringify;
}

//noinspection JSUnusedLocalSymbols
let Eris = require('eris');
const utils = require('../lib/utils');
let util = require('util');

class evaluate {
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
   * @param {Array} e.modules Array of modules
   * @param {pvpcraft} e.pvpcraft Instance of pvpcraft
   */
  constructor(e) {
    this.e = e;
    this.client = e.client;
    this.modules = e.modules;
    this.config = e.config;
    this.r = e.r;
    this.pvpcraft = e.pvpcraft;
    this.configDB = e.configDB;
    this.pvpClient = e.pvpClient;
    this.messageSender = e.messageSender;
    this.fileConfig = e.config;
    this.slowSender = new SlowSender(e);
  }

  static getCommands() {
    return ["testdc", "eval", "eval2", "setavatar"];
  }

  onReady() {
    this.slowSender.onReady();
  }

  onDisconnect() {
    this.slowSender.onDisconnect();
  }

  // id is hardcoded to prevent problems stemming from the misuse of eval.
  // no perms check because this extends past the bounds of a server.
  // if you know what you are doing and would like to use the id in the config file you may replace msg.author.id == id, with
  // this.config.get("permissions", {"permissions": {admins: []}}).admins.includes(msg.author.id)
  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands() {
    return [{
      triggers: ["eval"],
      permissionCheck: command => command.author.id === "85257659694993408",
      channels: ["*"],
      execute: command => {
        return this.evalCommand(command.msg, command);
      },
    }, {
      triggers: ["reload"],
      permissionCheck: command => command.author.id === "85257659694993408",
      channels: ["*"],
      execute: command => {
        if (command.flags.indexOf("a") > -1) {
          this.pvpcraft.reload();
        } else {
          this.pvpcraft.reloadTarget(command);
        }
        return true;
      },
    }, {
      triggers: ["testdc"],
      permissionCheck: command => command.author.id === "85257659694993408",
      channels: ["*"],
      execute: command => {
        if (command.args.length < 1) {
          command.reply(`${command.prefix}testdc <reconnect|resume>`);
          return true;
        }
        switch (command.args[0].toLowerCase()) {
          case "reconnect": {
            command.reply(i10010n() `Initiating reconnect.`);
            let packed = packer({op: 7});
            this.client.shards.random().ws.onmessage({data: packed});
            break;
          }
          case "resume": {
            command.reply(i10010n() `Initiating resume sequence`);
            this.client.shards.random().ws.onclose({code: 1006, reason: "testing", wasClean: true});
            break;
          }
        }
      },
    }, {
      triggers: ["setavatar"],
      permissionCheck: command => this.fileConfig.get("permissions", {"permissions": {admins: []}}).admins.includes(command.author.id),
      channels: ["*"],
      execute: command => {
        return request({
          method: 'GET',
          url: command.args[0],
          encoding: null,
        }).then((image) => {
          this.client.editSelf({avatar: `data:image/png;base64,${image.toString("base64")}`}).then(() => {
            command.reply(i10010n() `Changed avatar.`);
          }).catch((err) => {
            command.reply(i10010n() `Failed setting avatar.${err}`);
            return true;
          });
        }).catch((err) => {
          command.reply(i10010n() `Failed to get a valid image.${err}`);
          return true;
        });
      },
    }];
  }

  async evalCommand(msg, command) {
    let code = command.args.join(" ");

    //these are so that others code will run in the eval if they depend on things.
    //noinspection JSUnusedLocalSymbols
    let client = this.client;
    //noinspection JSUnusedLocalSymbols
    let bot = this.client;
    let message = msg;
    //noinspection JSUnusedLocalSymbols
    let config = this.config;
    //noinspection JSUnusedLocalSymbols
    let slowSend = this.slowSender;
    //noinspection JSUnusedLocalSymbols
    let raven = this.raven;
    //noinspection JSUnusedLocalSymbols
    let modules = this.modules;
    //noinspection JSUnusedLocalSymbols
    let guild = message.channel.guild;
    //noinspection JSUnusedLocalSymbols
    let channel = msg.channel;
    let t0, t1;

    let t2Resolve;
    let t2 = new Promise(resolve => {
      t2Resolve = resolve;
    });

    for (let i = 0; i < 100; i++) {
      t0 = now()
    } // make now a hot path, hopefully making it more accurate

    try {
      let evaluated;
      t0 = now();
      evaluated = eval(code);
      t1 = now();
      let embedText = "```xl\n" +
        i10010n() `\n- - - - - - evaluates-to- - - - - - -\n` +
        utils.clean(this._shortenTo(this._convertToObject(evaluated), 1800)) +
        "\n- - - - - - - - - - - - - - - - - - -\n" +
        i10010n() `In ${t1 - t0} milliseconds!\n\`\`\``;
      if (evaluated && evaluated.catch) evaluated.catch(() => {
      }).then(() => {
        t2Resolve(now());
      });
      command.createMessage({
        content: msg.content,
        embed: {description: embedText, color: 0x00FF00},
      }).then(async (initialMessage) => {
        let resolvedTime2 = await t2;
        try {
          let result = await evaluated;
          embedText = embedText.substring(0, embedText.length - 4);
          embedText += i10010n() `\n- - - - -Promise resolves to- - - - -\n`;
          embedText += utils.clean(this._shortenTo(this._convertToObject(result), 1800));
          embedText += "\n- - - - - - - - - - - - - - - - - - -\n";
          embedText += i10010n() `In ${resolvedTime2 - t0} milliseconds!\n\`\`\``;
          this.client.editMessage(msg.channel.id, initialMessage.id, {
            content: msg.content,
            embed: {
              description: embedText,
              color: 0x00FF00,
            },
          })
        } catch (error) {
          console.error("eval error", error);
          if (error === undefined) {
            error = "undefined"
          } else if (error === null) {
            error = "null"
          }
          embedText = embedText.substring(0, embedText.length - 4);
          embedText += i10010n() `\n- - - - - Promise throws- - - - - - -\n`;
          embedText += utils.clean(this._shortenTo(error.toString(), 1800));
          embedText += "\n- - - - - - - - - - - - - - - - - - -\n";
          embedText += i10010n() `In ${resolvedTime2 - t0} milliseconds!\n\`\`\``;
          this.client.editMessage(msg.channel.id, initialMessage.id, {
            content: msg.content,
            embed: {
              description: embedText,
              color: 0xFF0000,
            },
          })
        }
      });
      console.log(evaluated);
    }
    catch (error) {
      t1 = now();
      command.createMessage({
        embed: {
          description: "```xl\n" +
          i10010n() `\n- - - - - - - errors-in - - - - - - -\n` +
          utils.clean(this._shortenTo(this._convertToObject(error.toString()), 1200)) +
          (error ?
            i10010n() `\n- - - - - - - stack - - - - - - - - -\n` +
            this._shortenTo(utils.clean(this.shortenErrorStack(error)), 500)
            : "") +
          "\n- - - - - - - - - - - - - - - - - - -\n" +
          i10010n() `In ${t1 - t0} milliseconds!\n\`\`\``,
          color: 0xFF0000,
        },
      });
      console.error(error);
    }
    return true;
  }

  shortenErrorStack(error) {
    let arr = error.stack.split('at eval (eval at evalCommand');
    if (arr.length > 1) {
      return arr[0];
    }
    arr = error.stack.split('at evaluate.evalCommand');
    if (arr.length > 1) {
      return arr[0];
    }
    return error.stack;
  }

  /**
   *
   * @param {*} input
   * @param {number} charCount
   * @returns {string}
   * @private
   */
  _shortenTo(input, charCount) {
    if (input !== undefined) {
      return input.slice(0, charCount);
    } else {
      return "undefined";
    }
  }

  /**
   * Converts to string
   * @param {Object?} object
   * @returns {string}
   * @private
   */
  _convertToObject(object) {
    if (object === null) return "null";
    if (typeof object === "undefined") return "undefined";
    if (object.toJSON && typeof object.toJSON) {
      object = object.toJSON();
    }
    return util.inspect(object, {depth: 2}).replace(new RegExp(this.client.token, "g"), "[ Token ]");
  }
}

//noinspection JSUnusedLocalSymbols (used in eval
function dec2bin(dec) {
  return (dec >>> 0).toString(2);
}

module.exports = evaluate;