/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

var colors = require('colors');

var request = require('request');

var now = require("performance-now");

var SlowSender = require('../lib/slowSender');

var Utils = require('../lib/utils');
var utils = new Utils();

module.exports = class evaluate {
  constructor(e) {
    this.client = e.client;
    this.modules = e.modules;
    this.config = e.config;
    this.configDB = e.configDB;
    this.messageSender = e.messageSender;
    this.fileConfig = e.config;
    this.slowSender = new SlowSender(e);
  }

  getCommands() {
    return ["eval", "setavatar", "hooktest"];
  }

  onReady() {
    this.slowSender.onReady();
  }

  onDisconnect() {
    this.slowSender.onDisconnect();
  }

  onCommand(msg, command, perms) {
    //id is hardcoded to prevent problems stemming from the misuse of eval.
    //no perms check because this extends paste the bounds of a server.
    //if you know what you are doing and would like to use the id in the config file you may replace msg.author.id == id, with
    //this.config.get("permissions", {"permissions": {admins: []}}).admins.includes(msg.author.id)
    if (command.command === "eval" && msg.author.id === "85257659694993408") {
      var code = command.args.join(" ");

      //these are so that others code will run in the eval if they depend on things.
      let client = this.client;
      let bot = this.client;
      let message = msg;
      let config = this.config;
      let slowSend = this.slowSender;

      let raven = this.raven;
      let modules = this.modules;
      let server = message.channel.server;
      let channel = msg.channel;
      let t0;
      let t1;
      t0 = now();
      try {
        var evaluated = eval(code);
        t1 = now();
        let string = "```xl\n" +
          utils.clean(code) +
          "\n- - - - - - evaluates-to- - - - - - -\n" +
          utils.clean(evaluated) +
          "\n- - - - - - - - - - - - - - - - - - -\n" +
          "In " + (t1 - t0) + " milliseconds!\n```";
        this.client.sendMessage(msg.channel, string).then(message => {
          if (evaluated.then) {
            evaluated.catch((error) => {
              string = string.substring(0, string.length - 4  );
              string += "\n- - - - - Promise throws- - - - - - -\n";
              string += utils.clean(error);
              string += "\n- - - - - - - - - - - - - - - - - - -\n";
              string += "In " + (now() - t0) + " milliseconds!\n```";
              this.client.updateMessage(message, string).catch(error => console.error(error));
            }).then((result) => {
              string = string.substring(0, string.length - 4  );
              string += "\n- - - - -Promise resolves to- - - - -\n";
              string += utils.clean(result);
              string += "\n- - - - - - - - - - - - - - - - - - -\n";
              string += "In " + (now() - t0) + " milliseconds!\n```";
              this.client.updateMessage(message, string).catch(error => console.error(error));
            }).catch(error => console.error(error))
          }
        });
        console.log(evaluated);
      }
      catch (error) {
        t1 = now();
        this.client.sendMessage(msg.channel, "```xl\n" +
          utils.clean(code) +
          "\n- - - - - - - errors-in- - - - - - - \n" +
          utils.clean(error) +
          "\n- - - - - - - - - - - - - - - - - - -\n" +
          "In " + (t1 - t0) + " milliseconds!\n```");
        console.error(error);
      }
      return true;
    }

    if (command.command === "setavatar" && this.fileConfig.get("permissions", {"permissions": {admins: []}}).admins.includes(msg.author.id)) {
      request({
        method: 'GET',
        url: command.args[0],
        encoding: null
      }, (err, res, image) => {
        if (err) {
          this.client.sendMessage(msg.channel, "Failed to get a valid image.");
          return true;
        }
        this.client.setAvatar(image, (err) => {
          if (err) {
            this.client.sendMessage(msg.channel, "Failed setting avatar.");
            return true;
          }
          this.client.sendMessage(msg.channel, "Changed avatar.");
        });
      });
      return true;
    }

    if (command.command === "hooktest" && perms.check(msg, "hooktest")) {
      this.messageSender.sendMessage(msg.channel, "Hello", {
        "username": "ChessBot 3000",
        "icon_url": "http://www.clipartkid.com/images/844/27-chess-piece-pictures-free-cliparts-that-you-can-download-to-you-fAbN54-clipart.jpeg",
        "text" :"",
        "slack": true,
        "attachments": [{
          "pretext": "<:rb:230774531864657920><:NB:230771178065625088><:bb:230774531743023104><:KB:230771177885401088><:qb:230774532451860481><:BB:230771178065756170><:nb:230774531826909188><:RB:230771178065756160> 1\n<:PB:230771178124345344><:pb:230774531797549057><:PB:230771178124345344><:pb:230774531797549057><:PB:230771178124345344><:pb:230774531797549057><:PB:230771178124345344><:pb:230774531797549057> 2\n<:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488> 3\n<:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968> 4\n<:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488> 5\n<:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968> 6\n<:pw:230774531923378176><:PW:230771178036396037><:pw:230774531923378176><:PW:230771178036396037><:pw:230774531923378176><:PW:230771178036396037><:pw:230774531923378176><:PW:230771178036396037> 7\n<:RW:230771177616965633><:nw:230774531839492096><:BW:230771178057236480><:kw:230774531751542784><:QW:230771177738600448><:pw:230774531923378176><:NW:230771177818161152><:rw:230774531671719937> 8\n   a     b     c     d     e     f     g     h  "
        }]});
    }
    return false;
  }
};