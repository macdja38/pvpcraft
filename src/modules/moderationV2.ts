/**
 * Created by macdja38 on 2016-08-23.
 */

import utils from "../lib/utils";
import { ModuleOptions } from "../types/lib";
import PvPCraft from "../PvPCraft";
import Eris, { TextChannel } from "eris";
import util from "util";
import EE from "eris-errors";
import MessageSender from "../lib/MessageSender";
import { translateType, translateTypeCreator } from "../types/translate";
import Config from "../lib/Config";
import ConfigDB from "../lib/ConfigDB";
import SlowSender from "../lib/SlowSender";
import Feeds from "../lib/feeds";
import Permissions from "../lib/Permissions";

import * as Sentry from "@sentry/node";
import Command, { GuildCommand } from "../lib/Command/Command";
import Utils from "../lib/utils";
import TaskQueue from "../lib/TaskQueue";

const colors = require('colors');

interface SlackWebhookField {
  title: string;
  value: string;
  short: boolean;
}

interface SlackWebhookBody {
  title?: string;
  ts?: number,
  color?: string;
  author_name?: string;
  author_icon?: string;
  fields?: SlackWebhookField[];
  image_url?: string;
  thumb_url?: string;
}

interface SendHookMessageOptions {
  user?: { id: string, username?: string, user: Eris.User } | Eris.Member | Eris.User;
  overrideRoot?: string;
  username?: string;
  icon_url?: string;
}

const moderationMethodNameMap = {
  ban: "memberBanned" as const,
  unban: "memberUnbanned" as const,
  kick: "memberRemoved" as const,
};

const presenceUpdateEmojis = {
  IDLE: "🌙",
  DND: "⛔",
  ONLINE: "🟢",
  OFFLINE: "🔳",
  UNKNOWN: "?",
};

function emojifyPresenceStatus(presenceStatus: string) {
  const upperCasePresence = presenceStatus.toUpperCase();
  if (presenceUpdateEmojis.hasOwnProperty(upperCasePresence)) {
    // @ts-ignore
    return `${presenceUpdateEmojis[upperCasePresence]} ${presenceStatus}`;
  } else {
    return presenceStatus;
  }
}

/* let colorMap = {
 "message.deleted": "#FFB600",
 "message.updated": "#FFFF00",
 "channel.created": "#CC0000",
 "channel.updated": "#CC0000",
 "channel.deleted": "#CC0000",
 "voice.join": "#14D5E2",
 "voice.leave": "#14D5E2",
 "user": "#111180",
 "member.updated": "#111180",
 "member.added": "#A400A4",
 "member.removed": "#A400A4",
 "member.banned": "#A400A4",
 "member.unbanned": "#A400A4",
 "server.updated": "#FF0000",
 "role.created": "#FF0000",
 "role.updated": "#FF0000",
 "role.deleted": "#FF0000",
 "action.kick": "#04ff00",
 "action.ban": "#009966",
 "action.unban": "#009966"
 }; */

// 00 3F 7F BE FF

const colorMap = {
  "voice.join": "#003FE2",
  "voice.switch": "#007FE2",
  "voice.leave": "#00BEE2",
  "message.deleted": "#3F0000",
  "message.updated": "#3F7F00",
  "member.updated": "#3F7F00",
  "member.added": "#7FFF00",
  "member.removed": "#7F3F00",
  "member.banned": "#7F0000",
  "member.unbanned": "#7FBE00",
  "user": "#117F00",
  "presence": "#487f2f",
  "channel.created": "#BEFF00",
  "channel.updated": "#BE7F00",
  "channel.deleted": "#BE0000",
  "role.created": "#FFFF00",
  "role.updated": "#FF7F00",
  "role.deleted": "#FF0000",
  "server.updated": "#FF7F00",
  "action.kick": "#BE3F3F",
  "action.ban": "#BE003F",
  "action.unban": "#BEBE3F",
  "moderation.action.kick": "#BE3F3F",
  "moderation.action.ban": "#BE003F",
  "moderation.action.unban": "#BEBE3F",
  "moderation.action.mute": "#BE3F3F", // TODO: Calculate Color
};

export class moderationV2 {
  private client: Eris.Client;
  private pvpcraft: PvPCraft;
  private messageSender: MessageSender;
  private i10010n: translateTypeCreator;
  private config: Config;
  private perms: Permissions;
  private configDB: ConfigDB;
  private feeds: Feeds;
  private tempServerIgnores: { [key: string]: number | undefined };
  private _slowSender: SlowSender;
  private taskQueue: TaskQueue;

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
   * @param {PvPCraft} e.pvpcraft PvPCraft instance
   * @param {TaskQueue} e.taskQueue Instantiated task queue ready to receive orders.
   * @param {Function} e.i10010n internationalization function
   */
  constructor(e: ModuleOptions) {
    this.client = e.client;
    this.pvpcraft = e.pvpcraft;
    //this.logging = {};
    this.messageSender = e.messageSender;
    this.i10010n = e.i10010n;
    this.config = e.config;
    this.perms = e.perms;
    this.configDB = e.configDB;
    this.feeds = e.feeds;
    this.tempServerIgnores = {};
    this._slowSender = e.slowSender;
    this.taskQueue = e.taskQueue;
    this.messageDeleted = this.tryAndLog(this.messageDeleted);
    this.messageDeletedBulk = this.tryAndLog(this.messageDeletedBulk);
    this.messageUpdated = this.tryAndLog(this.messageUpdated);
    this.channelCreated = this.tryAndLog(this.channelCreated);
    this.channelUpdated = this.tryAndLog(this.channelUpdated);
    this.channelDeleted = this.tryAndLog(this.channelDeleted);
    this.roleCreated = this.tryAndLog(this.roleCreated);
    this.roleUpdated = this.tryAndLog(this.roleUpdated);
    this.roleDeleted = this.tryAndLog(this.roleDeleted);
    this.memberUpdated = this.tryAndLog(this.memberUpdated);
    this.memberAdded = this.tryAndLog(this.memberAdded);
    this.memberRemoved = this.tryAndLog(this.memberRemoved);
    this.memberUnbanned = this.tryAndLog(this.memberUnbanned);
    this.memberBanned = this.tryAndLog(this.memberBanned);
    this.userUpdate = this.tryAndLog(this.userUpdate);
    this.presence = this.presence.bind(this);
    this.voiceJoin = this.tryAndLog(this.voiceJoin);
    this.voiceSwitch = this.tryAndLog(this.voiceSwitch);
    this.voiceLeave = this.tryAndLog(this.voiceLeave);
  }

