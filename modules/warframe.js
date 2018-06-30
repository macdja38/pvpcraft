/**
 * Created by macdja38 on 2016-04-17.
 */
"use strict";

const parseState = require('../lib/parseState');

const utils = require('../lib/utils');

const WorldState = require("../lib/WorldState");

const BaseDB = require("../lib/BaseDB");

let master;
if (process.env.id == 0 || process.env.dev) {
  master = true;
}

const request = require('request');

// const DBEventState = require('../lib/dbEventState');

class Warframe {
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
    // this.dbEvents = new DBEventState(e);
    //noinspection JSUnresolvedVariable
    this.client = e.client;
    //noinspection JSUnresolvedVariable
    this.config = e.configDB;
    //noinspection JSUnresolvedVariable
    this.raven = e.raven;
    this.perms = e.perms;
    //noinspection JSUnresolvedVariable
    this.worldState = new WorldState(e.r, master ? 30000 : false);
    this.r = e.r;
    this.alerts = [];
    this.rebuildAlerts = this.rebuildAlerts.bind(this);
    this.alertsDB = new BaseDB(this.r);
    this.dbReady = this.alertsDB.ensureTable("worldState");
  }

  stopWarframeTracking() {
    if (this.cursor) {
      this.cursor.close();
      this.cursor = false;
    }
  }

  startWarframeTracking() {
    this.dbReady.then(() => {
      this.r.table('worldState').changes().run((err, cursor) => {
        if (err) {
          console.error(err);
          return;
        }
        this.cursor = cursor;
        cursor.each((err, newState) => {
          try {
            this.onNewState(newState);
          } catch (error) {
            console.error(error);
          }
        });
      })
    });
  }

  /**
   * Called when the world state changes
   * @param {Object} state
   * @param {Object} state.new_val
   * @param {Array<Object>} state.new_val.Alerts
   * @param {Object} state.old_val
   * @param {Array<Object>} state.old_val.Alerts
   */
  onNewState(state) {
    if (state.new_val && state.old_val && state.new_val.Alerts && state.old_val.Alerts) {
      const oldAlertIds = state.old_val.Alerts.map(a => a._id.$oid);
      const newAlerts = state.new_val.Alerts;

      for (let alert of newAlerts) {
        if (!oldAlertIds.includes(alert._id.$oid)) {
          this.onAlert(alert, state.new_val.id, state.new_val);
        }
      }
    }
  }

  onAlert(alert, platform, state) {

    let {embed, itemString} = parseState.buildAlertEmbed(alert, platform, state);
    this.alerts.forEach((server, i) => setTimeout(() => {
      try {
        let guildID = this.client.channelGuildMap[server.channel];
        let guild = this.client.guilds.get(guildID);
        if (!guild) return;
        if (platform !== this.getGuildPlatform(guild)) return;
        let channel = guild.channels.get(server.channel);
        if (!channel || server.tracking !== true) return;
        if (channel.type !== 0) return; // return if it's a voice channel
        let things = [];
        let madeMentionable = [];
        for (let thing in server.items) {
          if (server.items.hasOwnProperty(thing) && guild.roles.get(server.items[thing])) {
            if (itemString && itemString.toLowerCase().indexOf(thing) > -1 && channel.guild.roles.get(server.items[thing])) {
              things.push(server.items[thing]);
              madeMentionable.push(guild.editRole(server.items[thing], {
                mentionable: true,
              }));
            }
          }
        }
        let sendAlert = () => {
          return this.client.createMessage(channel.id, {
            content: `${things.map((thing) => `<@&${thing}>`)}`,
            embed,
          });
        };
        let makeUnmentionable = () => {
          for (let thing in things) {
            if (things.hasOwnProperty(thing)) {
              let role = guild.roles.get(things[thing]);
              if (role) {
                guild.editRole(role.id, {
                  mentionable: false,
                }).catch(() => {
                });
              }
            }
          }
        };
        Promise.all(madeMentionable).then(() => {
          sendAlert().then(makeUnmentionable).catch(console.error);
        }).catch((error) => {
          this.client.createMessage(channel.id, "Unable to make role mentionable, please contact @```Macdja38#7770 for help after making sure the bot has sufficient permissions" + error).catch(console.error);
          sendAlert().then(makeUnmentionable).catch(console.error);
        });
      } catch (error) {
        console.error(error);
        if (this.raven) {
          this.raven.captureException(error);
        }
      }
    }, i * 5000));
  }

  rebuildAlerts() {
    this.alerts = [];
    for (let item in this.config.data) {
      if (this.config.data.hasOwnProperty(item) && this.config.data[item].hasOwnProperty("warframeAlerts")) {
        if (this.client.channelGuildMap.hasOwnProperty(this.config.data[item]["warframeAlerts"].channel)) {
          this.alerts.push(this.config.data[item].warframeAlerts);
        } else {
          //TODO: notify the server owner their mod alerts channel has been removed and that //setalerts false will make that permanent.
        }
      }
    }
  }

  onReady() {
    this.rebuildAlerts();
    if (this.cursor) {
      this.stopWarframeTracking()
    }
    this.startWarframeTracking();
  }

  onDisconnect() {
    this.stopWarframeTracking()
  }

  onGuildCreate() {
    this.rebuildAlerts();
  }

  getGuildPlatform(guild) {
      return this.config.get("warframeAlerts",
        {
          platform: "pc",
        }, {
          server: guild.id,
        },
      ).platform || "pc";
  }

  getCommandPlatform(command) {
    if (!command.guild) return "pc";
    return this.getGuildPlatform(command.channel.guild);
  }

  getPlatformDependantWorldState(command) {
    return this.worldState.get(this.getCommandPlatform(command));
  }

  //noinspection JSUnusedGlobalSymbols,JSMethodCanBeStatic
  /**
   * Optional function that will be called with every message for the purpose of misc responses / other
   * @param {Message} msg
   * @returns {boolean | Promise}
   */
  checkMisc(msg) {
    if (msg.content.toLowerCase().indexOf("soon") === 0 && msg.content.indexOf(":tm:") < 0 && this.perms.check(msg, "warframe.misc.soon")) {
      msg.channel.createMessage("Soon:tm:").catch(this.perms.getAutoDeny(msg));
      return true;
    }
    return false;
  }

  /**
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent() {
    return {
      name: "Warframe",
      description: "Commands involving the game warframe",
      key: "warframe",
      permNode: "warframe",
      commands: this.getCommands(),
    };
  }

  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands() {
    return [{
      triggers: ["deal", "darvo"],
      permissionCheck: this.perms.genCheckCommand("warframe.deal"),
      channels: ["*"],
      execute: command => {
        return this.getPlatformDependantWorldState(command).then((state) => {
          command.createMessageAutoDeny("```haskell\n" + "Darvo is selling " +
            parseState.getName(state.DailyDeals[0].StoreItem) +
            " for " + state.DailyDeals[0].SalePrice +
            "p (" +
            state.DailyDeals[0].Discount + "% off, " + (state.DailyDeals[0].AmountTotal - state.DailyDeals[0].AmountSold) +
            "/" + state.DailyDeals[0].AmountTotal + " left, refreshing in " + parseState.toTimeDifference(state, state.DailyDeals[0].Expiry) +
            ")" +
            "\n```");
        });
      },
    }, {
      triggers: ["alert", "alerts"],
      permissionCheck: this.perms.genCheckCommand("warframe.alert"),
      channels: ["*"],
      execute: command => {
        const platform = this.getCommandPlatform(command);
        return this.getPlatformDependantWorldState(command).then((state) => {
          if (state.Alerts) {
            for (let alert of state.Alerts) {
              let { embed } = parseState.buildAlertEmbed(alert, platform, state);
              command.createMessageAutoDeny({ embed });
            }
          }
        });
      },
      subCommands: [
        {
          triggers: ["list"],
          permissionCheck: this.perms.genCheckCommand("warframe.alerts.list"),
          channels: ["guild"],
          execute: command => {
            let roles = this.config.get("warframeAlerts", { items: {} }, { server: command.channel.guild.id }).items;
            let coloredRolesList = "";
            for (let role in roles) {
              if (roles.hasOwnProperty(role) && role !== "joinrole") {
                coloredRolesList += `${role}\n`;
              }
            }
            if (coloredRolesList !== "") {
              command.createMessageAutoDeny(`Available alerts include \`\`\`xl\n${coloredRolesList}\`\`\``)
            } else {
              command.replyAutoDeny(`No alerts are being tracked.`)
            }
            return true;
          },
        },
        {
          triggers: ["join"],
          permissionCheck: this.perms.genCheckCommand("warframe.alerts.join"),
          channels: ["guild"],
          execute: command => {
            let roles = this.config.get("warframeAlerts", { items: {} }, { server: command.channel.guild.id }).items;
            if (!command.args[0] || !roles[command.args[0]]) {
              command.replyAutoDeny(`Please supply an item to join using \`${command.prefix}alert join \<rank\>\`, for a list of items use \`${command.prefix}alert list\``);
              return true;
            }
            let rankToJoin = command.args[0].toLowerCase();
            let role = command.channel.guild.roles.get(roles[rankToJoin]);
            if (role) {
              command.channel.guild.addMemberRole(command.author.id, role.id).catch((error) => {
                command.replyAutoDeny(`Error ${error} promoting ${utils.removeBlocks(command.author.username)} try redefining your rank and making sure the bot has enough permissions.`)
              }).then(() => {
                command.replyAutoDeny(":thumbsup::skin-tone-2:");
              })
            } else {
              command.replyAutoDeny(`Role could not be found, have an administrator use \`${command.prefix}tracking --add <item>\` to add it.`);
            }
            return true;
          },
        },
        {
          triggers: ["leave"],
          permissionCheck: this.perms.genCheckCommand("warframe.alerts.leave"),
          channels: ["guild"],
          execute: command => {
            let roles = this.config.get("warframeAlerts", { items: {} }, { server: command.channel.guild.id }).items;
            if (!command.args[0] || !roles[command.args[0]]) {
              command.replyAutoDeny(`Please supply a rank to leave using \`${command.prefix}alerts leave \<rank\>\`, for a list of items use \`${command.prefix}alerts list\``);
              return true;
            }
            let role = command.channel.guild.roles.get(roles[command.args[0]]);
            if (role) {
              command.channel.guild.removeMemberRole(command.author.id, role.id).catch((error) => {
                command.replyAutoDeny(`Error ${error} demoting ${utils.removeBlocks(command.author.username)} try redefining your rank and making sure the bot has enough permissions.`)
              }).then(() => {
                command.replyAutoDeny(":thumbsup::skin-tone-2:");
              })
            } else {
              command.reply(`Role could not be found, have an administrator use \`${command.prefix}alerts add <item>\` to add it.`);
              return true;
            }
            return true;
          },
        },
        {
          triggers: ["enable", "disable"],
          permissionCheck: this.perms.genCheckCommand("admin.warframe.alerts"),
          channels: ["guild"],
          execute: command => {
            let config = this.config.get("warframeAlerts",
              {
                "tracking": true,
                "channel": "",
                "items": {},
              }, {
                server: command.channel.guild.id,
              },
            );
            if (command.options.platform) {
              if (Object.keys(this.worldState.getEnabledStates()).includes(command.options.platform)) {
                config.platform = command.options.platform;
              } else {
                return command.replyAutoDeny(`Invalid platform provided, please try one of the following ${Object.keys(this.worldState.getEnabledStates()).join(", ")}`)
              }
            }
            config.tracking = command.command === "enable";
            if (command.channel) {
              config.channel = command.channel.id;
            } else {
              config.channel = command.channel.id;
            }
            if (!config.items) {
              config.items = {};
            }
            this.config.set("warframeAlerts", config, { server: command.channel.guild.id });
            this.rebuildAlerts();
            command.replyAutoDeny(":thumbsup::skin-tone-2:");
            return true;
          },
        },
        {
          triggers: ["add"],
          permissionCheck: this.perms.genCheckCommand("admin.warframe.alerts"),
          channels: ["guild"],
          execute: command => {
            if (command.args[0]) {
              let config = this.config.get("warframeAlerts",
                {
                  "tracking": false,
                  "channel": "",
                  "items": {},
                }
                , { server: command.channel.guild.id });
              if (typeof(config.tracking) !== "boolean") {
                config.tracking = false;
              }
              if (!config.items) {
                config.items = {};
              }
              if (config.items.hasOwnProperty(command.args[0].toLowerCase())) {
                command.createMessageAutoDeny(`${command.author.mention}, Resource is already being tracked, use \`${command.prefix}alert join ${utils.clean(command.args[0])}\` to join it.`);
                return;
              }
              let options = {
                name: command.args[0].toLowerCase(),
                permissions: 0,
                mentionable: false,
              };
              command.channel.guild.createRole(options).then((role) => {
                config.items[role.name] = role.id;
                this.config.set("warframeAlerts", config, { server: command.channel.guild.id });
                command.replyAutoDeny(`Created role ${utils.clean(role.name)} with id ${role.id}`);
              }).catch((error) => {
                if (error.code === 50013) {
                  command.replyAutoDeny("Error, insufficient permissions, please give me manage roles.");
                }
                else {
                  command.replyAutoDeny(`Unexpected error \`${error}\` please report the issue https://invite.pvpcraft.ca/`);
                  console.dir(error, { depth: 2, color: true });
                }
              });
              return true;
            }
            command.replyAutoDeny("invalid option's please specify the name of a resource to track to change tracking options");
            return true;
          },
        },
        {
          triggers: ["remove"],
          permissionCheck: this.perms.genCheckCommand("admin.warframe.alerts"),
          channels: ["guild"],
          execute: command => {
            if (command.args[0]) {
              let config = this.config.get("warframeAlerts",
                {
                  "tracking": false,
                  "channel": "",
                  "items": {},
                }
                , { server: command.channel.guild.id });
              if (typeof(config.tracking) !== "boolean") {
                config.tracking = false;
              }
              if (!config.items) {
                config.items = {};
              }
              if (!config.items.hasOwnProperty(command.args[0])) {
                command.reply(`Resource is not being tracked, use \`${command.prefix}alert add ${utils.clean(command.args[0])}\` to add it.`);
                return true;
              }
              let roleName = command.args[0].toLowerCase();
              let role = command.channel.guild.roles.find(r => r.name.toLowerCase() === roleName);
              if (role) {
                command.channel.guild.deleteRole(role.id).then(() => {
                  delete config.items[command.args[0]];
                  this.config.set("warframeAlerts", config, { server: command.channel.guild.id, conflict: "replace" });
                  command.replyAutoDeny("Deleted role " + utils.clean(command.args[0]) + " with id `" + role.id + "`");
                }).catch((error) => {
                  if (error) {
                    if (error.status === 403) {
                      command.replyAutoDeny("Error, insufficient permissions, please give me manage roles.");
                    }
                    else {
                      command.replyAutoDeny("Unexpected error please report the issue https://pvpcraft.ca/pvpbot");
                      console.log(error);
                      console.log(error.stack);
                    }
                  }
                });
                return true;
              } else {
                delete config.items[command.args[0]];
                this.config.set("warframeAlerts", config, { server: command.channel.guild.id, conflict: "replace" });
                command.replyAutoDeny("Role not found, removed " + utils.clean(command.args[0]) + " from list.");
                return true;
              }
            }
            command.replyAutoDeny("Invalid option's please specify the name of a resource to track to change tracking options");
            return true;
          },
        },
      ],
    }, {
      triggers: ["trader", "voidtrader", "baro"],
      permissionCheck: this.perms.genCheckCommand("warframe.trader"),
      channels: ["*"],
      execute: command => {
        return this.getPlatformDependantWorldState(command).then((state) => {
          if (!state.VoidTraders || !state.VoidTraders[0]) {
            command.createMessageAutoDeny("Baro has disappeared from the universe.");
            return true;
          }
          if (state.VoidTraders[0].Manifest) {
            let rep = "```haskell\nBaro leaving " + state.VoidTraders[0].Node + " in " +
              utils.secondsToTime(state.VoidTraders[0].Expiry.$date.$numberLong / 1000 - state.Time) + "\n";
            for (let item of state.VoidTraders[0].Manifest) {
              rep += "item: " + parseState.getName(item.ItemType) + " - price:" + item.PrimePrice + " ducats " + item.RegularPrice + "cr\n";
            }
            rep += "```";
            command.createMessageAutoDeny(rep);
          }
          else {
            command.createMessageAutoDeny("```haskell\nBaro appearing at " + state.VoidTraders[0].Node + " in " +
              parseState.toTimeDifference(state, state.VoidTraders[0].Activation) + "\n```");
          }
        });
      },
    }, {
      triggers: ["trial", "raid", "trailstart"],
      permissionCheck: this.perms.genCheckCommand("warframe.trial"),
      channels: ["*"],
      execute: command => {
        if (command.args.length < 1) {
          command.createMessageAutoDeny(
            "Hek: \<http://tinyurl.com/qb752oj\> Nightmare: \<http://tinyurl.com/p8og6xf\> Jordas: \<http://tinyurl.com/prpebzh\>");
          return true;
        }
        if (command.args[0].toLowerCase() === "help") {
          command.reply(`\`${command.prefix}${command.command} <jv | lor> <username>\``);
          return true;
        }
        if (command.args.length < 2) {
          command.createMessageAutoDeny(
            `​http://wf.christx.tw/search.php?id=${utils.clean(command.args[0])}`);
          return true;
        }
        let place = command.args[0].toLowerCase();
        let link;
        if (place === "jv" || place === "jordasverdict") {
          link = `https://wf.christx.tw/JordasSearch.php?id=${command.args[1]}`;
        } else {
          link = `https://wf.christx.tw/search.php?id=${command.args[1]}`;
        }
        command.createMessageAutoDeny(link);
        return true;
      },
    }, {
      triggers: ["rift", "fissure"],
      permissionCheck: this.perms.genCheckCommand("warframe.rift"),
      channels: ["*"],
      execute: command => {
        return this.getPlatformDependantWorldState(command).then((state) => {
          if (state.ActiveMissions) {
            let string = "";
            for (let mission of state.ActiveMissions) {
              let node = parseState.getNode(mission.Node);
              if (node) {
                let nodeFaction = parseState.getFaction(node.faction);
                let nodeMission = parseState.getMissionType(node.mission_type);
                string += `\`\`\`xl\n${parseState.getTierName(mission.Modifier).name} (${mission.Modifier.slice(4)}) rift active on ${parseState.getNodeName(mission.Node)} (${nodeFaction} ${nodeMission}) for ${parseState.toTimeDifference(state, mission.Expiry)}\n\`\`\``;
              } else {
                string += `\`\`\`xl\n${parseState.getTierName(mission.Modifier).name} (${mission.Modifier.slice(4)}) rift active for ${utils.secondsToTime(mission.Expiry.sec - state.Time)}\n\`\`\``;
              }
            }
            command.createMessageAutoDeny(string);
          }
        });
      },
    }, {
      triggers: ["wiki"],
      permissionCheck: this.perms.genCheckCommand("warframe.wiki"),
      channels: ["*"],
      execute: command => {
        //use wikia's api to search for the item.
        if (command.args.length === 0) {
          command.createMessageAutoDeny("Please provide something to search for!");
          return true;
        }
        request.post("http://warframe.wikia.com/api/v1/Search/List", {
          form: {
            query: command.args.join(' '),
            limit: 1,
          },
        }, (err, response, body) => {
          if (err || response.statusCode === 404) {
            command.createMessageAutoDeny("Could not find **" + utils.clean(command.args.join(' ')) + "**");
          } else if (response.statusCode !== 200) {
            console.error(' returned HTTP status ' + response.statusCode);
          } else {
            try {
              command.createMessageAutoDeny(JSON.parse(body).items[0].url);
            } catch (e) {
              console.error('Invalid JSON from http://warframe.wikia.com/api/v1/Search/List while searching the wiki');
            }
          }
        });
        return true;
      },
    }, {
      triggers: ["sortie"],
      permissionCheck: this.perms.genCheckCommand("warframe.sortie"),
      channels: ["*"],
      execute: command => {
        return this.getPlatformDependantWorldState(command).then((state) => {
          if (state.Sorties.length > 0) {
            let sortie = state.Sorties[0];
            let fields = sortie.Variants.map(mission => {
              return {
                name: `  ${parseState.getNodeName(mission.node)} `,
                value: `  ${parseState.getMissionType(mission.missionType)} with ${parseState.getSortieModifier(mission.modifierType)} ‎`,
                inline: true,
              };
            });
            let embed = {
              title: `${(sortie.Boss || "").split("_").pop()} Sortie`,
              timestamp: parseState.toISOTime(sortie.Expiry),
              footer: {
                text: `Expires in ${parseState.toTimeDifference(state, sortie.Expiry)} which is on `,
              },
              fields,
            };
            command.createMessageAutoDeny({embed});
            return true;
          }
        });
      },
    }, {
      triggers: ["farm"],
      permissionCheck: this.perms.genCheckCommand("warframe.farm"),
      channels: ["*"],
      execute: command => {
        command.createMessageAutoDeny("You can probably find that resource here: \<https://steamcommunity.com/sharedfiles/filedetails/?id=181630751\>");
        return true;
      },
    }, {
      triggers: ["damage", "element"],
      permissionCheck: this.perms.genCheckCommand("warframe.damage"),
      channels: ["*"],
      execute: command => {
        command.createMessageAutoDeny("```haskell\nDamage 2.0: https://pvpcraft.ca/wfd2.png Thanks for image Telkhines\n```");
        return true;
      },
    }, {
      triggers: ["primeaccess", "access"],
      permissionCheck: this.perms.genCheckCommand("warframe.access"),
      channels: ["*"],
      execute: command => {
        return this.getPlatformDependantWorldState(command).then((state) => {
          let text = "```haskell\n";
          for (let event of state.Events) {
            if (event.Messages[0].Message.toLowerCase().indexOf("access") > -1) {
              text += event.Messages[0].Message.toUpperCase()
                + " since " + utils.secondsToTime(state.Time - event.Date.sec) + " ago\n";
            }
          }
          if (text !== "```haskell\n") {
            command.createMessageAutoDeny(text + "```")
          } else {
            this.client.createMessage("No prime access could be found");
          }
        });
      },
    }, {
      triggers: ["update"],
      permissionCheck: this.perms.genCheckCommand("warframe.update"),
      channels: ["*"],
      execute: command => {
        return this.getPlatformDependantWorldState(command).then((state) => {
          let fields = [];
          let embed = {
            title: "Warframe updates",
            fields,
          };
          let checks = ["update", "hotfix"];
          for (let event of state.Events) {
            for (let check of checks) {
              if (event.Messages[0].Message.toLowerCase().indexOf(check) > -1) {
                fields.push({
                  value: `[${event.Messages[0].Message.toLowerCase()}](${event.Prop}) Since ${parseState.toTimeDifferenceInPast(state, event.Date)} ago.`,
                  name: "\u00A0\u200A\u000B\u3000\uFEFF\u2004\u2000\u200E",
                  inline: false,
                });
                checks.slice(check);
                if (checks.length === 0) break;
              }
            }
          }
          command.createMessageAutoDeny({embed});
          return true;
        });
      },
    }, {
      triggers: ["armorstats", "armourstat", "armourstats", "armourstat"],
      permissionCheck: this.perms.genCheckCommand("warframe.armor"),
      channels: ["*"],
      execute: command => {
        if (command.args.length < 1 || command.args.length === 2 || command.args.length > 3) {
          command.createMessageAutoDeny("```haskell\npossible uses include:\n" +
            command.prefix + "armor (Base Armor) (Base Level) (Current Level) calculate armor and stats.\n" +
            command.prefix + "armor (Current Armor)\n```");
          return true;
        }
        let text = "```haskell\n";
        let armor;
        if (command.args.length === 3) {
          if ((parseInt(command.args[2]) - parseInt(command.args[1])) < 0) {
            command.createMessageAutoDeny("```haskell\nPlease check your input values\n```");
            return true;
          }
          armor = parseInt(command.args[0]) * (1 + (Math.pow((parseInt(command.args[2]) - parseInt(command.args[1])), 1.75) / 200));
          text += "at level " + command.args[2] + " your enemy would have " + armor + " Armor\n";
        }
        else {
          armor = parseInt(command.args[0]);
        }
        text += armor / (armor + 300) * 100 + "% damage reduction\n";
        command.createMessageAutoDeny(text + "```");
        return true;

      },
    }];
  }
}

module.exports = Warframe;