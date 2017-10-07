/**
 * Created by macdja38 on 2016-08-23.
 */

const utils = require('../lib/utils');
let util = require('util');
let colors = require('colors');
let Eris = require("eris");

const moderationMethodNameMap = {
  ban: "memberBanned",
  unban: "memberUnbanned",
  kick: "memberRemoved",
};

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
  "channel.created": "#BEFF00",
  "channel.updated": "#BE7F00",
  "channel.deleted": "#BE0000",
  "role.created": "#FFFF00",
  "role.updated": "#FF7F00",
  "role.deleted": "#FF0000",
  "server.updated": "#FF7F00",
  "action.kick": "#BE3F3F",
  "action.ban": "#BE003F",
  "action.unban": "#BEBE3F"
};

class moderationV2 {
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
    //this.logging = {};
    this.messageSender = e.messageSender;
    this.config = e.config;
    this.perms = e.perms;
    this.configDB = e.configDB;
    this.raven = e.raven;
    this.feeds = e.feeds;
    this.tempServerIgnores = {};
    this._slowSender = e.slowSender;
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

  tryAndLog(callable) {
    return (...args) => {
      try {
        return callable.call(this, ...args);
      } catch (err) {
        if (this.raven) {
          this.raven.captureException(err, {
            extra: {
              args: args,
            }
          });
        } else {
          console.error(err);
        }
        return null;
      }
    }
  }

