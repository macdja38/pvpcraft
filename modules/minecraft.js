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
    var t1 = now();
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
          this.client.createMessage(msg.channel.id, "```xl\n" +
            "Pinged " + command.args.join(".") + " in " + (now() - t1) + "ms\n" +
            "Version " + res.version.name + " protocol " + res.version.protocol + "\n" +
            "Players " + res.players.online + "/" + res.players.max + "```"
          )
        }
      }, 3000);
      return true;
    }

    if (command.command === "mcavatar" && perms.check(msg, "minecraft.mcavatar")) {
      if (command.args.length < 1) {
        msg.channel.createMessage(msg.author.mention + ", " + "usage `" + command.prefix + "mcavatar <minecraft username>`");
        return true;
      }
      msg.channel.sendMessage({
        file: {
          file: "https://mcapi.ca/avatar/2d/" + command.args[0] + "/100/" + ((command.flags.includes("b")) ? "false" : "true"),
          name: command.args[0] + ".png"
        }
      });
      return true;
    }

    if (command.command === "mcskin" && perms.check(msg, "minecraft.mcskin")) {
      if (command.args.length < 1) {
        msg.channel.createMessage(msg.author.mention + ", " + "usage `" + command.prefix + "mcskin <minecraft username>`");
        return true;
      }
      msg.channel.sendMessage({
        file: {
          file: "https://visage.surgeplay.com/full/404/" + command.args[0] + ".png",
          name: command.args[0] + ".png"
        }
      });
      return true;
    }
    return false;
  }
};