  onReady() {
    //this.refreshMap();
    this.client.on("messageDelete", this.messageDeleted);
    this.client.on("messageDeleteBulk", this.messageDeletedBulk);
    this.client.on("messageUpdate", this.messageUpdated);
    this.client.on("channelCreate", this.channelCreated);
    this.client.on("channelUpdate", this.channelUpdated);
    this.client.on("channelDelete", this.channelDeleted);
    this.client.on("guildRoleCreate", this.roleCreated);
    this.client.on("guildRoleUpdate", this.roleUpdated);
    this.client.on("guildRoleDelete", this.roleDeleted);
    this.client.on("guildMemberUpdate", this.memberUpdated);
    this.client.on("guildMemberAdd", this.memberAdded);
    this.client.on("guildMemberRemove", this.memberRemoved);
    this.client.on("guildBanRemove", this.memberUnbanned);
    this.client.on("guildBanAdd", this.memberBanned);
    this.client.on("userUpdate", this.userUpdate);
    this.client.on("presenceUpdate", this.presence);
    this.client.on("voiceChannelJoin", this.voiceJoin);
    this.client.on("voiceChannelSwitch", this.voiceSwitch);
    this.client.on("voiceChannelLeave", this.voiceLeave);
    this._slowSender.onReady();
  }

  onDisconnect() {
    this.client.removeListener("messageDelete", this.messageDeleted);
    this.client.removeListener("messageDeleteBulk", this.messageDeletedBulk);
    this.client.removeListener("messageUpdate", this.messageUpdated);
    this.client.removeListener("channelCreate", this.channelCreated);
    this.client.removeListener("channelUpdate", this.channelUpdated);
    this.client.removeListener("channelDelete", this.channelDeleted);
    this.client.removeListener("guildRoleUpdate", this.roleUpdated);
    this.client.removeListener("guildMemberUpdate", this.memberUpdated);
    this.client.removeListener("guildMemberAdd", this.memberAdded);
    this.client.removeListener("guildMemberRemove", this.memberRemoved);
    this.client.removeListener("guildBanRemove", this.memberUnbanned);
    this.client.removeListener("guildBanAdd", this.memberBanned);
    this.client.removeListener("userUpdate", this.userUpdate);
    this.client.removeListener("voiceChannelJoin", this.voiceJoin);
    this.client.removeListener("voiceChannelSwitch", this.voiceSwitch);
    this.client.removeListener("voiceChannelLeave", this.voiceLeave);
    this._slowSender.onDisconnect();
  }

  tryAndLog<G extends Array<unknown>>(callable: (...any: G) => any) {
    return (...args: G) => {
      try {
        return callable.call(this, ...args);
      } catch (err) {
        Sentry.captureException(err, {
          extra: {
            args: args,
          },
        })
        return null;
      }
    }
  }

  async moderationAction(msg: Eris.Message<Eris.TextChannel>, command: Command, perms: Permissions, action: "ban" | "kick" | "unban") {
    // locate user
    let user: Eris.User | undefined;
    let possibleId;
    if (command.targetUser) {
      user = command.targetUser.user;
    } else if (command.args.length > 0) {
      if (msg.mentions.length > 0 && msg.mentions[0].id !== this.client.user.id) {
        user = msg.mentions[0];
      } else if (msg.mentions.length > 1) {
        user = msg.mentions[1];
      } else {
        if (!isNaN(parseInt(command.args[0]))) {
          possibleId = command.args[0];
        }
      }
    } else {
      command.reply(command.translate`Who do you want to ${action}? ${command.prefix}${action} <user>`);
      return true;
    }

    let targetUserId = user ? user.id : possibleId;

    if (!targetUserId) {
      command.reply(command.translate`Sorry, user could not be located or their id was not a number. Please try a valid mention or id`);
      return true;
    }

    // check to see if user has ban immunity
    if (user && perms.checkUserChannel(user, msg.channel, `moderation.immunity.${action}`)) {
      command.reply(command.translate`Sorry you do not have permission to ${action} this user`);
      return true;
    }

    if (possibleId && perms.checkUserChannel({ id: possibleId }, msg.channel, `moderation.immunity.${action}`)) {
      command.reply(command.translate`Sorry but you don't have permission to ban the user this id belongs to.`);
      return true;
    }

    let time = 1;
    if (action === "ban" && command.options.hasOwnProperty("time")) {
      let time = parseInt(command.options.time, 10);
      if (isNaN(time)) {
        return command.reply(command.translate`Ban time must be a valid number.`);
      }
    }

    let reason = command.options.reason;
    console.log("reason", reason);
    if (!perms.check(msg, "moderation.reasonless")) {
      if (!reason) {
        return command.reply(command.translate`Sorry but you do not have permission to ban without providing a reason eg \`${command.prefix}${action} --user @devCodex --reason Annoying\``);
      }
    }

    await this.moderationActionCore(msg.channel.guild, action, user, msg.author, targetUserId, time, reason);
    return command.reply(command.translate`${user ? user.mention : possibleId} has been ${action}ned!`);
  }

  moderationActionCore(guild: Eris.Guild, action: "ban" | "unban" | "kick", targetUser: Eris.User | undefined, instigator: Eris.User, targetUserId: string, timeOrReason?: number | string, reasonOrNothing?: string) {
    let reason: string | null = typeof timeOrReason === "string" ? timeOrReason : (typeof reasonOrNothing === "string" ? reasonOrNothing : null);

    // @ts-ignore
    return guild[`${action}Member` as const](targetUserId, timeOrReason, reason)
      .then(() => {
        return this[moderationMethodNameMap[action]](guild, targetUser ? targetUser : targetUserId, instigator, reason, null);
      })
      .catch((error: Error) => {
        return this[moderationMethodNameMap[action]](guild, targetUser ? targetUser : targetUserId, instigator, reason, error)
      });
  }

