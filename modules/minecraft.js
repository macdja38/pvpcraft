/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

const utils = require('../lib/utils');

let now = require("performance-now");

const filters = [/There are \d+(?:\/\d+)? out of maximum/, /CONSOLE issued server command: \/list/];

let mcping = require('mc-ping-updated');
const mcapi = require("minecraft-jsonapi");

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
    this.configDB = e.configDB;
    this.client = e.client;
    this.perms = e.perms;
    this.messageSender = e.messageSender;
  }

  async minecraftMessage(mcauth, messages) {
    if (messages.result === "success") {
      let message = messages.success;
      let channel = this.client.getChannel(mcauth[messages.source]);
      if (!channel) return;
      if (messages.source === "console") {
        if (filters.reduce((accum, filter) => accum || filter.test(message.line), false)) return;
        const description = `\`\`\`${utils.clean(message.line.slice(0, 1800))}\`\`\``;
        this.messageSender.sendQueuedMessage(channel, description, {
          author_name: this.client.user.username,
          author_icon: this.client.user.avatarURL,
          attachments:
            [{text: description, ts: new Date(message.time * 1000).getTime() / 1000}],
        });
      } else if (messages.source === "chat") {
        let webhook = await minecraft._getWebhook(this.client, channel);
        if (!webhook) return;
        this.client.executeWebhook(webhook.id, webhook.token, {
          username: message.player,
          avatarURL: `https://mcapi.ca/avatar/2d/${message.player}/100/`,
          embeds:
            [{description: `${utils.clean(message.message)}`, timestamp: new Date(message.time * 1000).toISOString()}],
        })
      }
    }
  }

  /**
   * Fetches a webhook for a channel
   * @param {Eris} client
   * @param {GuildChannel | string} channel Channel or webhook to fetch webhook for, in the case of a string
   * webhook being passed it it will return an object with that webhooks id and token as properties.
   * If a channel is passed it in will create or find a webhook, or reject with "Insufficient permissions to create a webhook" if that's  the case.
   * @returns {Promise<Object<{id: string, token: string}>>}
   * @fails {Promise<"Insufficient permissions to create a webhook">}
   * @private
   */
  static async _getWebhook(client, channel) {
    if (!channel.permissionsOf(client.user.id).has("manageWebhooks")) {
      throw "Insufficient permissions to create a webhook";
    }
    let existingHooks = await channel.getWebhooks();
    if (existingHooks && existingHooks.length > 0) {
      return existingHooks[0];
    }
    return channel.createWebhook({name: client.user.username, avatar: client.user.avatar});
  }

  onReady() {
    let authData = Object.values(this.configDB.data)
      .filter(data => data.hasOwnProperty("mcauth"))
      .map(data => data.mcauth)
      .filter(mcauth => mcauth.hasOwnProperty("chat") || mcauth.hasOwnProperty("console"));
    this.minecraftConnections = authData.map(mcauth => {
      console.log(mcauth);
      let request = mcapi.createRequest();
      if (mcauth.hasOwnProperty("chat")) {
        console.log("adding chat");
        request = request.add("chat", [])
      }
      if (mcauth.hasOwnProperty("console")) {
        console.log("adding console");
        request = request.add("console", [])
      }
      return request.follow(mcauth, this.minecraftMessage.bind(this, mcauth));
    })
  }

  onDisconnect() {
    this.minecraftConnections.forEach(con => con.close());
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
                  inline: true,
                }, {
                  name: "Version",
                  value: `${res.version.name}`,
                  inline: true,
                }, {
                  name: "Protocol",
                  value: `${res.version.protocol}`,
                  inline: true,
                }, {
                  name: "Players",
                  value: `${res.players.online}/${res.players.max}`,
                  inline: true,
                }, {
                  name: "Description",
                  value: description.text === '' ? description.extra.map(e => e.text).join("") : description.text,
                  inline: true,
                }],
              },
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
          },
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
          },
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
    }, {
      triggers: ["mcauth"],
      permissionCheck: this.perms.genCheckCommand("admin.minecraft.mcauth"),
      channels: ["guild"],
      usage: "mc",
      execute: command => {
        if (!(command.options.hasOwnProperty("username") && command.options.hasOwnProperty("password"))) {
          return command.replyAutoDeny("Please supply a username and password via `--username <username>` and `--password <password>`")
        }
        if (!command.options.hasOwnProperty("host")) {
          return command.replyAutoDeny("Please supply a host address via `--host <host>");
        }
        const options = {
          https: command.options.https === "true",
          host: command.options.host,
          port: command.options.port !== "none" ? "" : parseInt(command.options.port, 10) || 25565,
          username: command.options.username,
          password: command.options.password,
        };
        console.log(options);
        return mcapi.createRequest().add("server.version").dispatch(options).then((result) => {
          if (result.length > 0 && result[0].result === "success") {
            return this.configDB.set("mcauth", options, {server: command.channel.guild.id}).then(() => {
              return command.replyAutoDeny("Connection successfully made, saving configuration to database");
            });
          } else {
            return command.replyAutoDeny("Connection un-successful, result is ", result)
          }
        })
      },
    }, {
      triggers: ["mcsay"],
      permissionCheck: this.perms.genCheckCommand("minecraft.mcsay"),
      channels: ["guild"],
      usage: "mc",
      execute: async command => {
        const options = await this.configDB.get("mcauth", false, {server: command.channel.guild.id});
        if (!options || !options.hasOwnProperty("host")) {
          return command.replyAutoDeny(`Please use ${command.prefix}mcauth to configure connection.`)
        }
        return mcapi.createRequest()
          .add("chat.with_name", [command.args.join(" ").replace(/^\/*/g, ""), `discord:${command.member.nick || command.member.username}`])
          .dispatch(options);
      },
    }, {
      triggers: ["mcchat", "mchat"],
      permissionCheck: this.perms.genCheckCommand("minecraft.mcchat"),
      channels: ["guild"],
      usage: "mc",
      execute: async command => {
        const options = await this.configDB.get("mcauth", false, {server: command.channel.guild.id});
        if (!options || !options.hasOwnProperty("host")) {
          return command.replyAutoDeny(`Please use ${command.prefix}mcauth to configure connection.`)
        }
        let number = command.args.length > 0 ? parseInt(command.args[0]) : 5;
        return mcapi.createRequest()
          .add("streams.chat.latest", [number])
          .dispatch(options)
          .then((result) => {
            if (result[0].result === "success") {
              let messages = result[0].success;
              return command.replyAutoDeny(`\n${messages.map(message => `${utils.clean(message.player)}:${utils.clean(message.message)}`).join("\n")}`);
            } else {
              let error = result;
              try {
                error = JSON.stringify(result, null, "  ");
              } catch (error) {
              }
              throw error;
            }
          });
      },
    }, {
      triggers: ["mcbindchat"],
      permissionCheck: this.perms.genCheckCommand("admin.minecraft.bindchat"),
      channels: ["guild"],
      usage: "mc",
      execute: async command => {
        const currentConfig = this.configDB.get("mcauth", {}, {server: command.channel.guild.id});
        currentConfig.chat = command.channel.id;
        this.configDB.set("mcauth", currentConfig, {server: command.channel.guild.id});
        command.replyAutoDeny("Config updated, please wait up to 24h for config to take effect.")
      },
    }, {
      triggers: ["mcbindconsole"],
      permissionCheck: this.perms.genCheckCommand("admin.minecraft.bindconsole"),
      channels: ["guild"],
      usage: "mc",
      execute: async command => {
        const currentConfig = this.configDB.get("mcauth", {}, {server: command.channel.guild.id});
        currentConfig.console = command.channel.id;
        this.configDB.set("mcauth", currentConfig, {server: command.channel.guild.id});
        command.replyAutoDeny("Config updated, please wait up to 24h for config to take effect.")
      },
    }];
  }
}

module.exports = minecraft;