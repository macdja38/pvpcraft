/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

var now = require("performance-now");

var mcping = require('mc-ping-updated');

var streamBuffers = require('stream-buffers');

module.exports = class minecraft {
    constructor(e) {
        this.client = e.client;
    }

    getCommands() {
        return ["mcping", "mcskin", "mcavatar"];
    }

    onCommand(msg, command, perms) {
        console.log("Minecraft initiated");
        var t1 = now();
        if (command.command === "mcping" && perms.check(msg, "minecraft.mcping")) {
            let combined = command.args.join(".").match(/(.*?):(.*)/);
            let address;
            let port;
            if(combined) {
                address = combined[1];
                port = combined[2];
            } else {
                address = command.args.join(".") || "pvpcraft.ca";
                port = "25565";
            }
            mcping(address, port, (err, res)=> {
                if (err) {
                    console.error(err);
                    this.client.sendMessage(msg.channel, "```xl\n" + err + "```")
                }
                else {
                    console.log(res);
                    this.client.sendMessage(msg.channel, "```xl\n" +
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
                msg.reply("usage " + command.prefix + "mcavatar <minecraft username>");
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
                msg.reply("usage " + command.prefix + "mcskin <minecraft username>");
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