  mute(guild: Eris.Guild, translate: translateType, prefix: string | undefined, member: Eris.Member, instigator: Eris.Member, unmute?: string, reason?: string): string | Promise<string> {
    // check to see if user has ban immunity
    if (this.perms.checkUserGuild(member, guild, `moderation.immunity.mute`)) {
      return translate`This user has the mute immunity permission \`moderation.immunity.mute\`, you may not mute them.`;
    }

    let muteRoleID = this.configDB.get("muteRole", false, { server: guild.id });
    if (!muteRoleID) {
      return translate`mute role not defined, try using ${prefix !== undefined ? prefix : "/"}setupmute to set it up.`
    }
    const muteRole = guild.roles.get(muteRoleID);
    if (!muteRole) {
      return translate`It seems the mute role was deleted, try using ${prefix !== undefined ? prefix : "/"}setupmute to set it up again.`
    }
    console.log(muteRoleID);

    let newRoles = member.roles.slice(0);
    newRoles.push(muteRoleID);

    this.memberMuted(guild, member, instigator.user, reason, null);

    return guild.editMember(member.id, { roles: newRoles }, `Member muted by <@${instigator.id}>${reason ? ` with reason: ${utils.clean(reason)}` : ""}`).then(() => {
      if (unmute) {
        const task = {
          action: "unmute",
          guildID: guild.id,
          meta: {
            userID: member.id,
            guildID: guild.id,
            roleIDs: [muteRoleID],
            reason: reason,
          },
        };
        try {
          const endDate = this.taskQueue.estimateEndDateFromString(unmute);
          this.taskQueue.schedule(task, endDate);
          return translate`${member.mention} muted till ${endDate.toUTCString()}${reason ? ` with reason \`${utils.clean(reason)}\`` : ""}.`;
        } catch (error) {
          if (error.message.startsWith('Cannot parse time of ')) {
            return translate`Unmute not scheduled because date could not be parsed, try \`3 hours\` or \`3 days\` for example. Note that the user was muted, to set a timeout run \`${prefix !== undefined ? prefix : "/"}mute\` with a valid date`;
          } else {
            throw error;
          }
        }
      } else {
        return translate`${member.mention} muted forever${reason ? ` with reason \`${utils.clean(reason)}\`` : ""}.`;
      }
    });
  }

  /**
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent() {
    return {
      name: `Moderation`,
      description: `Moderation commands including kick, ban, unban and purge`,
      key: "moderation",
      permNode: "moderation",
      commands: this.getCommands(),
    };
  }

  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands() {
    return [{
      triggers: ["ban"],
      permissionCheck: this.perms.genCheckCommand("moderation.ban"),
      channels: "guild",
      execute: (command: GuildCommand) => {
        this.moderationAction(command.msg, command, this.perms, "ban");
        return true;
      },
    }, {
      triggers: ["kick"],
      permissionCheck: this.perms.genCheckCommand("moderation.kick"),
      channels: ["guild"],
      execute: (command: GuildCommand) => {
        this.moderationAction(command.msg, command, this.perms, "kick");
        return true;
      },
    }, {
      triggers: ["unban"],
      permissionCheck: this.perms.genCheckCommand("moderation.unban"),
      channels: ["guild"],
      execute: (command: GuildCommand) => {
        this.moderationAction(command.msg, command, this.perms, "unban");
        return true;
      },
    }, {
      triggers: ["setupmute"],
      permissionCheck: this.perms.genCheckCommand("admin.moderation.setup.mute"),
      channels: ["guild"],
      execute: async (command: GuildCommand) => {
        let muteRole: Eris.Role;

        if (command.targetRole) {
          muteRole = command.targetRole;
        } else {
          muteRole = await command.channel.guild.createRole({
            name: "muted",
            permissions: 0,
            hoist: false,
            mentionable: false,
          }, command.translate`Created in response to ${command.prefix}setupmute run by <@${command.author.id}>`);
        }

        this.configDB.set("muteRole", muteRole.id, { server: command.channel.guild.id });

        command.replyAutoDeny(command.translate`Muted role created with name ${utils.clean(muteRole.name)}. Now attempting to deny sendMessage in all text channels and speaking in all voice channels.`);

        let muteRoleCreationResults = command.channel.guild.channels.map(channel => {
          return channel.editPermission(muteRole.id, 0, channel.type === 0 ? Eris.Constants.Permissions.sendMessages : Eris.Constants.Permissions.voiceSpeak, Utils.PERMISSION_OVERWRITE_TYPE.ROLE, `Created in response to ${command.prefix}setupmute run by <@${command.author.id}> in order to make the muted role effective`);
        });

        return utils.resolveAllPromises(muteRoleCreationResults).then(() => {
          Promise.all(muteRoleCreationResults).then(() => {
            return command.replyAutoDeny(command.translate`Denied text and voice permissions for the ${utils.clean(muteRole.name)} role.`);
          }).catch(() => {
            return command.replyAutoDeny(command.translate`Failed to automatically deny permissions in all voice and text channels, please manually ensure the ${utils.clean(muteRole.name)} can only talk where you intend it to.`)
          });
        })
      },
    }, {
      triggers: ["mute"],
      permissionCheck: this.perms.genCheckCommand("moderation.mute"),
      channels: ["guild"],
      execute: async (command: GuildCommand) => {
        const member = command.targetUser;

        if (!member) {
          return command.replyAutoDeny(command.translate`Please target a user by adding --user <user mention or name>`);
        }

        return command.replyAutoDeny(await this.mute(command.channel.guild, command.translate.bind(command), command.prefix, member, command.member, command.options.unmute, command.options.reason));
      },
    }, {
      triggers: ["purge"],
      permissionCheck: this.perms.genCheckCommand("moderation.tools.purge"),
      channels: ["guild"],
      execute: (command: GuildCommand) => {
        if (!("createMessage" in command.channel)) {
          return command.replyAutoDeny("Can only purge text channels.");
        }
        let channel: Eris.TextChannel = command.channel as Eris.TextChannel;
        let options: Parameters<typeof moderationV2.prototype.fetchMessages>[2] = {};
        if (command.targetUser) {
          let member = command.targetUser;
          if (member) {
            options.user = member.user;
          } else {
            command.reply(command.translate`Cannot find that user.`)
          }
        }
        if (!isNaN(parseInt(command.options.before, 10))) {
          options.before = command.options.before;
        }
        if (!isNaN(parseInt(command.options.after, 10))) {
          options.after = command.options.after;
        }
        let length: number;
        if (command.args[0]) {
          length = Math.min(parseInt(command.args[0]) + 1 || this.config.get("purgeLength", 100), this.config.get("maxPurgeLength", 1000));
        } else {
          length = this.config.get("purgeLength", 100)
        }
        if (command.flags.includes("d")) {
          this.updateServerIgnores(1, channel.guild.id);
        }
        let purger: NodeJS.Timeout;
        let status: NodeJS.Timeout;
        let purgeQueue: Eris.Message[] = [];
        let totalFetched = 0;
        let totalPurged = 0;
        let done = false;
        let statusMessage: Eris.Message<Eris.TextChannel> | false = false;
        let errorMessage: string | boolean = false;
        let oldMessagesFound = false;

        let updateStatus = (text: string) => {
          if (statusMessage) {
            utils.handleErisRejection(statusMessage.channel.editMessage(statusMessage.id, text));
          } else {
            utils.handleErisRejection(channel.createMessage(text)
              .then(message => statusMessage = message));
          }
        };

        this.fetchMessages(channel, length, options, (messages, error) => {
          if (error) {
            errorMessage = error;
            done = true;
            purgeQueue = [];
            updateStatus(`\`\`\`xl\n${error}\`\`\``);
          } else {
            if (messages) {
              totalFetched += messages.length;
              purgeQueue = purgeQueue.concat(messages);
            } else {
              done = true;
            }
          }
        });
        purger = setInterval(() => {
          if (purgeQueue.length > 0 && !errorMessage) {
            const messagesToPurge = purgeQueue.splice(0, 100);
            const twoWeeksAgo = Date.now() - 60 * 60 * 24 * 7 * 2 * 1000;
            const youngMessagesToPurge = messagesToPurge.filter(msg => msg.timestamp > twoWeeksAgo);
            if (youngMessagesToPurge.length < messagesToPurge.length) {
              oldMessagesFound = true;
            }
            channel.deleteMessages(youngMessagesToPurge.map(m => m.id)).then(() => {
              totalPurged += messagesToPurge.length;
            }).catch((error) => {
              let responseCode;
              if (error.response) {
                responseCode = JSON.parse(error.response).code;
              }
              if (responseCode === 50013) {
                errorMessage = error.response;
                done = true;
                purgeQueue = [];
                updateStatus(command.translate`\`\`\`xl\ndiscord permission Manage Messages required to purge messages.\`\`\``);
              } else if (responseCode === 429) {
                purgeQueue = purgeQueue.concat(messagesToPurge);
              } else {
                Sentry.captureException(error);
                console.error(error);
                console.error(error.response);
              }
            })
          } else if (done) {
            clearInterval(purger);
          }
        }, 1100);

        let updateStatusFunction = () => {
          if (done && purgeQueue.length === 0) {
            if (!errorMessage) {
              updateStatus(this.getStatus(totalPurged, totalFetched, length, oldMessagesFound, command));
            }
            setTimeout(() => {
              if (statusMessage) {
                utils.handleErisRejection(channel.deleteMessage(statusMessage.id));
              }
              if (command.flags.includes("d")) {
                this.updateServerIgnores(-1, channel.guild.id);
              }
            }, 5000);
            clearInterval(status);
          } else {
            if (!errorMessage) {
              updateStatus(this.getStatus(totalPurged, totalFetched, length, oldMessagesFound, command));
            }
          }
        };
        setTimeout(updateStatusFunction, 500);
        status = setInterval(updateStatusFunction, 2500);
        return true;
      },
    }];
  }

  getStatus(totalPurged: number, totalFetched: number, total: number, oldMessagesFound: boolean, command: Command) {
    return command.translate`\`\`\`xl\nStatus:\nPurged: ${getBar(totalPurged, totalFetched, 16)}\nFetched:${getBar(totalFetched, total, 16)}${(oldMessagesFound ? command.translate`\nMessages older than two weeks cannot be purged due to it breaking discord.` : "")}\n\`\`\``;
  }

  updateServerIgnores(count: number, serverId: string) {
    if (count > 0 && !this.tempServerIgnores.hasOwnProperty(serverId)) {
      this.tempServerIgnores[serverId] = count;
      return;
    }
    let thisServerTempIgnores = this.tempServerIgnores[serverId];
    if (thisServerTempIgnores !== undefined) {
      this.tempServerIgnores[serverId] = thisServerTempIgnores + count;
      if (thisServerTempIgnores < 1) {
        delete this.tempServerIgnores[serverId];
      }
      return;
    }
    this.tempServerIgnores[serverId] = count;
  }

  isServerIgnored(serverId: string) {
    return this.tempServerIgnores.hasOwnProperty(serverId);
  }

  fetchMessages(channel: Eris.TextChannel, count: number, options: { before?: string, after?: string, user?: Eris.User } = {}, cb: (messages: Eris.Message[] | false, error: string | false) => void) {
    channel.getMessages(Math.min(100, count), options.before).then((newMessages) => {
      let newMessagesLength = newMessages.length;
      let highestMessage = newMessages[newMessages.length - 1];
      if (options.hasOwnProperty("after")) {
        let index = newMessages.findIndex((m) => m.id === options.after);
        if (index > -1) {
          count = 0;
          newMessages.splice(index);
        }
      } else {
        count -= 100;
      }
      if ("user" in options) {
        newMessages = newMessages.filter((m) => m.author.id === options.user?.id);
      }
      cb(newMessages, false);
      if (count > 0 && newMessagesLength === 100) {
        options.before = highestMessage.id;
        process.nextTick(() => {
          this.fetchMessages(channel, count, options, cb)
        });
      } else {
        if (options.hasOwnProperty("before") || newMessagesLength > 0) {
          cb(false, false);
        } else {
          cb(false, 'Permission "Read Messages" required.')
        }
      }
    }).catch((error) => {
      cb(false, error);
    })
  }

  /**
   * A field used for discord embeds
   * @typedef {Object[]} Field
   * @param {string} title Title of the webhook field
   * @param {string} value Value of the webhook field
   * @param {boolean} short Inline the field?
   */

  /**
   * Send a message using webhooks or fallback to the events channel
   * @param {string} eventName
   * @param {Object?} options
   * @param {Object?} options.[user]
   * @param {string} [options.overrideRoot] override the moderation. root.
   * @param {string?} [options.username] username that will override the bot's username when posting webhook
   * @param {string?} [options.icon_url] icon that will override the bot's icon when posting webhook
   * @param {Object} attachment
   * @param {string} attachment.title title for webhook
   * @param {number} [attachment.ts] time stamp in seconds
   * @param {string} [attachment.color] color of embed
   * @param {string} [attachment.author_name]
   * @param {string} [attachment.author_icon]
   * @param {Field[]} attachment.fields Fields used for webhook attachment
   * @param {string} serverId
   */
  sendHookedMessage(eventName: keyof typeof colorMap, options: SendHookMessageOptions, attachment: SlackWebhookBody, serverId: string) {
    if (!attachment.ts) {
      attachment.ts = Date.now() / 1000;
    }
    if (!attachment.color && colorMap.hasOwnProperty(eventName)) {
      attachment.color = colorMap[eventName];
    }
    let payload = {
      username: options.username || this.client.user.username,
      attachments: [attachment],
      icon_url: options.icon_url || this.client.user.avatarURL,
      slack: true,
    };
    let fallbackMessage = "";
    if (options?.user?.username) {
      if (!attachment.author_name) {
        attachment.author_name = options.user.username;
      }
      if (!attachment.author_icon && "avatarURL" in options.user) {
        attachment.author_icon = options.user.avatarURL;
      }
      fallbackMessage += `${attachment.title} | `;
    }
    if (attachment.fields) {
      attachment.fields.forEach((field => {
        fallbackMessage += `   **${utils.clean(field.title)}**: ${utils.clean(field.value)}`
      }))
    }
    const feedNode = options.overrideRoot ? `${options.overrideRoot}.${eventName}` : `moderation.${eventName}`;
    this.feeds.find(feedNode, serverId).forEach((channel) => {
      let target: string | Eris.TextChannel = channel;
      if (channel.indexOf("http") < 0) {
        let guild = this.client.guilds.get(serverId);
        if (guild) {
          target = guild.channels.get(channel) as TextChannel;
        }
      }
      if (!target) return;
      this.messageSender.sendQueuedMessage(target, fallbackMessage, payload);
    })
  }

  messageDeletedBulk(messages: Eris.Message<Eris.TextChannel>[]) {
    if (!("guild" in messages[0].channel)) return;
    let message = messages[0];
    let cached = messages.filter(m => m.hasOwnProperty("content"));
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage(message.channel.id));

    let channelIgnored = this.isServerIgnored(message.channel.guild.id);
    if (!channelIgnored) {
      cached.forEach(this.messageDeleted);
    }

    //grab url's to the message's attachments
    let fields: SlackWebhookField[] = [];
    let attachment = {
      title: translate`Bulk Delete`,
      fields,
    };
    if (message.channel) {
      fields.push({
        title: translate`Channel`,
        value: message.channel.mention,
        short: true,
      })
    }
    fields.push({
      title: translate`Cached`,
      value: `${cached.length}`,
      short: true,
    });
    fields.push({
      title: translate`Not Cached`,
      value: `${messages.length - cached.length}`,
      short: true,
    });
    fields.push({
      title: translate`Total Messages`,
      value: `${messages.length}`,
      short: true,
    });
    if (channelIgnored) {
      fields.push({
        title: translate`Purge with don't log`,
        value: translate`The purge command was used with the don't log flag, and therefore cached messages are not being logged.`,
        short: true,
      });
    }
    //send everything off.
    this.sendHookedMessage("message.deleted", {}, attachment, message.channel.guild.id)

  }

  /**
   *
   * @param {Message} message
   * @private
   */
  messageDeleted(message: Eris.Message) {
    if (!message || !("guild" in message.channel)) return;
    if (message.author && this.perms.checkUserChannel(message.author, message.channel, "msglog.whitelist.message.deleted")) return;
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage(message.channel.id));
    //grab url's to the message's attachments
    let options: Parameters<typeof moderationV2.prototype.sendHookedMessage>[1] = {};
    let fields: SlackWebhookField[] = [];
    let attachment = {
      title: translate`Message Deleted`,
      fields,
    };
    if (message.member) {
      options.user = message.member;
    }
    if (message.id) {
      fields.push({
        title: translate`Age`,
        value: utils.idToUTCString(message.id),
        short: true,
      })
    }
    if (message.channel) {
      fields.push({
        title: translate`Channel`,
        value: message.channel.mention,
        short: true,
      })
    }
    if (message.author) {
      fields.push({
        title: translate`User`,
        value: message.author.mention,
        short: true,
      })
    }
    if (message.content) {
      let field: Partial<SlackWebhookField> = {
        title: translate`Content`,
        short: true,
      };
      if (message.content) {
        if (message.content.length > 144 || /[^0-9a-zA-Z\s.!?]/.test(message.content)) {
          field.value = utils.bubble(message.content);
        } else {
          field.value = "\n```diff\n-" + utils.clean(message.content) + "\n```";
        }
      }
      fields.push(field as SlackWebhookField)
    }
    if (message.id) {
      fields.push({
        title: translate`ID`,
        value: message.id,
        short: true,
      })
    }
    //if their are attachments log them.
    if (message.attachments) {
      for (let i in message.attachments) {
        if (message.attachments.hasOwnProperty(i)) {
          fields.push({
            title: translate`Attachment`,
            value: message.attachments[i].proxy_url,
            short: true,
          });
        }
      }
    }
    //send everything off.
    this.sendHookedMessage("message.deleted", options, attachment, message.channel.guild.id)
  }

  messageUpdated(message: Eris.Message, oldMessage: Eris.OldMessage | null) {
    if (!message || !("guild" in message.channel)) return;
    if (oldMessage && message.content === oldMessage.content) return;
    if (message.author && this.perms.checkUserChannel(message.author, message.channel, "msglog.whitelist.message.updated")) return;
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage(message.channel.id));
    //grab url's to the message's attachments
    let options: any = {};
    let fields: SlackWebhookField[] = [];
    let attachment: SlackWebhookBody = {
      title: translate`Message Updated`,
      fields,
    };
    if (message.member) {
      options.user = message.member;
    }
    let content: string | boolean = false;
    let changeThresh = this.configDB.get("changeThresh", this.configDB.get("changeThresh", 1), { server: message.channel.guild.id });
    if (oldMessage && oldMessage.content) {
      if (utils.compare(message.content, oldMessage.content) > changeThresh) {
        content = `${utils.bubble(oldMessage.content)} to ${utils.bubble(message.content)}`;
      } else {
        return;
      }
    } else {
      content = translate`**Uncached** to ${utils.bubble(message.content)}`;
    }
    if (message.id) {
      fields.push({
        title: translate`Age`,
        value: utils.idToUTCString(message.id),
        short: true,
      })
    }
    if (message.channel) {
      fields.push({
        title: translate`Channel`,
        value: message.channel.mention,
        short: true,
      })
    }
    if (message.author) {
      fields.push({
        title: translate`User`,
        value: message.author.mention,
        short: true,
      })
    }
    if (content) {
      let field = {
        title: translate`Content`,
        value: content,
        short: true,
      };
      fields.push(field)
    }
    //if their are attachments log them.
    if (message.attachments) {
      for (let i in message.attachments) {
        if (message.attachments.hasOwnProperty(i)) {
          fields.push({
            title: translate`Attachment`,
            value: message.attachments[i].proxy_url,
            short: true,
          });
        }
      }
    }
    //send everything off.
    this.sendHookedMessage("message.updated", options, attachment, message.channel.guild.id)
  };

  channelDeleted(channel: Eris.GuildChannel | Eris.TextChannel) {
    if (!channel.guild) return;
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage(channel.id));
    let fields: SlackWebhookField[] = [{
      title: translate`Name`,
      value: channel.name,
      short: true,
    }, {
      title: translate`Age`,
      value: utils.idToUTCString(channel.id),
      short: true,
    }];
    if ("topic" in channel && channel.topic) {
      fields.push({
        title: translate`Topic`,
        value: channel.topic,
        short: true,
      })
    }
    this.sendHookedMessage("channel.deleted", {}, {
      title: translate`Channel Deleted`,
      fields,
    }, channel.guild.id);
  };

  channelCreated(channel: Eris.GuildChannel) {
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage(channel.id));
    if (!channel.guild) return;
    this.sendHookedMessage("channel.created", {}, {
      title: translate`Channel Created`,
      fields: [{
        title: translate`Channel`,
        value: channel.mention,
        short: true,
      }],
    }, channel.guild.id);
  };

  channelUpdated(channel: Eris.AnyChannel, oldChannel: Eris.OldGuildChannel) {
    if (!("guild" in channel)) {
      return;
    }
    if (!channel || this.perms.checkChannel(channel, "msglog.whitelist.channel.updated")) return;

    const translate = this.i10010n(this.pvpcraft.getChannelLanguage(channel.id));

    let fields: SlackWebhookField[] = [{
      title: translate`Channel`,
      value: channel.mention,
      short: true,
    }, {
      title: translate`Age`,
      value: utils.idToUTCString(channel.id),
      short: true,
    }];
    if (oldChannel.name !== channel.name) {
      fields.push({
        title: translate`Name Changed`,
        value: translate`${utils.removeBlocks(oldChannel.name)} **to** ${utils.removeBlocks(channel.name)}`,
        short: true,
      })
    }
    if ("topic" in channel && oldChannel.topic !== channel.topic) {
      fields.push({
        title: translate`Topic Changed`,
        value: translate`${utils.removeBlocks(oldChannel.topic || "un-set")} **to** ${utils.removeBlocks(channel.topic || "un-set")}`,
        short: true,
      });
    }

    if ("permissionOverwrites" in channel && "permissionOverwrites" in oldChannel) {
      let changes = findOverrideChanges(channel.permissionOverwrites, oldChannel.permissionOverwrites);

      for (let change of changes) {
        let newField: Partial<SlackWebhookField> = { short: true, value: "" };
        if (change.overwrite.type === Utils.PERMISSION_OVERWRITE_TYPE.MEMBER) {
          newField.title = translate`User Overwrite`;
          newField.value = `<@${change.overwrite.id}>`;
        }
        if (change.overwrite.type === Utils.PERMISSION_OVERWRITE_TYPE.ROLE) {
          newField.title = translate`Role Overwrite`;
          newField.value = `<@&${change.overwrite.id}>`;
        }
        if (change.change === "add") {
          newField.value += translate` added ${permissionsListFromNumber(change.overwrite.allow)}`;
        } else if (change.change === "remove") {
          newField.value += translate` removed ${permissionsListFromNumber(change.overwrite.allow)}`;
        } else {
          let before = change.from;
          let after = change.to;

          if (before.allow !== after.allow) {
            if (before.allow > after.allow) {
              newField.value += translate` Add allow ${permissionsListFromNumber(before.allow - after.allow)}`;
            } else {
              newField.value += translate` Remove allow ${permissionsListFromNumber(after.allow - before.allow)}`;
            }
          }

          if (before.deny !== after.deny) {
            if (before.deny > after.deny) {
              newField.value += translate` Add deny ${permissionsListFromNumber(before.deny - after.deny)}`;
            } else {
              newField.value += translate` Remove deny ${permissionsListFromNumber(after.deny - before.deny)}`;
            }
          }
        }
        fields.push(newField as SlackWebhookField);
      }
    }
    if (fields.length > 2) {
      this.sendHookedMessage("channel.updated", {}, { title: translate`Channel Updated`, fields }, channel.guild.id);
    }
  };

  userUpdate(user: Eris.User, oldUser: Eris.PartialUser) {
    this.client.guilds.forEach(guild => {
      if (guild.members.get(user.id)) {
        if (this.perms.checkUserGuild(user, guild, "msglog.whitelist.user")) return;
        const translate = this.i10010n(this.pvpcraft.getChannelLanguage("*", guild.id));
        if (!oldUser) return;
        let fields: SlackWebhookField[] = [{
          title: translate`User`,
          value: user.mention,
          short: true,
        }];
        let embed: SlackWebhookBody = { title: translate`Member Updated`, fields };
        if (oldUser.username !== user.username) {
          fields.push({
            title: translate`Username`,
            value: translate`${utils.clean(oldUser.username)} to ${utils.clean(user.username)}`,
            short: true,
          });
        }
        if (oldUser.discriminator !== user.discriminator) {
          fields.push({
            title: translate`Discriminator`,
            value: translate`${oldUser.discriminator} to ${user.discriminator}`,
            short: true,
          });
        }
        if (oldUser.avatar !== user.avatar) {
          let oldURL;
          if (oldUser.avatar != null) {
            oldURL = `https://cdn.discordapp.com/avatars/${user.id}/${oldUser.avatar}.${oldUser.avatar.startsWith("_a") ? "gif" : "png"}?size=128`;
          }
          fields.push({
            title: translate`Avatar`,
            value: translate`${oldURL || "Default"} to ${user.avatarURL}`,
            short: true,
          });
          embed.image_url = user.avatarURL;
          if (oldURL) {
            embed.thumb_url = oldURL;
          }
        }
        if (fields.length < 2) return;
        this.sendHookedMessage("user", { user }, embed, guild.id);
      }
    });
  };

  presence(user: Eris.Member, oldPresence: Eris.Presence | null) {
    this.client.guilds.forEach(guild => {
      if (guild.members.get(user.id)) {
        if (this.perms.checkUserGuild(user, guild, "msglog.whitelist.presence")) return;
        const translate = this.i10010n(this.pvpcraft.getChannelLanguage("*", guild.id));
        if (!oldPresence) return;
        let fields: SlackWebhookField[] = [{
          title: translate`User`,
          value: user.mention,
          short: true,
        }];
        let embed = { title: translate`Presence Updated`, fields };
        if (oldPresence.status !== user.status) {
          fields.push({
            title: translate`Status`,
            value: translate`${emojifyPresenceStatus(utils.clean(oldPresence.status || "unknown"))} to ${emojifyPresenceStatus(utils.clean(user.status || "unknown"))}`,
            short: true,
          });
        }
        /* if (JSON.stringify(oldPresence.game) !== JSON.stringify(user.game)) {
          fields.push({
            title: translate `Game`,
            value: translate `${JSON.stringify(oldPresence.game)} to ${JSON.stringify(user.game)}`,
            short: true,
          });
        }*/
        if (fields.length < 2) return;
        this.sendHookedMessage("presence", { user, overrideRoot: "user" }, embed, guild.id);
      }
    });
  };

  roleCreated(guild: Eris.Guild, role: Eris.Role) {
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage("*", guild.id));
    this.sendHookedMessage("role.created", {}, {
      title: `Role Created`, fields: [{
        title: translate`Role`,
        value: role.mention,
        short: true,
      }],
    }, guild.id);
  }

  roleDeleted(guild: Eris.Guild, role: Eris.Role) {
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage("*", guild.id));
    this.sendHookedMessage("role.deleted", {}, {
      title: translate`Role Deleted`, fields: [{
        title: translate`Role`,
        value: role.mention,
        short: true,
      }, {
        title: translate`Name`,
        value: role.name,
        short: true,
      }, {
        title: translate`Created`,
        value: utils.idToUTCString(role.id),
        short: true,
      }],
    }, guild.id);
  }

  roleUpdated(guild: Eris.Guild, role: Eris.Role, oldRole: Eris.Role) {
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage("*", guild.id));
    let fields: SlackWebhookField[] = [{
      title: translate`Role`,
      value: role.mention,
      short: true,
    }, {
      title: translate`Created`,
      value: utils.idToUTCString(role.id),
      short: true,
    }];
    let oldPerms = arrayOfTrues(oldRole.permissions.json).toString();
    let newPerms = arrayOfTrues(role.permissions.json).toString();
    if (oldPerms !== newPerms) {
      fields.push({
        title: translate`Permissions`,
        value: translate`${oldPerms} to ${newPerms}`,
        short: true,
      });
    }
    if (oldRole.name !== role.name) {
      fields.push({
        title: translate`Name Changed`,
        value: translate`${utils.clean(oldRole.name)} to ${utils.clean(role.name)}`,
        short: true,
      });
    }
    if (oldRole.position !== role.position) {
      fields.push({
        title: translate`Position Changed`,
        value: translate`${oldRole.position} to ${role.position}`,
        short: true,
      });
    }
    if (oldRole.hoist !== role.hoist) {
      fields.push({
        title: translate`Display separately`,
        value: translate`${oldRole.hoist} to ${role.hoist}`,
        short: true,
      });
    }
    if (oldRole.color !== role.color) {
      fields.push({
        title: translate`Color`,
        value: translate`${oldRole.color} to ${role.color}`,
        short: true,
      });
    }
    if (fields.length < 3) return;
    this.sendHookedMessage("role.updated", {}, { title: translate`Role Updated`, fields }, guild.id)
  };

  /**
   *
   * @param {Guild} server
   * @param {User | string} user
   * @param {User | null} instigator
   * @param {string | null} reason
   * @param {Error | null} error
   */
  async memberBanned(server: Eris.Guild, user: Eris.User | string, instigator: Eris.User | null | undefined, reason: string | null | undefined, error: Error | null) {
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage("*", server.id));
    const node = instigator ? "moderation.action.ban" : "member.banned";

    const fields: SlackWebhookField[] = [{
      title: translate`User`,
      value: typeof user === "string" ? `<@${user}>` : user.mention,
      short: true,
    }];

    if (!instigator && !reason) {
      await utils.delay(1000);
      const possibleMeta = await getLastAuditLog(server, 22);
      console.log(possibleMeta);
      if (possibleMeta) {
        instigator = getAuditLogCause(possibleMeta);
        reason = getAuditLogReason(possibleMeta);
      }
    }

    if (instigator) {
      fields.push({
        title: translate`Responsible Moderator`,
        value: instigator.mention,
        short: true,
      })
    }

    if (reason) {
      fields.push({
        title: translate`Reason`,
        value: utils.clean(reason),
        short: true,
      })
    }

    if (error) {
      fields.push({
        title: translate`Failed due to`,
        value: utils.clean(error.toString()).slice(0, 250),
        short: true,
      })
    }

    this.sendHookedMessage(node, { user: typeof user === "string" ? undefined : user }, {
      title: translate`User Banned`,
      fields,
    }, server.id);
  };

  /**
   *
   * @param {Guild} server
   * @param {User | string} user
   * @param {User | null} instigator
   * @param {string | null} reason
   * @param {Error | null} error
   */
  async memberMuted(server: Eris.Guild, user: Eris.Member | string, instigator: Eris.User, reason: string | null | undefined, error: Error | null) {
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage("*", server.id));
    const node = "moderation.action.mute";

    const fields: SlackWebhookField[] = [{
      title: translate`User`,
      value: typeof user === "string" ? `<@${user}>` : user.mention,
      short: true,
    }];

    if (instigator) {
      fields.push({
        title: translate`Responsible Moderator`,
        value: instigator.mention,
        short: true,
      })
    }

    if (reason) {
      fields.push({
        title: translate`Reason`,
        value: utils.clean(reason),
        short: true,
      })
    }

    if (error) {
      fields.push({
        title: translate`Failed due to`,
        value: utils.clean(error.toString()).slice(0, 250),
        short: true,
      })
    }

    this.sendHookedMessage(node, { user: typeof user === "string" ? undefined : user }, {
      title: translate`User Muted`,
      fields,
    }, server.id);
  };

  /**
   *
   * @param {Guild} server
   * @param {User | string} user
   * @param {User | null} instigator
   * @param {string | null} reason
   * @param {Error | null} error
   */
  memberUnbanned(server: Eris.Guild, user: Eris.User | string, instigator: Eris.User | null, reason: string | null, error: Error | null) {
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage("*", server.id));
    let fields: SlackWebhookField[] = [{
      title: translate`User`,
      value: typeof user === "string" ? `<@${user}>` : user.mention,
      short: true,
    }];

    if (instigator) {
      fields.push({
        title: translate`Responsible Moderator`,
        value: instigator.mention,
        short: true,
      })
    }

    if (reason) {
      fields.push({
        title: translate`Reason`,
        value: utils.clean(reason),
        short: true,
      })
    }

    if (error) {
      fields.push({
        title: translate`Failed due to`,
        value: utils.clean(error.toString()).slice(0, 250),
        short: true,
      })
    }

    this.sendHookedMessage(instigator ? "moderation.action.unban" : "member.unbanned", { user: typeof user === "string" ? undefined : user }, {
      title: translate`User Unbanned`,
      fields,
    }, server.id);
  };

  memberAdded(server: Eris.Guild, user: Eris.Member) {
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage("*", server.id));
    this.sendHookedMessage("member.added", { user }, {
      title: translate`User Joined`, fields: [
        {
          title: translate`User`,
          value: user.mention,
          short: true,
        },
        {
          title: translate`ID`,
          value: user.id,
          short: true,
        },
        {
          title: translate`Created`,
          value: (new Date(user.createdAt)).toLocaleString(),
          short: true,
        }],
    }, server.id);
  };

  /**
   *
   * @param {Guild} server
   * @param {{id: string, user: User} | Member} user
   * @param {User | null} instigator
   * @param {string | null} reason
   * @param {Error | null} error
   */
  memberRemoved(server: Eris.Guild, user: { id: string, username?: string, user: Eris.User } | Eris.Member | Eris.User | string, instigator: Eris.User | null, reason: string | null, error: Error | null) {
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage("*", server.id));

    const userID = typeof user === "string" ? user : user.id;

    let fields: SlackWebhookField[] = [{
      title: translate`User`,
      value: `<@${userID}>`,
      short: true,
    }, {
      title: translate`Age`,
      value: utils.idToUTCString(userID),
      short: true,
    }];

    let maybeActualUser: Eris.User | undefined;
    if (typeof user !== "string") {
      const actualUser = "user" in user ? user.user : user;
      maybeActualUser = actualUser;

      let username = actualUser.username;

      if (username) {
        fields.push({
          title: translate`Username`,
          value: username,
          short: true,
        })
      }
    }

    if (instigator) {
      fields.push({
        title: translate`Responsible Moderator`,
        value: instigator.mention,
        short: true,
      })
    }

    if (reason) {
      fields.push({
        title: translate`Reason`,
        value: utils.clean(reason),
        short: true,
      })
    }

    if (error) {
      fields.push({
        title: translate`Failed due to`,
        value: utils.clean(error.toString()).slice(0, 250),
        short: true,
      })
    }

    this.sendHookedMessage(instigator ? "moderation.action.kick" : "member.removed", { user: maybeActualUser }, {
      title: translate`User Left or was Kicked`,
      fields,
    }, server.id);
  }

  memberUpdated(guild: Eris.Guild, member: Eris.Member, oldMember: { nick?: string; premiumSince: number; roles: string[] } | null) {
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage("*", guild.id));
    if (this.perms.checkUserGuild(member, guild, "msglog.whitelist.member.updated")) return;
    if (!oldMember) return;
    let fields: SlackWebhookField[] = [{
      title: translate`User`,
      value: member.mention,
      short: true,
    }];
    if (oldMember.nick != member.nick) {
      fields.push({
        title: translate`Nick`,
        value: translate`${utils.clean(oldMember.nick || "none")} to ${utils.clean(member.nick || "none")}`,
        short: true,
      });
    }
    // @ts-ignore
    if (oldMember.voiceState) { // eris does not currently supply previous voice states. This will probably be added in the future.
      // @ts-ignore
      if (oldMember.voiceState.mute != member.voiceState.mute) {
        fields.push({
          title: translate`Muted`,
          // @ts-ignore
          value: translate`${oldMember.voiceState.mute} to ${member.voiceState.mute}`,
          short: true,
        });
      }
      // @ts-ignore
      if (oldMember.voiceState.deaf != member.voiceState.deaf) {
        fields.push({
          title: translate`Death`,
          // @ts-ignore
          value: translate`${oldMember.voiceState.deaf} to ${member.voiceState.deaf}`,
          short: true,
        });
      }
    }
    if (oldMember.roles && oldMember.roles.length < member.roles.length) {
      let newRole = findNewRoles(member.roles, oldMember.roles);
      fields.push({
        title: translate`Role Added`,
        value: `<@&${newRole}>`,
        short: true,
      });
    } else if (oldMember.roles && oldMember.roles.length > member.roles.length) {
      let oldRole = findNewRoles(oldMember.roles, member.roles);
      fields.push({
        title: translate`Role Removed`,
        value: `<@&${oldRole}>`,
        short: true,
      });
    }
    if (fields.length < 2) return;
    this.sendHookedMessage("member.updated", { user: member }, { title: translate`Member Updated`, fields }, guild.id);
  };

  voiceJoin(member: Eris.Member, newChannel: Eris.VoiceChannel) {
    if (this.perms.checkUserChannel(member, newChannel, "msglog.whitelist.voice.join")) return;
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage(newChannel.id));
    this.sendHookedMessage("voice.join", { user: member }, {
      title: translate`Voice Join`, fields: [{
        title: translate`User`,
        value: member.mention,
        short: true,
      }, {
        title: translate`Channel`,
        value: newChannel.mention,
        short: true,
      }],
    }, newChannel.guild.id);
  }

  voiceSwitch(member: Eris.Member, newChannel: Eris.VoiceChannel, oldChannel: Eris.VoiceChannel) {
    if (this.perms.checkUserChannel(member, newChannel, "msglog.whitelist.voice.switch")) return;
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage(oldChannel.id));
    this.sendHookedMessage("voice.switch", { user: member }, {
      title: translate`Voice Switch`, fields: [{
        title: translate`User`,
        value: member.mention,
        short: true,
      }, {
        title: translate`Old Channel`,
        value: oldChannel.mention,
        short: true,
      }, {
        title: translate`New Channel`,
        value: newChannel.mention,
        short: true,
      }],
    }, newChannel.guild.id);
  }

  voiceLeave(member: Eris.Member, oldChannel: Eris.VoiceChannel) {
    if (this.perms.checkUserChannel(member, oldChannel, "msglog.whitelist.voice.leave")) return;
    const translate = this.i10010n(this.pvpcraft.getChannelLanguage(oldChannel.id));
    this.sendHookedMessage("voice.leave", { user: member }, {
      title: translate`Voice Leave`, fields: [{
        title: translate`User`,
        value: member.mention,
        short: true,
      }, {
        title: translate`Channel`,
        value: oldChannel.mention,
        short: true,
      }],
    }, oldChannel.guild.id);
  }
}

