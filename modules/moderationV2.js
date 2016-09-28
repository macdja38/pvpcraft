/**
 * Created by macdja38 on 2016-08-23.
 */

var Utils = require('../lib/utils');
var utils = new Utils();

var SlowSender = require('../lib/slowSender');

var colors = require('colors');

//this.logging = {"serverId": {"userJoin": ["channelId"], "msgDelete": ["channelId"]}};

module.exports = class moderationV2 {
  constructor(e) {
    this.client = e.client;
    //this.logging = {};
    this.config = e.config;
    this.perms = e.perms;
    this.configDB = e.configDB;
    this.raven = e.raven;
    this.feeds = e.feeds;
    this.tempServerIgnores = {};
    this._slowSender = new SlowSender(e);
  }

  getCommands() {
    return ["purge"];
  }

  onServerCreated() {
    //this.refreshMap();
  }

  onCommand(msg, command, perms) {
    if (command.command === "purge" && perms.check(msg, "moderation.tools.purge")) {
      let channel;
      if (/<#\d+>/.test(command.options.channel)) {
        channel = msg.channel.server.channels.get("id", command.options.channel.match(/<#(\d+)>/)[1]);
        if (!channel) {
          msg.reply("Cannot find that channel.")
        }
        return true;
      } else {
        channel = msg.channel;
      }
      let options = {};
      if (/<@!?\d+>/.test(command.options.user)) {
        let user = msg.channel.server.members.get("id", command.options.user.match(/<@!?(\d+)>/)[1]);
        if (user) {
          options.user = user;
        } else {
          msg.reply("Cannot find that user.")
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
      this.updateServerIgnores(1, channel.server.id);
      let purger;
      let status;
      let purgeQueue = [];
      let totalFetched = 0;
      let totalPurged = 0;
      let done = false;
      let statusMessage = false;
      let errorMessage = false;

      let updateStatus = (text) => {
        if (statusMessage) {
          this.client.updateMessage(statusMessage, text);
        } else {
          this.client.sendMessage(channel, text)
            .then(message => statusMessage = message)
            .catch(error => console.error(error));
        }
      };

      this.fetchMessages(channel, length, options, (messages, error)=> {
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
      purger = setInterval(()=> {
        if (purgeQueue.length > 0 && !errorMessage) {
          let messagesToPurge = purgeQueue.splice(0, 100);
          this.client.deleteMessages(messagesToPurge).then(()=> {
            totalPurged += messagesToPurge.length;
          }).catch((error)=> {
            if (error.response.body.code === 50013) {
              errorMessage = error.response.body.message;
              done = true;
              purgeQueue = [];
              updateStatus("```xl\ndiscord permission Manage Messages required to purge messages.```");
            } else if (error.response.status === 429) {
              purgeQueue = purgeQueue.concat(messagesToPurge);
            } else {
              console.error(error);
              console.error(error.response.body);
            }
          })
        } else if (done) {
          clearInterval(purger);
        }
      }, 1100);

      let updateStatusFunction = ()=> {
        if (done && purgeQueue.length === 0) {
          if (!errorMessage) {
            updateStatus(this.getStatus(totalPurged, totalFetched, length));
          }
          setTimeout(() => {
            this.client.deleteMessage(statusMessage);
            this.updateServerIgnores(-1, channel.server.id);
          }, 5000);
          clearInterval(status);
        }
        else {
          if (!errorMessage) {
            updateStatus(this.getStatus(totalPurged, totalFetched, length));
          }
        }
      };
      setTimeout(updateStatusFunction, 500);
      status = setInterval(updateStatusFunction, 2500);
      return true;
    }
  }

  getStatus(totalPurged, totalFetched, total) {
    return `\`\`\`xl\nStatus:\nPurged: ${getBar(totalPurged, totalFetched, 16)}\nFetched:${getBar(totalFetched, total, 16)}\n\`\`\``
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

  fetchMessages(channel, count, options={}, cb) {
    console.dir(options, {depth: 0});
    this.client.getChannelLogs(channel, Math.min(100, count), options.hasOwnProperty("before") ? {before: options.before} : {}).then((newMessages)=> {
      let newMessagesLength = newMessages.length;
      let highestMessage = newMessages[newMessages.length-1];
      if (options.hasOwnProperty("after")) {
        let index = newMessages.findIndex((m)=> m.id === options.after);
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
        options.before = highestMessage;
        process.nextTick(()=> {
          this.fetchMessages(channel, count, options, cb)
        });
      } else {
        if (options.hasOwnProperty("before") || newMessagesLength > 0) {
          cb(false, false);
        } else {
          cb(false, 'Permission "Read Messages" required.')
        }
      }
    }).catch((error)=> {
      cb(false, error);
    })
  }

  onReady() {
    //this.refreshMap();
    this.client.on("messageDeleted", this.messageDeleted.bind(this));
    this.client.on("messageUpdated", this.messageUpdated.bind(this));
    this.client.on("channelCreated", this.channelCreated.bind(this));
    this.client.on("channelUpdated", this.channelUpdated.bind(this));
    this.client.on("channelDeleted", this.channelDeleted.bind(this));
    this.client.on("serverRoleUpdated", this.roleUpdated.bind(this));
    this.client.on("serverMemberUpdated", this.memberUpdated.bind(this));
    this.client.on("serverNewMember", this.memberAdded.bind(this));
    this.client.on("serverMemberRemoved", this.memberRemoved.bind(this));
    this.client.on("userUnbanned", this.memberUnbanned.bind(this));
    this.client.on("userBanned", this.memberBanned.bind(this));
    this.client.on("presence", this.presence.bind(this));
    this.client.on("voiceJoin", this.voiceJoin.bind(this));
    this.client.on("voiceLeave", this.voiceLeave.bind(this));
    this._slowSender.onReady();
  }

  onDisconnect() {
    this.client.removeListener("messageDeleted", this.messageDeleted);
    this.client.removeListener("messageUpdated", this.messageUpdated);
    this.client.removeListener("channelCreated", this.channelCreated);
    this.client.removeListener("channelUpdated", this.channelUpdated);
    this.client.removeListener("channelDeleted", this.channelDeleted);
    this.client.removeListener("serverRoleUpdated", this.roleUpdated);
    this.client.removeListener("serverMemberUpdated", this.memberUpdated);
    this.client.removeListener("serverNewMember", this.memberAdded);
    this.client.removeListener("serverMemberRemoved", this.memberRemoved);
    this.client.removeListener("userUnbanned", this.memberUnbanned);
    this.client.removeListener("userBanned", this.memberBanned);
    this.client.removeListener("presence", this.presence);
    this.client.removeListener("voiceJoin", this.voiceJoin);
    this.client.removeListener("voiceLeave", this.voiceLeave);
    //this.logging = [];
    this._slowSender.onDisconnect();
  }

  /*
   /**
   * Rebuild the map of what get's logged where.
   */
  /*
   refreshMap() {
   for (let server in this.configDB.data) {
   if (!this.configDB.data.hasOwnProperty(server) || !this.configDB.data[server].hasOwnProperty("logs")) continue;
   let serverLogConfig = this.configDB.data[server]["logs"];
   for (let event in serverLogConfig) { //logItem is event name, serverLogConfig["logItem"] is an array of id's
   if (!serverLogConfig.hasOwnProperty(event)) continue;
   let eventChannelList = serverLogConfig[event];
   for (let id of eventChannelList) {
   let channel = this.client.channels.get("id", id);
   if (channel != null) {
   if (!this.logging.hasOwnProperty(server)) {
   this.logging[server] = {};
   }
   if (!this.logging[server].hasOwnProperty(event)) {
   this.logging[server][event] = [];
   }
   this.logging[server][event].push(channel);
   } else {
   //TODO: notify the server owner their mod log has been removed and that //setlog false will make that permanent.
   }
   }
   }
   }
   }
   */

  sendMessage(eventName, message, serverId) {
    this.feeds.find(`moderation.${eventName}`, serverId).forEach((channel)=> {
      channel = this.client.channels.get("id", channel);
      if (channel) {
        this._slowSender.sendMessage(channel, message, (error)=> {
          if (error) {
            console.error(error);
          }
        });
      }
    })
  }

  messageDeleted(message, channel) {
    if (!channel.hasOwnProperty("server") || !channel.server.hasOwnProperty("id")) return;
    try {
      if (message) {
        if (this.tempServerIgnores.hasOwnProperty(channel.id)) {
          return;
        }
        if (this.perms.checkUserChannel(message.author, channel, "msglog.whitelist.message.deleted")) return;
        //grab url's to the message's attachments
        var string = utils.clean(channel.name) + " | " + utils.fullNameB(message.author) + "'s message was deleted:\n";
        //if their's content log it.
        if (message.content) {
          if (message.content.length > 144 || /[^0-9a-zA-Z\s\.!\?]/.test(message.content)) {
            string += utils.bubble(message.content);
          } else {
            string += "\n```diff\n-" + utils.clean(message.content) + "\n```";
          }
        }
        //if their are attachments log them. maybe it's possible to attach more than one?
        if (message.attachments) {
          for (var i in message.attachments) {
            if (message.attachments.hasOwnProperty(i)) {
              string += message.attachments[i].proxy_url;
            }
          }
        }
        //send everything off.
        this.sendMessage("message.deleted", string, channel.server.id)
      }
      else {
        if (this.tempServerIgnores.hasOwnProperty(channel.server.id)) return;
        this.sendMessage("message.deleted", "An un-cached message in " +
          utils.clean(channel.name) + " was deleted, this probably means the bot was either recently restarted on the message was old.", channel.server.id);

      }
    } catch (e) {
      console.error(e);
      if (this.raven) {
        this.raven.captureException(e, {
          extra: {
            message: message,
            channel: channel
          }
        });
      }
    }
  }

  messageUpdated(message, newMessage) {
    try {
      if (!newMessage.server) return; //it's a pm so we don't log it.
      let server = newMessage.server;
      let changeThresh = this.configDB.get("changeThresh", this.configDB.get("changeThresh", 1), {server: server.id});
      if ((!message || message.content !== newMessage.content)) {
        if (message) {
          if (utils.compare(message.content, newMessage.content) > changeThresh) {
            if (this.perms.checkUserChannel(message.author, newMessage.channel, "msglog.whitelist.messageupdated")) return;
            if (message.content.length > 144 || /[^0-9a-zA-Z\s\.!\?]/.test(message.content) || /[^0-9a-zA-Z\s\.!\?]/.test(newMessage.content)) {
              this.sendMessage("message.updated", utils.clean(newMessage.channel.name) +
                " | " + utils.fullNameB(newMessage.author) + " changed: " + utils.bubble(message.content) +
                " to " + utils.bubble(newMessage.content)
                , server.id);
            }
            else {
              this.sendMessage("message.updated", utils.clean(newMessage.channel.name) +
                " | " + utils.fullNameB(newMessage.author) + "\n```diff\n-" + utils.clean(message.content) +
                "\n+" + utils.clean(newMessage.content) + "\n```"
                , server.id);
            }
          }
        } else {
          if (this.perms.checkUserChannel(newMessage.author, newMessage.channel, "msglog.whitelist.messageupdated")) return;
          this.sendMessage("message.updated", `${utils.clean(newMessage.channel.name)}` +
            ` | ${utils.fullNameB(newMessage.author)} changed: **An un-cached message** to ${utils.bubble(newMessage.content)}`,
            server.id)
        }
      }
    }
    catch (err) {
      console.error(err);
      console.error(err.stack);
      if (this.raven) {
        this.raven.captureException(err, {
          extra: {
            message: message,
            newMessage: newMessage
          }
        });
      }
    }
  };

  channelDeleted(channel) {
    try {
      if (channel.server) {
        this.sendMessage("channel.deleted", ":exclamation:Channel " + utils.clean(channel.name) + " was deleted, id: `" + channel.id + "`", channel.server.id);
      }
    }
    catch (err) {
      console.error(err);
      console.error(err.stack);
      if (this.raven) {
        this.raven.captureException(err, {
          extra: {
            channel: channel
          }
        });
      }
    }
  };

  channelUpdated(oldChannel, newChannel) {
    try {
      var text = ":exclamation:Channel change detected in " + utils.clean(oldChannel.name) + "\n";
      if (oldChannel.name != newChannel.name) {
        text += "        Name changed from `" + utils.removeBlocks(oldChannel.name) + "` to `" + utils.removeBlocks(newChannel.name) + "`\n";
      }
      if (oldChannel.topic != newChannel.topic) {
        text += "        Topic changed from `" + utils.removeBlocks(oldChannel.topic || null) + "` to `" + utils.removeBlocks(newChannel.topic) + "`\n";
      }
      var changes = findOverrideChanges(oldChannel.permissionOverwrites, newChannel.permissionOverwrites);

      for (var change of changes) {
        var newTargetName;
        if (change.override.type === "member") {
          newTargetName = utils.fullName(newChannel.server.members.get("id", change.override.id));
        }
        if (change.override.type === "role") {
          newTargetName = utils.clean((newChannel.server.roles.get("id", change.override.id) || {name: "unknown"}).name);
        }
        if (change.change == "remove" || change.change == "add") {
          text += "        Channel override " + change.change + " from " + change.override.type + " " + newTargetName + "\n";
        }
        else {
          text += "        Channel override on "
            + change.override.type
            + " " + newTargetName
            + " "
            + change.change
            + " changed `"
            + (change.change === "allow" ? change.from.allowed : change.from.denied )
            + "` to `"
            + (change.change === "allow" ? change.to.allowed : change.to.denied )
            + "`\n";
        }
      }
      if (text !== ":exclamation:Channel change detected in " + utils.clean(oldChannel.name) + "\n") {
        this.sendMessage("channel.updated", text, newChannel.server.id);
      }
    }
    catch (err) {
      console.error(err);
      console.error(err.stack);
      if (this.raven) {
        this.raven.captureException(err, {
          extra: {
            oldChannel: oldChannel,
            newChannel: newChannel
          }
        });
      }
    }
  };

  channelCreated(channel) {
    try {
      if (channel.server) { //if che channel does not have a server it's a private message and we don't need to log it.
        this.sendMessage("channel.created", ":exclamation:Channel " + utils.clean(channel.name) + " was created, id: `" + channel.id + "`", channel.server.id);
      }
    }
    catch (err) {
      console.error(err);
      console.error(err.stack);
      if (this.raven) {
        this.raven.captureException(err, {
          extra: {
            channel: channel
          }
        });
      }
    }
  };

  presence(oldUser, newUser) {
    try {
      if (oldUser.username != newUser.username || oldUser.discriminator != newUser.discriminator || (oldUser.avatar != newUser.avatar && !newUser.bot)) {
        var text = ":exclamation:User change detected in " + utils.fullNameB(oldUser) + "\n";
        if (oldUser.username != newUser.username) {
          text += "        Username changed from " + utils.removeBlocks(oldUser.username) + " to " + utils.removeBlocks(newUser.username) + "\n";
        }
        if (oldUser.discriminator != newUser.discriminator) {
          text += "        Discriminator changed from " + oldUser.discriminator + " to " + newUser.discriminator + "\n";
        }
        if (oldUser.avatar != newUser.avatar && !newUser.bot) {
          text += "        Avatar changed from " + oldUser.avatarURL + " to " + newUser.avatarURL + "\n";
        }
        this.client.servers.forEach(server => {
          if (server.members.has("id", newUser.id)) {
            this.sendMessage("user", text, server.id)
          }
        });
        /*for (var serverid in this.logging) {
         if (this.logging.hasOwnProperty(serverid)) {
         var server = this.client.servers.get("id", serverid);
         if (server && server.members.get("id", newUser.id)) {
         this.log(server, text)
         }
         }
         }*/
      }
    }
    catch (err) {
      console.error(err);
      console.error(err.stack);
      if (this.raven) {
        this.raven.captureException(err, {
          extra: {
            oldUser: oldUser,
            newUser: newUser
          }
        });
      }
    }
  };

  roleUpdated(oldRole, newRole) {
    try {
      var text = ":exclamation:Role change detected in " + utils.clean(oldRole.name) + "#" + oldRole.id + "\n";
      var oldText = text;
      let oldPerms = arrayOfTrues(oldRole.serialize()).toString();
      let newPerms = arrayOfTrues(newRole.serialize()).toString();
      if (oldPerms !== newPerms) {
        text += "Permissions changed from `" + oldPerms + "` to `" + newPerms + "`\n";
      }
      if (oldRole.name != newRole.name) {
        text += "Name changed from " + utils.clean(oldRole.name) + " to " + utils.clean(newRole.name) + "\n";
      }
      if (oldRole.position != newRole.position) {
        text += "Position changed from " + oldRole.position + " to " + newRole.position + "\n";
      }
      if (oldRole.hoist != newRole.hoist) {
        text += "Hoist changed from " + oldRole.hoist + " to " + newRole.hoist + "\n";
      }
      if (oldRole.color != newRole.color) {
        text += "Colour changed from " + oldRole.color + " to " + newRole.color + "\n";
      }
      if (text !== oldText) {
        this.sendMessage("role.updated", text, newRole.server.id)
      }
    }
    catch (err) {
      console.error(err);
      console.error(err.stack);
      if (this.raven) {
        this.raven.captureException(err, {
          extra: {
            oldRole: oldRole,
            newRole: newRole
          }
        });
      }
    }
  };

  memberBanned(user, server) {
    try {
      this.sendMessage("member.banned", ":exclamation::outbox_tray: " + utils.fullName(user) + " was Banned, id: `" + user.id + "`", server.id);
    }
    catch (err) {
      console.error(err);
      console.error(err.stack);
      if (this.raven) {
        this.raven.captureException(err, {
          extra: {
            server: server,
            user: user
          }
        });
      }
    }
  };

  memberUnbanned(user, server) {
    try {
      this.sendMessage("member.unbanned", ":exclamation::inbox_tray: " + utils.fullName(user) + " was unbanned, id: `" + user.id + "`", server.id);
    }
    catch (err) {
      console.error(err);
      console.error(err.stack);
      if (this.raven) {
        this.raven.captureException(err, {
          extra: {
            server: server,
            user: user
          }
        });
      }
    }
  };

  memberAdded(server, user) {
    try {
      this.sendMessage("member.added", ":inbox_tray: " + utils.fullName(user) + " Joined, id: `" + user.id + "`", server.id);
    }
    catch (err) {
      console.error(err);
      console.error(err.stack);
      if (this.raven) {
        this.raven.captureException(err, {
          extra: {
            server: server,
            user: user
          }
        });
      }
    }
  };

  memberRemoved(server, user) {
    try {
      this.sendMessage("member.removed", ":outbox_tray: " + utils.fullName(user) + " Left or was kicked, id: `" + user.id + "`", server.id);
    }
    catch (err) {
      console.error(err);
      console.error(err.stack);
      if (this.raven) {
        this.raven.captureException(err, {
          extra: {
            server: server,
            user: user
          }
        });
      }
    }
  };

  memberUpdated(server, newUser, oldMember) {
    try {
      var newMember = server.detailsOfUser(newUser);
      if (oldMember && newMember && (oldMember.roles.length != newMember.roles.length || oldMember.mute != newMember.mute || oldMember.deaf != newMember.deaf || oldMember.nick != newMember.nick)) {
        var text = ":exclamation:User change detected in " + utils.fullNameB(newUser) + "\n";
        if (oldMember.nick != newMember.nick) {
          text += "        Nick changed from `" + utils.removeBlocks(oldMember.nick) + "` to `" + utils.removeBlocks(newMember.nick) + "`\n";
        }

        if (oldMember.mute != newMember.mute) {
          text += "        Is-muted changed from `" + oldMember.mute + "` to `" + newMember.mute + "`\n";
        }
        if (oldMember.deaf != newMember.deaf) {
          text += "        Is-deaf changed from `" + oldMember.deaf + "` to `" + newMember.deaf + "`\n";
        }


        if (oldMember.roles.length < newMember.roles.length) {
          var newRole = findNewRoles(newMember.roles, oldMember.roles);
          if (newRole) {
            text += "        Role added `" + newRole.name + "`\n";
          } else {
            this.raven.captureError(new Error("Error finding role difference", {
              user: newUser,
              extra: {
                oldMemberRoles: oldMember.roles,
                newMemberRoles: newMember.roles
              }
            }));
            console.error("Error finding adding new Role");
            console.error(newMember.roles);
            console.error(oldMember.roles);
          }
        }
        else if (oldMember.roles.length > newMember.roles.length) {
          var oldRole = findNewRoles(oldMember.roles, newMember.roles);
          if (oldRole) {
            text += "        Role removed `" + oldRole.name + "`\n";
          } else {
            this.raven.captureError(new Error("Error finding role difference", {
              user: newUser,
              extra: {
                oldMemberRoles: oldMember.roles,
                newMemberRoles: newMember.roles
              }
            }));
            console.error("Error removed Role");
            console.error(newMember.roles);
            console.error(oldMember.roles);
          }
        }
        this.sendMessage("member.updated", text, server.id);
      }
    }
    catch (err) {
      console.error(err);
      console.error(err.stack);
      if (this.raven) {
        this.raven.captureException(err, {
          extra: {
            server: server,
            newUser: newUser,
            oldMember: oldMember
          }
        });
      }
    }
  };

  voiceJoin(channel, user) {
    try {
      this.sendMessage("voice.join", `:notes: ${utils.fullNameB(user)} joined voice channel ${channel.name}`, channel.server.id)
    } catch (err) {
      console.error(err);
      console.error(err.stack);
      if (this.raven) {
        this.raven.captureException(err, {
          extra: {
            message: message,
            channel: channel
          }
        });
      }
    }
  };

  voiceSwitch(oldChannel, newChannel, user) {
    try {
      this.sendMessage("voice.switch", `:notes: ${utils.fullNameB(user)} moved from ${utils.clean(oldChannel.name)} to ${utils.clean(newChannel.name)}`, newChannel.server.id)
    } catch (err) {
      console.error(err);
      console.error(err.stack);
      if (this.raven) {
        this.raven.captureException(err, {
          extra: {
            message: message,
            channel: channel
          }
        });
      }
    }
  };

  voiceLeave(channel, user) {
    try {
      this.sendMessage("voice.leave", `:notes: ${utils.fullNameB(user)} left voice channel ${channel.name}`, channel.server.id)
    } catch (err) {
      console.error(err);
      console.error(err.stack);
      if (this.raven) {
        this.raven.captureException(err, {
          extra: {
            message: message,
            channel: channel
          }
        });
      }
    }
  };
};

function findOverrideChanges(thing1, thing2) {
  var changes = [];
  if (thing1.length >= thing2.length) {
    thing1.forEach(
      (i)=> {
        var j = thing2.get("id", i.id);
        if (j) {
          for (var k in i) {
            if (i.hasOwnProperty(k) && i[k] !== j[k]) {
              changes.push({"change": k, "override": i, "from": i, "to": j});
            }
          }
        }
        else {
          changes.push({"change": "remove", "override": i})
        }
      }
    );
  } else {
    thing2.forEach(
      (i)=> {
        if (!thing1.get("id", i.id)) {
          changes.push({"change": "add", "override": i})
        }
      }
    );
  }
  return changes;
}

/**
 * Return an array of the objects keys that have the value true
 * @param object
 * @returns {Array}
 */
function arrayOfTrues(object) {
  var arr = [];
  for (let key in object) {
    if (object.hasOwnProperty(key) && object[key] === true) {
      arr.push(key)
    }
  }
  return arr;
}

/**
 * return {Object} roles present in oldR that are not in newR
 * @param more {Object} group of role's that has more roles
 * @param less {Object} group of role's that has less role's than more.
 */
function findNewRoles(more, less) {
  for (var i of more) {
    if (!i) console.error(new Error("Found a null role 1?"));
    else if (!roleIn(i, less)) {
      return i;
    }
  }
  return false;
}

function roleIn(role, newRoles) {
  for (var j of newRoles) {
    if (!j) console.error(new Error("Found a null role"));
    else if (role.id == j.id) {
      return true;
    }
  }
  return false;
}

function getBar(current, total, length, char = "=") {
  let progress = Math.ceil(current / total * length);
  return `[${char.repeat(progress)}${" ".repeat(length - progress)}] ${current}/${total}`;
}