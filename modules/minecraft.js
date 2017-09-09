/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

let utils = require('../lib/utils');

let now = require("performance-now");

let mcping = require('mc-ping-updated');

class minecraft {
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
    this.perms = e.perms;
  }

  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands() {
    return [{
      triggers: ["mcping"],
      permissionCheck: this.perms.genCheckCommand("minecraft.mcping"),
      channels: ["*"],
      execute: command => {
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
        let t1 = now();
        mcping(address, port, (err, res) => {
          if (err) {
            console.error(err);
            command.createMessageAutoDeny("```xl\n" + err + "```")
          }
          else {
            let description = res.description;
            command.createMessage({
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
                  name: "Protocol",
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
      },
    }, {
      triggers: ["mcavatar"],
      permissionCheck: this.perms.genCheckCommand("minecraft.mcavatar"),
      channels: ["*"],
      execute: command => {
        if (command.args.length < 1) {
          command.reply("usage `" + command.prefix + "mcavatar <minecraft username>`");
          return true;
        }
        command.createMessageAutoDeny({
          embed: {
            title: `Avatar of ${utils.clean(command.args[0])}`,
            thumbnail: {url: `https://mcapi.ca/avatar/2d/${command.args[0]}/100/${((command.flags.includes("b")) ? "false" : "true")}`},
          }
        });
        return true;
      },
    }, {
      triggers: ["mcskin"],
      permissionCheck: this.perms.genCheckCommand("minecraft.mcskin"),
      channels: ["*"],
      execute: command => {
        if (command.args.length < 1) {
          command.reply("usage `" + command.prefix + "mcskin <minecraft username>`");
          return true;
        }
        command.createMessageAutoDeny({
          embed: {
            title: `Skin of ${utils.clean(command.args[0])}`,
            thumbnail: {url: `https://visage.surgeplay.com/full/404/${command.args[0]}.png`},
          }
        });
        return true;
      },
    }, {
      triggers: ["mcwiki"],
      permissionCheck: this.perms.genCheckCommand("minecraft.mcwiki"),
      channels: ["*"],
      execute: command => {
        return utils.mediaWikiSearch("http://minecraft.gamepedia.com/api.php", command.args.join(" ")).then(result => {
          if (result.length < 4 || result[3].length < 1) {
            return command.replyAutoDeny("Not enough results.")
          } else {
            return command.replyAutoDeny(`${result[3][0]}${result.length > 1 ? `\n\n**Also see**:\n${result[3].slice(1, Math.min(result.length, 3)).map(r => `<${r}>`).join("\n")}` : ""}`);
          }
        })
      },
    }];
  }
}

module.exports = minecraft;