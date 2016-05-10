/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

var now = require("performance-now");

var mcping = require('mc-ping-updated');

var streamBuffers = require('stream-buffers');

var myReadableStreamBuffer = new streamBuffers.ReadableStreamBuffer({
    frequency: 10,       // in milliseconds.
    chunkSize: 2048     // in bytes.
});

module.exports = class template {
    constructor(cl) {
        this.client = cl;
    }

    getCommands() {
        return ["mcping", "mcavatar"];
    }

    onCommand(msg, command, perms, l) {
        console.log("Minecraft initiated");
        var t1 = now();
        if (command.command === "mcping" && perms.check(msg, "minecraft.mcping")) {
            mcping(command.arguments.join("."), "25565", (err, res)=> {
                if (err) {
                    console.error(err);
                    this.client.sendMessage(msg.channel, "```xl\n" + err + "```")
                }
                else {
                    console.log(res);
                    console.log(res.favicon.split(",")[1]);
                    myReadableStreamBuffer.put(res.favicon.split(",")[1]);
                    myReadableStreamBuffer.stop();
                    console.log(myReadableStreamBuffer);
                    this.client.sendMessage(msg.channel, "```xl\n" +
                        "Pinged " + command.arguments.join(".") + " in " + (now() - t1) + "ms\n" +
                        "Version " + res.version.name + " protocol " + res.version.protocol + "\n" +
                        "Players " + res.players.online + "/" + res.players.max + "```"
                    )

                }
            }, 3000);
            return true;
        }

        if (command.command === "mcavatar" && perms.check(msg, "minecraft.mcavatar")) {
            if(command.arguments.length < 1) {
                msg.reply("usage " + command.prefix + "mcavatar <minecraft username>")
                return true;
            }
            msg.channel.sendMessage({file:{file:"https://mcapi.ca/avatar/2d/" + command.arguments[0] + "/100/true", name: command.arguments[0] + ".png"}})
            return true;
        }
        return false;
    }
};