  moderationAction(msg, command, perms, action) {
    // locate user
    let user;
    let possibleId;
    if (command.user) {
      user = command.user;
    } else if (command.args.length > 0) {
      if (msg.mentions.length > 0) {
        user = msg.mentions[0];
      } else {
        if (!isNaN(parseInt(command.args[0]))) {
          possibleId = command.args[0];
        }
      }
    } else {
      command.reply(`Who do you want to ${action}? ${command.prefix}${action} <user>`);
      return true;
    }
    if (!user && !possibleId) {
      command.reply(`Sorry, user could not be located or their id was not a number. Please try a valid mention or id`);
      return true;
    }

    // check to see if user has ban immunity
    if (user && perms.checkUserChannel(user, msg.channel, `moderation.immunity.${action}`)) {
      command.reply(`Sorry you do not have permission to ${action} this user`);
      return true;
    }

    if (possibleId && perms.checkUserChannel({id: possibleId}, msg.channel, `moderation.immunity.${action}`)) {
      command.reply("Sorry but you don't have permission to ban the user this id belongs to.");
      return true;
    }

    let reason = command.options.reason;
    if (!perms.check(msg, "moderation.reasonless")) {
      if (!reason) {
        command.reply(`Sorry but you do not have permission to ban without providing a reason eg \`${command.prefix}${action} --user @devCodex --reason Annoying\``);
        return true;
      }
    }

    let args = [user ? user.id : possibleId];
    if (action === "ban") {
      args.push(command.options.hasOwnProperty("time") ? command.options.time : 1);
    }
    msg.channel.guild[`${action}Member`](...args)
      .then(() => {
        return this[moderationMethodNameMap[action]](msg.channel.guild, user, msg.author, reason, false);
      })
      .catch((error) => {
        return this[moderationMethodNameMap[action]](msg.channel.guild, user, msg.author, reason, error)
      });
    command.reply(`${user ? user.mention : possibleId} has been ${action}ned!`);
  }

  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands() {
    return [{
      triggers: ["ban"],
      permissionCheck: this.perms.genCheckCommand("moderation.ban"),
      channels: ["guild"],
      execute: command => {
        this.moderationAction(command.msg, command, this.perms, "ban");
        return true;
      },
    }, {
      triggers: ["kick"],
      permissionCheck: this.perms.genCheckCommand("moderation.kick"),
      channels: ["guild"],
      execute: command => {
        this.moderationAction(command.msg, command, this.perms, "kick");
        return true;
      },
    }, {
      triggers: ["unban"],
      permissionCheck: this.perms.genCheckCommand("moderation.unban"),
      channels: ["guild"],
      execute: command => {
        this.moderationAction(command.msg, command, this.perms, "unban");
        return true;
      },
    }, {
      triggers: ["purge"],
      permissionCheck: this.perms.genCheckCommand("moderation.tools.purge"),
      channels: ["guild"],
      execute: command => {
        let channel = command.channel ? command.channel : command.channel;
        let options = {};
        if (/<@!?\d+>/.test(command.options.user)) {
          let user = command.channel.guild.members.get(command.options.user.match(/<@!?(\d+)>/)[1]);
          if (user) {
            options.user = user;
          } else {
            command.reply("Cannot find that user.")
          }
        }
        if (!isNaN(command.options.before)) {
          options.before = command.options.before;
        }
        if (!isNaN(command.options.after)) {
          options.after = command.options.after;
        }
        let length;
        if (command.args[0]) {
          length = Math.min(parseInt(command.args[0]) + 1 || this.config.get("purgeLength", 100), this.config.get("maxPurgeLength", 1000));
        } else {
          length = this.config.get("purgeLength", 100)
        }
        if (command.flags.includes("d")) {
          this.updateServerIgnores(1, channel.guild.id);
        }
        let purger;
        let status;
        let purgeQueue = [];
        let totalFetched = 0;
        let totalPurged = 0;
        let done = false;
        let statusMessage = false;
        let errorMessage = false;
        let oldMessagesFound = false;

        let updateStatus = (text) => {
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
                updateStatus("```xl\ndiscord permission Manage Messages required to purge messages.```");
              } else if (responseCode === 429) {
                purgeQueue = purgeQueue.concat(messagesToPurge);
              } else {
                if (this.raven) {
                  this.raven.captureException(error);
                }
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
              updateStatus(this.getStatus(totalPurged, totalFetched, length, oldMessagesFound));
            }
            setTimeout(() => {
              utils.handleErisRejection(channel.deleteMessage(statusMessage.id));
              if (command.flags.includes("d")) {
                this.updateServerIgnores(-1, channel.guild.id);
              }
            }, 5000);
            clearInterval(status);
          }
          else {
            if (!errorMessage) {
              updateStatus(this.getStatus(totalPurged, totalFetched, length, oldMessagesFound));
            }
          }
        };
        setTimeout(updateStatusFunction, 500);
        status = setInterval(updateStatusFunction, 2500);
        return true;
      },
    }];
  }

  getStatus(totalPurged, totalFetched, total, oldMessagesFound) {
    return `\`\`\`xl\nStatus:\nPurged: ${getBar(totalPurged, totalFetched, 16)}\nFetched:${getBar(totalFetched, total, 16)}` +
      (oldMessagesFound ? "\nMessages older than two weeks cannot be purged due to it breaking discord." : "") + "\n\`\`\`";
  }

  updateServerIgnores(count, serverId) {
    if (count > 0 && !this.tempServerIgnores.hasOwnProperty(serverId)) {
      this.tempServerIgnores[serverId] = count;
      return;
    }
    if (this.tempServerIgnores.hasOwnProperty(serverId)) {
      this.tempServerIgnores[serverId] += count;
      if (this.tempServerIgnores < 1) {
        delete this.tempServerIgnores[serverId];
      }
      return;
    }
    this.tempServerIgnores = count;
  }

  isServerIgnored(serverId) {
    return this.tempServerIgnores.hasOwnProperty(serverId);
  }

  fetchMessages(channel, count, options = {}, cb) {
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
      if (options.hasOwnProperty("user")) {
        newMessages = newMessages.filter((m) => m.author.id === options.user.id);
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
   * @param {Object?} options.user
   * @param {string?} options.username username that will override the bot's username when posting webhook
   * @param {string?} options.icon_url icon that will override the bot's icon when posting webhook
   * @param {Object} attachment
   * @param {string} attachment.title title for webhook
   * @param {number} [attachment.ts] time stamp in seconds
   * @param {string} [attachment.color] color of embed
   * @param {string} [attachment.author_name]
   * @param {string} [attachment.author_icon]
   * @param {Field[]} attachment.fields Fields used for webhook attachment
   * @param {string} serverId
   */
  sendHookedMessage(eventName, options, attachment, serverId) {
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
    if (options.hasOwnProperty("user") && options.user.hasOwnProperty("username")) {
      if (!attachment.author_name) {
        attachment.author_name = options.user.username;
      }
      if (!attachment.author_icon) {
        attachment.author_icon = options.user.avatarURL;
      }
      fallbackMessage += `${attachment.title} | `;
    }
    if (attachment.hasOwnProperty("fields")) {
      attachment.fields.forEach((field => {
        fallbackMessage += `   **${utils.clean(field.title)}**: ${utils.clean(field.value)}`
      }))
    }
    this.feeds.find(`moderation.${eventName}`, serverId).forEach((channel) => {
      if (channel.indexOf("http") < 0) {
        let guild = this.client.guilds.get(serverId);
        if (guild) {
          channel = guild.channels.get(channel);
        }
      }
      if (!channel) return;
      this.messageSender.sendQueuedMessage(channel, fallbackMessage, payload);
    })
  }

  messageDeletedBulk(messages) {
    if (!messages[0].channel.guild) return;
    let message = messages[0];
    let cached = messages.filter(m => m.hasOwnProperty("content"));

    let channelIgnored = this.isServerIgnored(message.channel.guild.id);
    if (!channelIgnored) {
      cached.forEach(this.messageDeleted);
    }

    //grab url's to the message's attachments
    let fields = [];
    let attachment = {
      title: `Bulk Delete`,
      fields,
    };
    if (message.channel) {
      fields.push({
        title: "Channel",
        value: message.channel.mention,
        short: true,
      })
    }
    fields.push({
      title: "Cached",
      value: `${cached.length}`,
      short: true,
    });
    fields.push({
      title: "Not Cached",
      value: `${messages.length - cached.length}`,
      short: true,
    });
    fields.push({
      title: "Total Messages",
      value: `${messages.length}`,
      short: true,
    });
    if (channelIgnored) {
      fields.push({
        title: "Purge with don't log",
        value: `The purge command was used with the don't log flag, and therefore cached messages are not being logged.`,
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
  messageDeleted(message) {
    if (!message || !message.channel.guild) return;
    if (message.author && this.perms.checkUserChannel(message.author, message.channel, "msglog.whitelist.message.deleted")) return;
    //grab url's to the message's attachments
    let options = {};
    let fields = [];
    let attachment = {
      title: `Message Deleted`,
      fields,
    };
    if (message.member) {
      options.user = message.member;
    }
    if (message.id) {
      fields.push({
        title: "Age",
        value: utils.idToUTCString(message.id),
        short: true,
      })
    }
    if (message.channel) {
      fields.push({
        title: "Channel",
        value: message.channel.mention,
        short: true,
      })
    }
    if (message.author) {
      fields.push({
        title: "User",
        value: message.author.mention,
        short: true,
      })
    }
    if (message.content) {
      let field = {
        title: "Content",
        short: true,
      };
      if (message.content) {
        if (message.content.length > 144 || /[^0-9a-zA-Z\s.!?]/.test(message.content)) {
          field.value = utils.bubble(message.content);
        } else {
          field.value = "\n```diff\n-" + utils.clean(message.content) + "\n```";
        }
      }
      fields.push(field)
    }
    //if their are attachments log them.
    if (message.attachments) {
      for (let i in message.attachments) {
        if (message.attachments.hasOwnProperty(i)) {
          fields.push({
            title: "Attachment",
            value: message.attachments[i].proxy_url,
            short: true,
          });
        }
      }
    }
    //send everything off.
    this.sendHookedMessage("message.deleted", options, attachment, message.channel.guild.id)
  }

  messageUpdated(message, oldMessage) {
    if (!message || !message.channel.guild) return;
    if (oldMessage && message.content === oldMessage.content) return;
    if (message.author && this.perms.checkUserChannel(message.author, message.channel, "msglog.whitelist.message.updated")) return;
    //grab url's to the message's attachments
    let options = {};
    let fields = [];
    let attachment = {
      title: `Message Updated`,
      fields,
    };
    if (message.member) {
      options.user = message.member;
    }
    let content = false;
    let changeThresh = this.configDB.get("changeThresh", this.configDB.get("changeThresh", 1), {server: message.channel.guild.id});
    if (oldMessage && oldMessage.content) {
      if (utils.compare(message.content, oldMessage.content) > changeThresh) {
        content = `${utils.bubble(oldMessage.content)} to ${utils.bubble(message.content)}`;
      } else {
        return;
      }
    } else {
      content = `**Uncached** to ${utils.bubble(message.content)}`;
    }
    if (message.id) {
      fields.push({
        title: "Age",
        value: utils.idToUTCString(message.id),
        short: true,
      })
    }
    if (message.channel) {
      fields.push({
        title: "Channel",
        value: message.channel.mention,
        short: true,
      })
    }
    if (message.author) {
      fields.push({
        title: "User",
        value: message.author.mention,
        short: true,
      })
    }
    if (content) {
      let field = {
        title: "Content",
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
            title: "Attachment",
            value: message.attachments[i].proxy_url,
            short: true,
          });
        }
      }
    }
    //send everything off.
    this.sendHookedMessage("message.updated", options, attachment, message.channel.guild.id)
  };

  channelDeleted(channel) {
    if (!channel.guild) return;
    let fields = [{
      title: "Name",
      value: channel.name,
      short: true
    }, {
      title: "Age",
      value: utils.idToUTCString(channel.id),
      short: true
    }];
    if (channel.topic) {
      fields.push({
        title: "Topic",
        value: channel.topic,
        short: true
      })
    }
    this.sendHookedMessage("channel.deleted", {}, {
      title: "Channel Deleted",
      fields,
    }, channel.guild.id);
  };

  channelCreated(channel) {
    if (!channel.guild) return;
    this.sendHookedMessage("channel.created", {}, {
      title: "Channel Created",
      fields: [{
        title: "Channel",
        value: channel.mention,
        short: true
      }]
    }, channel.guild.id);
  };

  channelUpdated(channel, oldChannel) {
    let fields = [{
      title: "Channel",
      value: channel.mention,
      short: true,
    }, {
      title: "Age",
      value: utils.idToUTCString(channel.id),
      short: true,
    }];
    if (oldChannel.name != channel.name) {
      fields.push({
        title: "Name changed",
        value: `${utils.removeBlocks(oldChannel.name)} **to** ${utils.removeBlocks(channel.name)}`,
        short: true,
      })
    }
    if (oldChannel.topic != channel.topic) {
      fields.push({
        title: "Topic changed",
        value: `${utils.removeBlocks(oldChannel.topic)} **to** ${utils.removeBlocks(channel.topic)}`,
        short: true,
      });
    }

    let changes = findOverrideChanges(channel.permissionOverwrites, oldChannel.permissionOverwrites);

    for (let change of changes) {
      let newField = {short: true, value: ""};
      fields.push(newField);
      if (change.overwrite.type === "member") {
        newField.title = "User Overwrite";
        newField.value = `<@${change.overwrite.id}>`;
      }
      if (change.overwrite.type === "role") {
        newField.title = "Role Overwrite";
        newField.value = `<@&${change.overwrite.id}>`;
      }
      if (change.change === "add") {
        newField.value += ` added ${permissionsListFromNumber(change.overwrite)}`;
      } else if (change.change === "remove") {
        newField.value += ` removed ${permissionsListFromNumber(change.overwrite)}`;
      }
      else {
        let before = change.from;
        let after = change.to;

        if (before.allow !== after.allow) {
          if (before.allow > after.allow) {
            newField.value += ` Add allow ${permissionsListFromNumber(before.allow - after.allow)}`;
          } else {
            newField.value += ` Remove allow ${permissionsListFromNumber(after.allow - before.allow)}`;
          }
        }

        if (before.deny !== after.deny) {
          if (before.deny > after.deny) {
            newField.value += ` Add deny ${permissionsListFromNumber(before.deny - after.deny)}`;
          } else {
            newField.value += ` Remove deny ${permissionsListFromNumber(after.deny - before.deny)}`;
          }
        }
      }
    }
    if (fields.length > 2) {
      this.sendHookedMessage("channel.updated", {}, {title: "Channel Updated", fields}, channel.guild.id);
    }
  };

  userUpdate(user, oldUser) {
    if (!oldUser) return;
    let fields = [{
      title: "User",
      value: user.mention,
      short: true,
    }];
    let embed = {title: `Member Updated`, fields};
    if (oldUser.username !== user.username) {
      fields.push({
        title: "Username",
        value: `${utils.clean(oldUser.username)} to ${utils.clean(user.username)}`,
        short: true,
      });
    }
    if (oldUser.discriminator !== user.discriminator) {
      fields.push({
        title: "Discriminator",
        value: `${oldUser.discriminator} to ${user.discriminator}`,
        short: true,
      });
    }
    if (oldUser.avatar !== user.avatar) {
      let oldURL;
      if (oldUser.avatar != null) {
        oldURL = `https://cdn.discordapp.com/avatars/${user.id}/${oldUser.avatar}.${oldUser.avatar.startsWith("_a") ? "gif" : "png"}?size=128`;
      }
      fields.push({
        title: "Avatar",
        value: `${oldURL || "Default"} to ${user.avatarURL}`,
        short: true,
      });
      embed.image_url = user.avatarURL;
      if (oldURL) {
        embed.thumb_url = oldURL;
      }
    }
    if (fields.length < 2) return;
    this.client.guilds.forEach(guild => {
      if (guild.members.get(user.id)) {
        if (this.perms.checkUserGuild(user, guild, "msglog.whitelist.user")) return;
        this.sendHookedMessage("user", {user}, embed, guild.id);
      }
    });
  };

  roleCreated(guild, role) {
    this.sendHookedMessage("role.created", {}, {
      title: "Role Created", fields: [{
        title: "Role",
        value: role.mention,
        short: true,
      }]
    }, guild.id);
  }

  roleDeleted(guild, role) {
    this.sendHookedMessage("role.deleted", {}, {
      title: "Role Deleted", fields: [{
        title: "Role",
        value: role.mention,
        short: true,
      }, {
        title: "Name",
        value: role.name,
        short: true,
      }, {
        title: "Created",
        value: utils.idToUTCString(role.id),
        short: true,
      }]
    }, guild.id);
  }

  roleUpdated(guild, role, oldRole) {
    let fields = [{
      title: "Role",
      value: role.mention,
      short: true,
    }, {
      title: "Created",
      value: utils.idToUTCString(role.id),
      short: true,
    }];
    let oldPerms = arrayOfTrues(oldRole.permissions.json).toString();
    let newPerms = arrayOfTrues(role.permissions.json).toString();
    if (oldPerms !== newPerms) {
      fields.push({
        title: "Permissions",
        value: `${oldPerms} to ${newPerms}`,
        short: true,
      });
    }
    if (oldRole.name !== role.name) {
      fields.push({
        title: "Name Changed",
        value: `${utils.clean(oldRole.name)} to ${utils.clean(role.name)}`,
        short: true,
      });
    }
    if (oldRole.position !== role.position) {
      fields.push({
        title: "Position Changed",
        value: `${oldRole.position} to ${role.position}`,
        short: true,
      });
    }
    if (oldRole.hoist !== role.hoist) {
      fields.push({
        title: "Display separately",
        value: `${oldRole.hoist} to ${role.hoist}`,
        short: true,
      });
    }
    if (oldRole.color !== role.color) {
      fields.push({
        title: "Color",
        value: `${oldRole.color} to ${role.color}`,
        short: true,
      });
    }
    if (fields.length < 3) return;
    this.sendHookedMessage("role.updated", {}, {title: `Role Updated`, fields}, guild.id)
  };

  /**
   *
   * @param {Guild} server
   * @param {User | string} user
   * @param {User | null} instigator
   * @param {string | null} reason
   * @param {Error | null} error
   */
  async memberBanned(server, user, instigator, reason, error) {
    const node = instigator ? "moderation.action.ban" : "member.banned";

    const fields = [{
      title: "User",
      value: typeof user === "string" ? `<@${user}>` : user.mention,
      short: true,
    }];

    if (!instigator && !reason) {
      await utils.delay(1000);
      const possibleMeta = await getLastAuditLog(server, 22);
      console.log(possibleMeta);
      instigator = getAuditLogCause(possibleMeta);
      reason = getAuditLogReason(possibleMeta);
    }

    if (instigator) {
      fields.push({
        title: "Responsible Moderator",
        value: instigator.mention,
        short: true,
      })
    }

    if (reason) {
      fields.push({
        title: "Reason",
        value: utils.clean(reason),
        short: true,
      })
    }

    if (error) {
      fields.push({
        title: "Failed due to",
        value: utils.clean(error.toString()).slice(0, 250),
        short: true,
      })
    }

    this.sendHookedMessage(node, {user}, {
      title: "User Banned",
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
  memberUnbanned(server, user, instigator, reason, error) {
    let fields = [{
      title: "User",
      value: typeof user === "string" ? `<@${user}>` : user.mention,
      short: true,
    }];

    if (instigator) {
      fields.push({
        title: "Responsible Moderator",
        value: instigator.mention,
        short: true,
      })
    }

    if (reason) {
      fields.push({
        title: "Reason",
        value: utils.clean(reason),
        short: true,
      })
    }

    if (error) {
      fields.push({
        title: "Failed due to",
        value: utils.clean(error.toString()).slice(0, 250),
        short: true,
      })
    }

    this.sendHookedMessage(instigator ? "moderation.action.unban" : "member.unbanned", {user}, {
      title: "User Unbanned",
      fields,
    }, server.id);
  };

  memberAdded(server, user) {
    this.sendHookedMessage("member.added", {user}, {
      title: "User Joined", fields: [{
        title: "User",
        value: user.mention,
        short: true,
      }]
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
  memberRemoved(server, user, instigator, reason, error) {
    let fields = [{
      title: "User",
      value: typeof user === "string" ? `<@${user}>` : user.mention,
      short: true,
    }];

    if (typeof user !== "string") {
      fields.push({
        title: "Username",
        value: user.username,
        short: true,
      })
    }

    if (instigator) {
      fields.push({
        title: "Responsible Moderator",
        value: instigator.mention,
        short: true,
      })
    }

    if (reason) {
      fields.push({
        title: "Reason",
        value: utils.clean(reason),
        short: true,
      })
    }

    if (error) {
      fields.push({
        title: "Failed due to",
        value: utils.clean(error.toString()).slice(0, 250),
        short: true,
      })
    }

    this.sendHookedMessage(instigator ? "moderation.action.kick" : "member.removed", {user}, {
      title: "User Left or was Kicked",
      fields,
    }, server.id);
  }

  memberUpdated(guild, member, oldMember) {
    if (this.perms.checkUserGuild(member, guild, "msglog.whitelist.member.updated")) return;
    if (!oldMember) return;
    let fields = [{
      title: "User",
      value: member.mention,
      short: true,
    }];
    if (oldMember.nick != member.nick) {
      fields.push({
        title: "Nick",
        value: `${utils.clean(oldMember.nick)} to ${utils.clean(member.nick)}`,
        short: true,
      });
    }
    if (oldMember.voiceState) { // eris does not currently supply previous voice states. This will probably be added in the future.
      if (oldMember.voiceState.mute != member.voiceState.mute) {
        fields.push({
          title: "Muted",
          value: `${oldMember.voiceState.mute} to ${member.voiceState.mute}`,
          short: true,
        });
      }
      if (oldMember.voiceState.deaf != member.voiceState.deaf) {
        fields.push({
          title: "Death",
          value: `${oldMember.voiceState.deaf} to ${member.voiceState.deaf}`,
          short: true,
        });
      }
    }
    if (oldMember.roles.length < member.roles.length) {
      let newRole = findNewRoles(member.roles, oldMember.roles);
      fields.push({
        title: "Role Added",
        value: `<@&${newRole}>`,
        short: true,
      });
    }
    else if (oldMember.roles.length > member.roles.length) {
      let oldRole = findNewRoles(oldMember.roles, member.roles);
      fields.push({
        title: "Role Removed",
        value: `<@&${oldRole}>`,
        short: true,
      });
    }
    if (fields.length < 2) return;
    this.sendHookedMessage("member.updated", {user: member}, {title: `Member Updated`, fields}, guild.id);
  };

  voiceJoin(member, newChannel) {
    if (this.perms.checkUserChannel(member, newChannel, "msglog.whitelist.voice.join")) return;
    this.sendHookedMessage("voice.join", {user: member}, {
      title: "Voice Join", fields: [{
        title: "User",
        value: member.mention,
        short: true,
      }, {
        title: "Channel",
        value: newChannel.mention,
        short: true,
      }]
    }, newChannel.guild.id);
  }

  voiceSwitch(member, newChannel, oldChannel) {
    if (this.perms.checkUserChannel(member, newChannel, "msglog.whitelist.voice.switch")) return;
    this.sendHookedMessage("voice.switch", {user: member}, {
      title: "Voice Switch", fields: [{
        title: "User",
        value: member.mention,
        short: true,
      }, {
        title: "Old Channel",
        value: oldChannel.mention,
        short: true,
      }, {
        title: "New Channel",
        value: newChannel.mention,
        short: true,
      }]
    }, newChannel.guild.id);
  }

  voiceLeave(member, oldChannel) {
    if (this.perms.checkUserChannel(member, oldChannel, "msglog.whitelist.voice.leave")) return;
    this.sendHookedMessage("voice.leave", {user: member}, {
      title: "Voice Leave", fields: [{
        title: "User",
        value: member.mention,
        short: true,
      }, {
        title: "Channel",
        value: oldChannel.mention,
        short: true,
      }]
    }, oldChannel.guild.id);
  }
}

/**
 * Finds the differences
 * @param thing1 new
 * @param thing2 old
 * @returns {Array} of differences
 */
function findOverrideChanges(thing1, thing2) {
  let changes = [];
  thing1.forEach(permissionOverwrite => {
    let thing2Overwrite = thing2.get(permissionOverwrite.id);
    if (thing2Overwrite) {
      if (thing2Overwrite.allow !== permissionOverwrite.allow || thing2Overwrite.deny !== permissionOverwrite.deny) {
        changes.push({change: "change", from: permissionOverwrite, to: thing2Overwrite, overwrite: thing2Overwrite});
      }
    } else {
      changes.push({change: "add", overwrite: permissionOverwrite, type: permissionOverwrite.type});
    }
  });
  thing2.forEach(permissionOverwrite => {
    let thing1Overwrite = thing1.get(permissionOverwrite.id);
    if (!thing1Overwrite) {
      changes.push({change: "remove", overwrite: permissionOverwrite, type: permissionOverwrite.type});
    }
  });
  return changes;
}

/**
 * Returns string containing all the permissions from a permissions id.
 * @param {number} permissions
 * @returns {string} array of trues
 */
function permissionsListFromNumber(permissions) {
  return arrayOfTrues(new Eris.Permission(permissions).json).toString();
}

/**
 * Return an array of the objects keys that have the value true
 * @param {Object} object
 * @returns {boolean[]}
 */
function arrayOfTrues(object) {
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
 * @param more {Role[]} group of role's that has more roles
 * @param less {Role[]} group of role's that has less role's than more.
 * @return {Role|boolean} role not present in old array
 */
function findNewRoles(more, less) {
  for (let i of more) {
    if (!i) console.error(new Error("Found a null role 1?"));
    else if (!less.includes(i)) {
      return i;
    }
  }
  return false;
}

function getLastAuditLog(guild, event) {
  return guild.getAuditLogs(1, null, event).catch(error => null);
}

function getAuditLogTargetID(event) {
  if (event == null) return event;
  if (event.entries && event.entries.length > 0) {
    const entry = event.entries[0];
    return entry.targetID;
  }
}

function getAuditLogTarget(event) {
  if (event == null) return event;
  if (event.entries && event.entries.length > 0) {
    const entry = event.entries[0];
    return entry.target;
  }
}

function getAuditLogCause(event) {
  if (event == null) return event;
  if (event.entries && event.entries.length > 0) {
    const entry = event.entries[0];
    return entry.user;
  }
}

function getAuditLogReason(event) {
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
function getBar(current, total, length, char = "=") {
  let progress = Math.ceil(current / total * length);
  return `[${char.repeat(progress)}${" ".repeat(length - progress)}] ${current}/${total}`;
}

module.exports = moderationV2;
