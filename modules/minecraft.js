/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

let utils = require('../lib/utils');

let now = require("performance-now");

let mcping = require('mc-ping-updated');

module.exports = class minecraft {
  constructor(e) {
    this.client = e.client;
  }

  getCommands() {
    return ["mcping", "mcskin", "mcavatar"];
  }

  onCommand(msg, command, perms) {
    let t1 = now();
    if (command.command === "mcping" && perms.check(msg, "minecraft.mcping")) {
      let combined = command.args.join(".").match(/(.*?):(.*)/);
      let address;
      let port;
      if (combined) {
        address = combined[1] || "pvpcraft.ca";
        port = parseInt(combined[2], 10) || 25565;
      } else {
        address = command.args.join(".") || "pvpcraft.ca";
        port = 25565;
      }
      mcping(address, port, (err, res) => {
        if (err) {
          console.error(err);
          this.client.createMessage(msg.channel.id, "```xl\n" + err + "```")
        }
        else {
          let description = res.description;
          msg.channel.createMessage({
            embed: {
              title: `Server info of ${utils.clean(`${address}:${port}`)}`,
              fields: [{
                name: "Ping",
                value: `${now() - t1}`,
                inline: true
              }, {
                name: "Version",
                value: `${res.version.name}`,
                inline: true
              }, {
                name: "Protocal",
                value: `${res.version.protocol}`,
                inline: true
              },{
                name: "Players",
                value: `${res.players.online}/${res.players.max}`,
                inline: true
              }, {
                name: "Description",
                value: description.text === '' ? description.extra.map(e => e.text).join("") : description.text,
                inline: true
              }],
            }
          });
        }
      }, 3000);
      return true;
    }

    if (command.command === "mcavatar" && perms.check(msg, "minecraft.mcavatar")) {
      if (command.args.length < 1) {
        msg.channel.createMessage(msg.author.mention + ", " + "usage `" + command.prefix + "mcavatar <minecraft username>`");
        return true;
      }
      msg.channel.createMessage({
        embed: {
          title: `Avatar of ${utils.clean(command.args[0])}`,
          thumbnail: {url: `https://mcapi.ca/avatar/2d/${command.args[0]}/100/${((command.flags.includes("b")) ? "false" : "true")}`},
        }
      });
      return true;
    }

    if (command.command === "mcskin" && perms.check(msg, "minecraft.mcskin")) {
      if (command.args.length < 1) {
        msg.channel.createMessage(msg.author.mention + ", " + "usage `" + command.prefix + "mcskin <minecraft username>`");
        return true;
      }
      msg.channel.createMessage({
        embed: {
          title: `Skin of ${utils.clean(command.args[0])}`,
          thumbnail: {url: `https://visage.surgeplay.com/full/404/${command.args[0]}.png`},
        }
      });
      return true;
    }
    return false;
  }
};