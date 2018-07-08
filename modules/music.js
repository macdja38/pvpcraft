/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

const Player = require('../lib/Player.js');
const MusicDB = require("../lib/MusicDB");
const SlowSender = require("../lib/SlowSender");

let key = require('../config/auth.json').youtubeApiKey || null;
if (key === "key") {
  key = null;
}

let videoUtils = require("../lib/videoUtils");

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
   * @param {Function} e.i10010n internationalization function
   */
  constructor(e) {
    this.client = e.client;
    this.fileConfig = e.config;
    this.config = e.configDB;
    this.raven = e.raven;
    this.perms = e.perms;
    this._slowSender = new SlowSender(e);
    this.r = e.r;
    this.musicDB = new MusicDB(this.r, {key});
    this.leaveChecker = false;
    this.boundChannels = [];
    this.i10010n = e.i10010n;
  }

  onReady() {
    this._slowSender.onReady();
    if (!this.leaveChecker) {
      this.leaveChecker = setInterval(this.leaveUnused.bind(this), 60000);
    }
    return this.musicDB.getBoundChannels(this.client.guilds.map(g => g.id)).then((queues) => {
      queues.forEach(queue => {
        let guild = this.client.guilds.get(queue.id);
        if (!guild) return;
        let text = guild.channels.get(queue.text_id);
        let voice = guild.channels.get(queue.voice_id);
        if (text && voice && !this.boundChannels.hasOwnProperty(queue.id)) {
          this.boundChannels[queue.id] = new Player({
            client: this.client,
            voiceChannel: voice,
            textChannel: text,
            apiKey: key,
            raven: this.raven,
            musicDB: this.musicDB,
            slowSender: this._slowSender,
            r: this.r,
            debug: queue.debug || false,
            config: this.config,
          });
          return this.boundChannels[queue.id].init(voice)
            .then((player) => {
              if (player.currentVideo == null) {
                player.playNext();
              }
            })
            .catch(error => {
              if (error.toString() === "Insufficient permissions to join / speak in voice channel.") {
                text.createMessage(this.i10010n() `Insufficient permissions to resume into voice channel. Cannot resume music.`).catch(console.error);
                delete this.boundChannels[queue.id];
                this.musicDB.unbind(queue.id);
                return;
              }
              text.createMessage(this.i10010n() `${error.toString()} While rebinding to voice channel`).catch(console.error);
              delete this.boundChannels[queue.id];
              throw error;
            });
        }
      })
    })
  }

  init(id, command, perms, debug = false) {
    let returnPromise = new Promise((resolve, reject) => {
      let voiceChannel = command.channel.guild.channels.get(command.member.voiceState.channelID);
      if (!perms.checkUserChannel(command.author, voiceChannel, "music.initinto")) {
        command.replyAutoDeny(this.i10010n() `Sorry but you need the permission \`music.initinto\` in this voice channel to summon the bot here. \
Please try another voice channel or contact a mod/admin if you believe this is in error.`);
        return true;
      }
      this.boundChannels[id] = new Player({
        client: this.client,
        voiceChannel,
        textChannel: command.channel,
        apiKey: key,
        raven: this.raven,
        musicDB: this.musicDB,
        slowSender: this._slowSender,
        r: this.r,
        debug,
        config: this.config,
      });
      this.musicDB.bind(id, command.channel.guild.name, command.channel.name, command.channel.id, voiceChannel.name, voiceChannel.id);
      command.replyAutoDeny(this.i10010n() `Binding to **${voiceChannel.name}** and **${command.channel.name}**`);
      return this.boundChannels[id].init(voiceChannel).then(() => {
        command.replyAutoDeny(this.i10010n() `Bound successfully use ${command.prefix}destroy to unbind it.`);
        resolve(this.boundChannels[id]);
      }).catch(error => {
        command.replyAutoDeny(error.toString()).catch(console.error);
        reject(error);
        delete this.boundChannels[id];
      });
    });
    returnPromise.catch(() => {
    });
    return returnPromise;
  }

  leaveUnused() {
    Object.keys(this.boundChannels).forEach((id) => {
      let channel = this.boundChannels[id];
      if (channel.connection
        && channel.ready
        && channel.connection.playing !== true
        && (Date.now() - channel.lastPlay > 600000)
        && channel.voice
        && channel.voice.voiceMembers.size < 2) {
        channel.text.createMessage(this.i10010n() `Leaving voice channel due to inactivity.`)
          .catch((error) => {
            // does not matter if it fails to send the message, we leave anyway
          })
          .then(() => {
            try {
              this.musicDB.unbind(id);
              channel.destroy(true);
            } catch (error) {

            }
            delete this.boundChannels[id];
          })
      }
    });
  }


  onDisconnect() {
    this._slowSender.onDisconnect();
    if (this.leaveChecker) {
      clearInterval(this.leaveChecker);
    }
    for (let i in this.boundChannels) {
      if (this.boundChannels.hasOwnProperty(i))
        this.boundChannels[i].text.createMessage(this.i10010n() `Sorry for the inconvenience the bot is restarting or was disconnected from discord.`);
      try {
        this.boundChannels[i].destroy(false);
      } catch (err) {

      }
      delete this.boundChannels[i];
    }
  }

  /**
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent() {
    return {
      name: "Music",
      description: "Play music with pvpcraft",
      key: "music",
      permNode: "music",
      commands: this.getCommands(),
    };
  }

  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands() {
    return [{
      triggers: ["init"],
      permissionCheck: this.perms.genCheckCommand("music.init"),
      channels: ["guild"],
      execute: command => {
        const id = command.channel.guild.id;
        if (this.boundChannels.hasOwnProperty(id)) {
          command.replyAutoDeny(i10010n`Sorry already in use in this server. Use ${command.prefix}destroy to erase that connection.`);
          return true;
        }
        if (command.member.voiceState.channelID) {
          this.init(id, command,this.perms, command.flags.includes("d"));
        }
        else {
          command.createMessageAutoDeny(this.i10010n() `${command.member.mention}, You must be in a voice channel this command. If you are currently in a voice channel please rejoin it.`);
        }
        return true;
      },
    }, {
      triggers: ["destroy"],
      permissionCheck: this.perms.genCheckCommand("music.destroy"),
      channels: ["guild"],
      execute: command => {
        const id = command.channel.guild.id;
        if (!this.boundChannels.hasOwnProperty(id)) {
          command.replyAutoDeny(this.i10010n() `Not bound. Double checking all bindings have been destroyed.`);
          this.client.leaveVoiceChannel(command.channel.id);
          return true;
        }
        try {
          this.musicDB.unbind(id);
          this.boundChannels[id].destroy(true);
        } catch (error) {

        }
        command.replyAutoDeny(this.i10010n() `Disconnecting from voice chat and unbinding from text chat.`);
        delete this.boundChannels[id];
        return true;
      },
    }, {
      triggers: ["play"],
      permissionCheck: this.perms.genCheckCommand("music.play"),
      channels: ["guild"],
      execute: async command => {
        const id = command.channel.guild.id;
        if (!command.member.voiceState.channelID) {
          command.replyAutoDeny(this.i10010n() `You must be in the current voice channel to queue a song. If you are already in the voice channel please leave and rejoin or toggle your mute.`);
          return true;
        }
        if (command.args.length < 1) {
          command.replyAutoDeny(this.i10010n() `Please specify a youtube video, search term, or playlist!\nplay <video, search term, playlist>`);
          return true;
        }

        if (!this.boundChannels.hasOwnProperty(id)) {
          if (this.perms.check(command, "music.init")) {
            await this.init(id, command, this.perms)
          } else {
            command.replyAutoDeny(this.i10010n() `Please have someone with the permission node \`music.init\` run ${command.prefix}init`);
            return true;
          }
        }

        if (!this.boundChannels[id].ready) {
          command.replyAutoDeny(this.i10010n() `Connection is not ready`);
          return true;
        }
        let queueCount = this.perms.check(command, "music.songcount", {type: "number"});
        let options = {};
        if (typeof queueCount === "number") {
          options.limit = queueCount;
        }
        this.boundChannels[id].enqueue(command.args.join(" "), command.member, command, options);


        return true;
      },
    }, {
      triggers: ["skip", "next"],
      permissionCheck: command => this.perms.check(command, "music.voteskip") || this.perms.check(command, "music.forceskip"),
      channels: ["guild"],
      execute: command => {
        const id = command.channel.guild.id;
        if (this.possiblySendNotConnected(command)) return true;
        if (this.possiblySendUserNotInVoice(command)) return true;
        return this.musicDB.queueLength(id).then(async (length) => {
          // do this again, because it could have changed during the db query
          if (this.possiblySendNotConnected(command)) return true;
          if (this.possiblySendUserNotInVoice(command)) return true;
          if (this.boundChannels[id].currentVideo) {
            length += 1;
          }
          let index = command.args[0] ? parseInt(command.args[0]) - 1 : -1;
          if (Number.isNaN(index)) {
            return command.replyAutoDeny(this.i10010n() `Not a valid song index, please supply a number.`);
          }
          if (index + 1 >= length) {
            command.replyAutoDeny(this.i10010n() `Not enough songs to skip, queue a song using //play <youtube url of video or playlist>`);
            return true;
          }
          let isForced = (command.flags.includes('f') && this.perms.check(command, "music.forceskip"));
          if (isForced) {
            return command.replyAutoDeny(this.i10010n() `Removing ${videoUtils.prettyPrint(await this.skipSongGetInfo(id, index))} From the queue`);
          } else {
            let promise;
            if (index < 0) {
              if (!this.boundChannels[id].currentVideo) {
                command.replyAutoDeny(this.i10010n() `Not currently playing a song.`);
                return true;
              }
              if (!Array.isArray(this.boundChannels[id].currentVideo.votes)) {
                this.boundChannels[id].currentVideo.votes = [];
              }
              if (this.boundChannels[id].currentVideo.votes.includes(command.author.id)) {
                promise = Promise.resolve(false);
              } else {
                this.boundChannels[id].currentVideo.votes.push(command.author.id);
                promise = Promise.resolve(this.boundChannels[id].currentVideo.votes.length);
              }
            } else {
              promise = this.musicDB.addVote(id, index, command.author.id);
            }
            return promise.then(async (result) => {
              if (typeof result === "number") {
                let maxVotes = Math.floor((this.boundChannels[id].voice.voiceMembers.size / 3)) + 1;
                if (result >= maxVotes) {
                  command.replyAutoDeny(this.i10010n() `Removing ${videoUtils.prettyPrint(await this.skipSongGetInfo(id, index))} From the queue`);
                } else {
                  let info;
                  if (index < 0) {
                    info = this.boundChannels[id].currentVideoInfo
                  } else {
                    info = (await this.musicDB.getNextVideosCachedInfoAndVideo(id, 1, index))[0].info;
                  }
                  command.replyAutoDeny(this.i10010n() `${result}/${maxVotes} votes needed to skip ${videoUtils.prettyPrint(info)}`)
                }
              } else {
                command.replyAutoDeny(this.i10010n() `Sorry, you may only vote to skip once per song.`);
              }
            });
          }
        });
      },
    }, {
      triggers: ["pause"],
      permissionCheck: this.perms.genCheckCommand("music.pause"),
      channels: ["guild"],
      execute: command => {
        const id = command.channel.guild.id;
        if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection")) {
          if (this.boundChannels[id].connection.playing && !this.boundChannels[id].connection.paused) {
            this.boundChannels[id].pause();
            command.replyAutoDeny(this.i10010n() `Paused Playback use ${command.prefix}resume to resume it.`);
          } else {
            command.replyAutoDeny(this.i10010n() `Cannot pause unless something is being played`);
          }
        } else {
          command.createMessageAutoDeny(this.i10010n() `Sorry, Bot is not currently in a voice channel use ${command.prefix}init while in a voice channel to bind it.`);
        }
        return true;
      },
    }, {
      triggers: ["resume"],
      permissionCheck: this.perms.genCheckCommand("music.resume"),
      channels: ["guild"],
      execute: command => {
        const id = command.channel.guild.id;
        if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection")) {
          if (this.boundChannels[id].connection.paused) {
            this.boundChannels[id].resume(command);
            command.replyAutoDeny(this.i10010n() `Playback resumed.`)
          } else {
            command.replyAutoDeny(this.i10010n() `Cannot resume unless something is paused.`)
          }
        } else {
          command.createMessageAutoDeny(this.i10010n() `Sorry, Bot is not currently in a voice channel use ${command.prefix}init while in a voice channel to bind it.`);
        }
        return true;
      },
    }, {
      triggers: ["list"],
      permissionCheck: this.perms.genCheckCommand("music.list"),
      channels: ["guild"],
      docstring: "usage `/list`",
      explanation: "Lists all the songs in a channel",
      execute: command => {
        const id = command.channel.guild.id;
        if (this.boundChannels.hasOwnProperty(id)) {
          return this.boundChannels[id].prettyList().then((list) => {
            command.createMessageAutoDeny("```xl\n" + list
              + "```\n" + this.fileConfig.get("website", {musicUrl: "https://bot.pvpcraft.ca/login/"}).musicUrl.replace(/\$id/, command.channel.guild.id));
            return true;
          })
        } else {
          command.createMessageAutoDeny(this.i10010n() `Sorry, Bot is not currently in a voice channel use ${command.prefix}init while in a voice channel to bind it.`)
        }
        return true;
      },
    }, {
      triggers: ["clear"],
      permissionCheck: this.perms.genCheckCommand("music.clear"),
      channels: ["guild"],
      execute: command => {
        const id = command.channel.guild.id;
        let options;
        if (command.targetUser) {
          options = {user_id: command.targetUser.id};
        }
        return this.musicDB.clearQueue(id, options).then((result) => {
          command.replyAutoDeny(this.i10010n() `Queue cleared`);
          return true;
        });
      },
    }, {
      triggers: ["time"],
      permissionCheck: this.perms.genCheckCommand("music.time"),
      channels: ["guild"],
      execute: command => {
        const id = command.channel.guild.id;
        if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection")) {
          if (this.boundChannels[id].currentVideoInfo) {
            command.createMessageAutoDeny(this.i10010n() `Currently ${this.boundChannels[id].prettyTime()} into ${videoUtils.prettyPrint(this.boundChannels[id].currentVideoInfo)}`);
          } else {
            command.createMessageAutoDeny(this.i10010n() `Sorry, no song's found in playlist. use ${command.prefix}play <youtube vid or playlist> to add one.`)
          }
        } else {
          command.createMessageAutoDeny(this.i10010n() `Sorry, Bot is not currently in a voice channel use ${command.prefix}init while in a voice channel to bind it.`)
        }
        return true;
      },
    }, {
      triggers: ["link"],
      permissionCheck: this.perms.genCheckCommand("music.link"),
      channels: ["guild"],
      execute: command => {
        const id = command.channel.guild.id;
        if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection")) {
          if (this.boundChannels[id].currentVideoInfo) {
            command.createMessageAutoDeny(this.i10010n() `The link to ${videoUtils.prettyPrint(this.boundChannels[id].currentVideoInfo)} is ${this.boundChannels[id].currentVideo.link}`);
          } else {
            command.createMessageAutoDeny(this.i10010n() `Sorry, no song's found in playlist. use ${command.prefix}play <youtube vid or playlist> to add one.`)
          }
        } else {
          command.createMessageAutoDeny(this.i10010n() `Sorry, Bot is not currently in a voice channel use ${command.prefix}init while in a voice channel to bind it.`)
        }
        return true;
      },
    }, {
      triggers: ["volume"],
      permissionCheck: command => this.perms.check(command, "music.volume.set") || this.perms.check(command, "music.volume.list"),
      channels: ["guild"],
      execute: command => {
        const id = command.channel.guild.id;
        if (!this.boundChannels.hasOwnProperty(id) || !this.boundChannels[id].hasOwnProperty("connection")) {
          command.createMessageAutoDeny(this.i10010n() `Sorry, Bot is not currently in a voice channel use ${command.prefix} init while in a voice channel to bind it.`);
          return true;
        }
        let boundChannel = this.boundChannels[id];
        if (!boundChannel.premium) {
          command.replyAutoDeny(this.i10010n() `In order to vastly increase performance volume is currently disabled, This feature may be re-enabled in the future`);
          return true;
        }
        if (command.args[0] && this.perms.check(command, "music.volume.set")) {
          let volume = parseInt(command.args[0], 10);
          if (201 > volume && volume > 4) {
            this.boundChannels[id].setVolume(volume);
            command.replyAutoDeny(this.i10010n() `Volume set to **${volume}**`);

          } else {
            command.replyAutoDeny(this.i10010n() `Sorry, invalid volume, please enter a number between 5 and 200`);
          }
          return true;
        } else {
          if (this.perms.check(command, "music.volume.list")) {
            command.replyAutoDeny(this.i10010n() `Current volume is **${this.boundChannels[id].getVolume()}**`);
            return true;
          }
          return false;
        }

      },
    }, {
      triggers: ["shuffle"],
      permissionCheck: this.perms.genCheckCommand("music.shuffle"),
      channels: ["guild"],
      execute: command => {
        const id = command.channel.guild.id;
        if (this.possiblySendNotConnected(command)) return true;
        command.createMessageAutoDeny(this.boundChannels[id].shuffle());
        return true;
      },
    }, {
      triggers: ["mquality"],
      permissionCheck: this.perms.genCheckCommand("music.quality"),
      channels: ["guild"],
      execute: command => {
        const id = command.channel.guild.id;
        if (this.possiblySendNotConnected(command)) return true;
        if (this.possiblySendNotPlaying(command)) return true;
        command.replyAutoDeny(this.boundChannels[id].getQuality());
      },
    }];
  }

  /**
   * Skips a song based on guild id and song index
   * @param {string} id
   * @param {number} index
   * @returns {Promise<Object>} video
   */
  skipSong(id, index) {
    if (index < 0) {
      if (this.boundChannels.hasOwnProperty(id)) {
        let player = this.boundChannels[id];
        if (player.hasOwnProperty("currentVideo")) {
          player.skipSong();
          return Promise.resolve(player.currentVideo);
        } else {
          return this.musicDB.spliceVideo(id, index + 1);
        }
      }
    }
    return this.musicDB.spliceVideo(id, index);
  }

  /**
   * Skips a song and returns its info
   * @param {string} id
   * @param {number} index
   */
  skipSongGetInfo(id, index) {
    return this.skipSong(id, index).then(song => {
      return this.musicDB.getCachingInfoLink(song.link, {allowOutdated: true})
    });
  }

  /**
   *
   * @param {Command} command
   * @returns {boolean}
   */
  possiblySendNotConnected(command) {
    let id = command.channel.guild.id;
    if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection")) {
      return false;
    }
    command.createMessageAutoDeny(this.i10010n() `Sorry, Bot is not currently in a voice channel use ${command.prefix}init while in a voice channel to bind it.`);
    return true;
  }

  /**
   *
   * @param {Command} command
   * @returns {boolean}
   */
  possiblySendNotPlaying(command) {
    let id = command.channel.guild.id;
    if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection") && this.boundChannels[id].connection.playing) {
      return false;
    }
    command.createMessageAutoDeny(this.i10010n() `Sorry, Bot is not currently playing a song.`);
    return true;
  }

  /**
   *
   * @param {Command} command
   * @returns {boolean}
   */
  possiblySendUserNotInVoice(command) {
    if (command.member.voiceState.channelID) {
      let player = this.boundChannels[command.channel.guild.id];
      if (!player || !player.connection || command.member.voiceState.channelID === player.connection.channelID) {
        return false;
      } else {
        command.createMessageAutoDeny(this.i10010n() `Sorry but you must be in the same voice channel as the bot to use this command.`);
        return true
      }
    }
    command.createMessageAutoDeny(this.i10010n() `Sorry but you must be in a voice channel to use this command.`);
    return true;
  }
}

module.exports = music;
