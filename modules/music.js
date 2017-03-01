/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

const Player = require('../lib/Player.js');

let key = require('../config/auth.json').youtubeApiKey || null;
if (key == "key") {
  key = null;
}

/**
 *
 * @type {music}
 * @param {Player} boundChannels
 */
class music {
  /**
   * Instantiates the module
   * @constructor
   * @param {Object} e
   * @param {Client} e.client Eris client
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
    this.fileConfig = e.config;
    this.config = e.configDB;
    this.raven = e.raven;
    this.r = e.r;
    this.conn = e.conn;
    this.leaveChecker = false;
    this.boundChannels = [];
  }

  static getCommands() {
    return ["init", "play", "skip", "list", "time", "pause", "resume", "volume", "shuffle", "next", "destroy", "logchannel", "link"];
  }

  onReady() {
    if (!this.leaveChecker) {
      this.leaveChecker = setInterval(this.leaveUnused.bind(this), 60000);
    }
  }

  init(id, msg, command, perms) {
    return new Promise((resolve, reject) => {
      let voiceChannel = msg.channel.guild.channels.get(msg.member.voiceState.channelID);
      if (!perms.checkUserChannel(msg.author, voiceChannel, "music.initinto")) {
        command.reply("Sorry but you need the permission `music.initinto` in this voice channel to summon the bot here." +
          " Please try another voice channel or contact a mod/admin if you believe this is in error.");
        return true;
      }
      this.boundChannels[id] = new Player({
        client: this.client,
        voiceChannel,
        textChannel: msg.channel,
        apiKey: key,
        raven: this.raven,
        r: this.r,
        conn: this.conn,
        config: this.config
      });
      msg.channel.createMessage(msg.author.mention + ", Binding to **" + voiceChannel.name + "** and **" + msg.channel.name + "**");
      this.boundChannels[id].init(msg).then(() => {
        command.reply(`Bound successfully use ${command.prefix}destroy to unbind it.`);
        resolve(this.boundChannels[id]);
      }).catch(error => {
        console.error(error);
        command.reply(error);
        reject(error);
        delete this.boundChannels[id];
      });
    });
  }

  leaveUnused() {
    Object.keys(this.boundChannels).forEach((id) => {
      let channel = this.boundChannels[id];
      if (channel.connection && channel.ready && channel.connection.playing !== true) {
        console.log(channel.lastPlay);
        if (Date.now() - channel.lastPlay > 600000) {
          console.log("leaving");
          channel.text.createMessage("Leaving voice channel due to inactivity.")
            .catch((error) => {
              // does not matter if it fails to send the message, we leave anyway
            })
            .then(() => {
              channel.destroy();
              delete this.boundChannels[id];
            })
        }
      }
    });
  }


  onDisconnect() {
    if (this.leaveChecker) {
      clearInterval(this.leaveChecker);
    }
    for (let i in this.boundChannels) {
      if (this.boundChannels.hasOwnProperty(i))
        this.boundChannels[i].text.createMessage("Sorry for the inconvenience bot the bot is restarting or disconnected from discord.");
      this.boundChannels[i].destroy();
      delete this.boundChannels[i];
    }
  }

  /**
   * Called with a command, returns true or a promise if it is handling the command, returns false if it should be passed on.
   * @param {Message} msg
   * @param {Command} command
   * @param {Permissions} perms
   * @returns {boolean | Promise}
   */
  onCommand(msg, command, perms) {
    if (!msg.channel.guild) return false; //this is a pm... we can't do music stuff here.
    let id = msg.channel.guild.id;

    if (command.command === "init" && perms.check(msg, "music.init")) {
      if (this.boundChannels.hasOwnProperty(id)) {
        command.reply(`Sorry already in use in this server. Use ${command.prefix}destroy to erase that connection.`);
        return true;
      }
      if (msg.member.voiceState.channelID) {
        this.init(id, msg, command, perms)
          .catch((error) => { /* failure is handled up the chain, this can be used by other things to determine if it fails, but this command does not care. */
            console.error(error);
          });
      }
      else {
        msg.channel.createMessage(msg.member.mention + ", You must be in a voice channel this command. If you are currently in a voice channel please rejoin it.")
      }
      return true;
    }

    if (command.command === "destroy" && perms.check(msg, "music.destroy")) {
      if (this.boundChannels.hasOwnProperty(id)) {
        this.boundChannels[id].destroy();
        command.reply("Disconnecting from voice chat and unbinding from text chat.");
        delete this.boundChannels[id];
      } else {
        command.reply("Not bound.");
      }
      return true;
    }

    if (command.command === "play" && perms.check(msg, "music.play")) {
      if (!msg.member.voiceState.channelID) {
        msg.channel.createMessage(msg.author.mention + ", You must be in the current voice channel to queue a song. If you are already in the voice channel please leave and rejoin or toggle your mute.");
        return true;
      }
      if (command.args.length < 1) {
        msg.channel.createMessage(msg.author.mention + ", Please specify a youtube video search term or playlist!");
        return true;
      }
      if (!this.boundChannels.hasOwnProperty(id)) {
        if (perms.check(msg, "music.init")) {
          this.init(id, msg, command, perms).then(() => {
            let queueCount = perms.check(msg, "music.songcount", {type: "number"});
            console.log("queueCount", queueCount);
            if (typeof(queueCount === "number")) {
              this.boundChannels[id].enqueue(msg, command.args, queueCount);
            } else {
              this.boundChannels[id].enqueue(msg, command.args);
            }
          });
        } else {
          command.reply(`Please have someone with the permission node \`music.init\` run ${command.prefix}init`)
        }
      } else {
        if (!this.boundChannels[id].ready) {
          command.reply("Connection is not ready");
          return true;
        }
        let queueCount = perms.check(msg, "music.songcount", {type: "number"});
        console.log("queueCount", queueCount);
        if (typeof(queueCount === "number")) {
          this.boundChannels[id].enqueue(msg, command.args, queueCount)
        } else {
          this.boundChannels[id].enqueue(msg, command.args)
        }
      }
      return true;
    }


    if ((command.command === "next" || command.command === "skip") && (perms.check(msg, "music.voteskip") || perms.check(msg, "music.forceskip"))) {
      console.log("Got Next");
      if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].ready) {
        if (this.boundChannels[id].currentVideo) {
          let index = command.args[0] ? parseInt(command.args[0]) - 1 : -1;
          let isForced = (perms.check(msg, "music.forceskip") && command.flags.indexOf('f') > -1);
          let video;
          if (index === -1) {
            video = this.boundChannels[id].currentVideo;
          }
          else if (this.boundChannels[id].queue.hasOwnProperty(index)) {
            video = this.boundChannels[id].queue[index];
          }
          else {
            command.reply("Could not find the song");
            return true;
          }
          console.log("Next Stage 1");
          if (video.votes.indexOf(msg.author.id) < 0 || isForced) {
            video.votes.push(msg.author.id);
            if (video.votes.length > (this.boundChannels[id].voice.voiceMembers.size / 3) || isForced) {
              command.reply("Removing " + video.prettyPrint() + " From the queue");
              if (index === -1) {
                this.boundChannels[id].skipSong();
              }
              else {
                this.boundChannels[id].queue.splice(index, 1);
              }
            }
            else {
              command.reply(video.votes.length + " / " + (Math.floor(this.boundChannels[id].voice.voiceMembers.size / 3) + 1) + " votes needed to skip " +
                video.prettyPrint());
            }
          }
          else {
            command.reply("Sorry, you may only vote to skip once per song.");
            return true;
          }
        }
        else {
          command.reply("No songs to skip, queue a song using //play <youtube url of video or playlist>");
          return true;
        }
      } else {
        command.reply("Please bind a channel first using " + command.prefix + "init");
        return true;
      }
      return true;
    }


    if (command.command === "pause" && perms.check(msg, "music.pause")) {
      if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection")) {
        if (this.boundChannels[id].connection.playing && !this.boundChannels[id].connection.paused) {
          this.boundChannels[id].pause();
          command.reply(`Paused Playback use ${command.prefix}resume to resume it.`)
        } else {
          command.reply(`Cannot pause unless something is being played`)
        }
      } else {
        msg.channel.createMessage("Sorry, Bot is not currently in a voice channel use " + command.prefix + "init while in a voice channel to bind it.")
      }
      return true;
    }


    if (command.command === "resume" && perms.check(msg, "music.resume")) {
      if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection")) {
        if (this.boundChannels[id].connection.paused) {
          this.boundChannels[id].resume(msg);
          command.reply("Playback resumed.")
        } else {
          command.reply(`Cannot resume unless something is paused.`)
        }
      } else {
        msg.channel.createMessage("Sorry, Bot is not currently in a voice channel use " + command.prefix + "init while in a voice channel to bind it.")
      }
      return true;
    }


    if (command.commandnos === "list" && perms.check(msg, "music.list")) {
      if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection")) {
        if (this.boundChannels[id].currentVideo) {
          msg.channel.createMessage("```xl\n" + this.boundChannels[id].prettyList()
            + "```\n" + this.fileConfig.get("website", {musicUrl: "https://bot.pvpcraft.ca/login/"}).musicUrl.replace(/\$id/, msg.channel.guild.id), (error) => {
            if (error) {
              console.log(error)
            }
          });
        } else {
          msg.channel.createMessage("Sorry, no song's found in playlist. use " + command.prefix + "play <youtube vid or playlist> to add one.")
        }
      } else {
        msg.channel.createMessage("Sorry, Bot is not currently in a voice channel use " + command.prefix + "init while in a voice channel to bind it.")
      }
      return true;
    }


    if (command.commandnos === "time" && perms.check(msg, "music.time")) {
      if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection")) {
        if (this.boundChannels[id].currentVideo) {
          msg.channel.createMessage("Currently " + this.boundChannels[id].prettyTime() + " into " + this.boundChannels[id].currentVideo.prettyPrint());
        } else {
          msg.channel.createMessage("Sorry, no song's found in playlist. use " + command.prefix + "play <youtube vid or playlist> to add one.")
        }
      } else {
        msg.channel.createMessage("Sorry, Bot is not currently in a voice channel use " + command.prefix + "init while in a voice channel to bind it.")
      }
      return true;
    }

    if (command.commandnos === "link" && perms.check(msg, "music.link")) {
      if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection")) {
        if (this.boundChannels[id].currentVideo) {
          msg.channel.createMessage(`The link to ${this.boundChannels[id].currentVideo.prettyPrint()} is ${this.boundChannels[id].currentVideo.link}`);
        } else {
          msg.channel.createMessage("Sorry, no song's found in playlist. use " + command.prefix + "play <youtube vid or playlist> to add one.")
        }
      } else {
        msg.channel.createMessage("Sorry, Bot is not currently in a voice channel use " + command.prefix + "init while in a voice channel to bind it.")
      }
      return true;
    }

    if (command.commandnos === "volume" && (perms.check(msg, "music.volume.set") || perms.check(msg, "music.volume.list"))) {
      command.reply("In order to vastly increase performance volume is currently disabled, This feature may be re-enabled in the future");
      return true;
      if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection")) {
        if (command.args[0] && perms.check(msg, "music.volume.set")) {
          let volume = parseInt(command.args[0]);
          if (111 > volume && volume > 4) {
            this.boundChannels[id].setVolume(volume);
            command.reply(`Volume set to **${volume}**`).catch(perms.getAutoDeny(msg));

          } else {
            command.reply("Sorry, invalid volume, please enter a number between 5 and 110").catch(perms.getAutoDeny(msg));
          }
          return true;
        } else {
          if (perms.check(msg, "music.volume.list")) {
            command.reply("Current volume is **" + this.boundChannels[id].getVolume() + "**").catch(perms.getAutoDeny(msg));
            return true;
          }
          return false;
        }
      } else {
        if (perms.check(msg, "music.volume.list") || perms.check(msg, "music.volume.set")) {
          msg.channel.createMessage(`Sorry, Bot is not currently in a voice channel use ${command.prefix} init while in a voice channel to bind it.`);
          return true;
        }
        else {
          return false;
        }
      }
    }


    if (command.command === "shuffle" && perms.check(msg, "music.shuffle")) {
      if (this.possiblySendNotConnected(msg, command)) return;
      if (this.boundChannels[id].queue.length > 1) {
        msg.channel.createMessage(this.boundChannels[id].shuffle());
      } else {
        msg.channel.createMessage("Sorry, not enough song's in playlist.")
      }
      return true;
    }


    if (command.commandnos === "logchannel" && perms.check(msg, "music.logchannels")) {
      let text = "Playing Music in:\n";
      for (let i in this.boundChannels) {
        if (this.boundChannels.hasOwnProperty(i)) {
          text += `Server: ${this.boundChannels[i].server.name} in voice channel ${this.boundChannels[i].text.name}\n`
        }
      }
      if (text != "Playing Music in:\n") {
        msg.channel.createMessage(text);
      }
      else {
        msg.channel.createMessage("Bot is currently not in use");
      }
      return true;
    }

    return false;
  }

  /**
   *
   * @param {Message} msg
   * @param {Command} command
   * @returns {boolean}
   */
  possiblySendNotConnected(msg, command) {
    let id = msg.channel.guild.id;
    if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection")) {
      msg.channel.createMessage("Sorry, Bot is not currently in a voice channel use " + command.prefix + "init while in a voice channel to bind it.");
      return true;
    }
    return false;
  }
}

module.exports = music;