/**
 * Finds the differences
 * @param thing1 new overwrites
 * @param thing2 old overwrites
 * @returns {Array} of differences
 */
function findOverrideChanges(thing1: Eris.Collection<Eris.PermissionOverwrite>, thing2: Eris.Collection<Eris.PermissionOverwrite>) {
  type Base = {
    overwrite: Eris.PermissionOverwrite;
    type: Eris.PermissionType;
  }

  type Added = Base & {
    change: "add";
  }

  type Removed = Base & {
    change: "remove";
  }

  type Changed = Base & {
    change: "change";
    from: Eris.PermissionOverwrite;
    to: Eris.PermissionOverwrite;
  }

  let changes: (Added | Removed | Changed)[] = [];
  thing1.forEach(permissionOverwrite => {
    let thing2Overwrite = thing2.get(permissionOverwrite.id);
    if (thing2Overwrite) {
      if (thing2Overwrite.allow !== permissionOverwrite.allow || thing2Overwrite.deny !== permissionOverwrite.deny) {
        changes.push({
          change: "change",
          from: permissionOverwrite,
          to: thing2Overwrite,
          overwrite: thing2Overwrite,
          type: thing2Overwrite.type,
        });
      }
    } else {
      changes.push({ change: "add", overwrite: permissionOverwrite, type: permissionOverwrite.type });
    }
  });
  thing2.forEach(permissionOverwrite => {
    let thing1Overwrite = thing1.get(permissionOverwrite.id);
    if (!thing1Overwrite) {
      changes.push({ change: "remove", overwrite: permissionOverwrite, type: permissionOverwrite.type });
    }
  });
  return changes;
}

