/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

let colors = require('colors');

let request = require('request');

let now = require("performance-now");

let SlowSender = require('../lib/slowSender');

let utils = require('../lib/utils');
let util = require('util');

module.exports = class evaluate {
  constructor(e) {
    this.client = e.client;
    this.modules = e.modules;
    this.config = e.config;
    this.configDB = e.configDB;
    this.pvpClient = e.pvpClient;
    this.messageSender = e.messageSender;
    this.fileConfig = e.config;
    this.slowSender = new SlowSender(e);
  }

  getCommands() {
    return ["eval", "setavatar"];
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
      let code = command.args.join(" ");

      //these are so that others code will run in the eval if they depend on things.
      let client = this.client;
      let bot = this.client;
      let message = msg;
      let config = this.config;
      let slowSend = this.slowSender;

      let raven = this.raven;
      let modules = this.modules;
      let guild = message.channel.guild;
      let channel = msg.channel;
      let t0, t1, t2;
      t0 = now();
      try {
        t0 = now();
        let evaluated = eval(code);
        t1 = now();
        let string = "```xl\n" +
          utils.clean(code) +
          "\n- - - - - - evaluates-to- - - - - - -\n" +
          utils.clean(evaluated) +
          "\n- - - - - - - - - - - - - - - - - - -\n" +
          "In " + (t1 - t0) + " milliseconds!\n```";
        if (evaluated && evaluated.then) {
          evaluated.catch(() => {
          }).then(() => {
            t2 = now();
          })
        }

        this.client.createMessage(msg.channel.id, string).then(message => {
          if (evaluated && evaluated.then) {
            evaluated.catch((error) => {
              string = string.substring(0, string.length - 4);
              string += "\n- - - - - Promise throws- - - - - - -\n";
              string += utils.clean(error);
              string += "\n- - - - - - - - - - - - - - - - - - -\n";
              string += "In " + (t2 - t0) + " milliseconds!\n```";
              this.client.editMessage(message.channel.id, message.id, string).catch(error => console.error(error));
            }).then((result) => {
              string = string.substring(0, string.length - 4);
              string += "\n- - - - -Promise resolves to- - - - -\n";
              string += utils.clean(result);
              string += "\n- - - - - - - - - - - - - - - - - - -\n";
              string += "In " + (t2 - t0) + " milliseconds!\n```";
              this.client.editMessage(message.channel.id, message.id, string).catch(error => console.error(error));
            }).catch(error => console.error(error))
          }
        });
        console.log(evaluated);
      }
      catch (error) {
        t1 = now();
        this.client.createMessage(msg.channel.id, "```xl\n" +
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
          this.client.createMessage(msg.channel.id, "Failed to get a valid image.");
          return true;
        }
        this.client.setAvatar(image, (err) => {
          if (err) {
            this.client.createMessage(msg.channel.id, "Failed setting avatar.");
            return true;
          }
          this.client.createMessage(msg.channel.id, "Changed avatar.");
        });
      });
      return true;
    }

    return false;
  }
};