/**
 * Returns string containing all the permissions from a permissions id.
 * @param {number} permissions
 * @returns {string} array of trues
 */
function permissionsListFromNumber(permissions: number) {
  return arrayOfTrues(new Eris.Permission(permissions, 0).json).toString();
}

/**
 * Return an array of the objects keys that have the value true
 * @param {Object} object
 * @returns {string[]}
 */
function arrayOfTrues(object: { [x: string]: any; }) {
  let arr = [];
  for (let key in object) {
    if (object.hasOwnProperty(key) && object[key] === true) {
      arr.push(key)
    }
  }
  return arr;
}

/**
 * returns role present in more that are not contained in less
 * @param more {string[]} group of role's that has more roles
 * @param less {string[]} group of role's that has less role's than more.
 * @return {Role|boolean} role not present in old array
 */
function findNewRoles(more: string[], less: string[]) {
  for (let i of more) {
    if (!i) console.error(new Error("Found a null role 1?"));
    else if (!less.includes(i)) {
      return i;
    }
  }
  return false;
}

function getLastAuditLog(guild: Eris.Guild, event: number) {
  return guild.getAuditLogs(1, undefined, event).catch(error => null);
}

function getAuditLogTargetID(event: Eris.GuildAuditLog) {
  if (event == null) return event;
  if (event.entries && event.entries.length > 0) {
    const entry = event.entries[0];
    return entry.targetID;
  }
}

function getAuditLogTarget(event: Eris.GuildAuditLog) {
  if (event == null) return event;
  if (event.entries && event.entries.length > 0) {
    const entry = event.entries[0];
    return entry.target;
  }
}

function getAuditLogCause(event: Eris.GuildAuditLog) {
  if (event == null) return event;
  if (event.entries && event.entries.length > 0) {
    const entry = event.entries[0];
    return entry.user;
  }
}

function getAuditLogReason(event: Eris.GuildAuditLog) {
  if (event == null) return event;
  if (event.entries && event.entries.length > 0) {
    const entry = event.entries[0];
    return entry.reason;
  }
}

/**
 * Renders a bar from numbers
 * @param {number} current value
 * @param {number} total value when complete
 * @param {number} length of bar
 * @param {string} char to fill bar with
 * @returns {string}
 */
function getBar(current: number, total: number, length: number, char: string = "=") {
  let progress = Math.ceil(current / total * length);
  return `[${char.repeat(progress)}${" ".repeat(length - progress)}] ${current}/${total}`;
}

module.exports = moderationV2;
