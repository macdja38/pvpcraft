/**
 * Created by macdja38 on 2016-05-05.
 */
"use strict";

const url = require("url");
const superagent = require("superagent");
const fs = require("fs");
const EventEmitter = require("events");
const Table = require("cli-table2");
const utils = require("./utils");
const videoUtils = require("./videoUtils");

const request = function (...args) {
  return new Promise((resolve, reject) => {
    superagent(...args, (error, result) => {
      if (error) reject(error);
      resolve(result);
    })
  })
};
request.get = superagent.get;

/**
 * @type {Player}
 */
class Player extends EventEmitter {
  /**
   * new instant of music playing thing.
   * @constructor
   * @param {Object} e
   * @param {Eris} e.client;
   * @param {Config} e.config;
   * @param {GuildChannel} e.textChannel;
   * @param {GuildChannel} e.voiceChannel
   * @param {boolean} [e.debug=false]
   * @param {Raven} e.raven
   * @param {MusicDB} e.musicDB
   * @param {R} e.r rethinkdb driver
   * @param {SlowSender} e.slowSender
   * @param {string} e.apiKey
   */
  constructor(e) {
    super();
    this.lastPlay = Date.now();
    this.client = e.client;
    this.config = e.config;
    this.guild = e.textChannel.guild;
    this.initialVoice = e.voiceChannel;
    this.text = e.textChannel;
    this.raven = e.raven;
    this.key = e.apiKey;
    this.queueingPlaylist = false;
    this.r = e.r;
    this.musicDB = e.musicDB;
    this.slowSender = e.slowSender;
    this.ready = false;
    this.debug = e.debug || false;
    this.paused = false;
    this.volume = this.config.get("volume", 1, {server: this.guild.id});
    this.premium = this.config.get("premium", false, {server: this.guild.id});
    this.regionCode = this.config.get("regionCode", "CA");
    this.playNextEnd = this.playNext.bind(this, "end");
    this.playNextError = this.playNext.bind(this, "error");
    this.playNext = this.playNext.bind(this);
    this.enqueueSong = this.enqueueSong.bind(this);
    this._maybeLog = this._maybeLog.bind(this);
  }

  /**
   * logs something to console if this.debug is true, then stringify if possible and logs to chat.
   * @param args
   * @private
   */
  _maybeLog(...args) {
    if (this.debug) {
      console.log(...args);
      let string = args.join(", ");
      console.log(string);
      this.slowSender.sendMessage(this.text, string);
    }
  }

  /**
   * Destroys the current voice connection
   * @param {boolean} leaveChannel
   */
  destroy(leaveChannel) {
    if (this.connection) {
      this.connection.removeListener("end", this.playNextEnd);
      this.connection.removeListener("error", this.playNextError);
      this.connection.removeListener("warn", this._maybeLog);
      this.connection.removeListener("debug", this._maybeLog);
      if (leaveChannel === true) {
        this.client.leaveVoiceChannel(this.connection.channelID);
      }
    }
  }

  /**
   * Changes the current volume
   * @param {number} volume
   */
  setVolume(volume) {
    this.volume = volume / 100;
    this.config.set("volume", this.volume, {server: this.guild.id});
    this.connection.setVolume(this.volume);
  }

  /**
   * Gets the current volume
   * @returns {number}
   */
  getVolume() {
    return 100 * this.volume;
  }

  get voice() {
    if (this.connection) {
      return this.guild.channels.get(this.connection.channelID);
    } else {
      return this.initialVoice;
    }
  }

  /**
   * Checks to see if the bot has permission to join and speak in the voice channel
   * @param {GuildChannel} voice voice channel to check permissions of
   * @returns {Boolean}
   */
  canInit(voice) {
    return voice.permissionsOf(this.client.user.id).has("voiceConnect") &&
      voice.permissionsOf(this.client.user.id).has("voiceSpeak");
  }

  /**
   * Initialises the voice connection (join voice channel)
   * @param {GuildChannel} voice voice channel to join
   * @returns {Promise<VoiceConnection>}
   */
  init(voice) {
    this.initialVoice = voice;
    return new Promise((resolve, reject) => {
      this._maybeLog(`Trying to init into ${voice.name}`);
      if (!this.canInit(voice)) return reject("Insufficient permissions to join / speak in voice channel.");
      this.client.joinVoiceChannel(voice.id).then((connection) => {
        this._maybeLog(`Joined ${voice.name}`);
        this.ready = true;
        this.connection = connection;
        connection.on("end", this.playNextEnd);
        connection.on("error", this.playNextError);
        connection.on("warn", this._maybeLog);
        connection.on("debug", this._maybeLog);
        resolve(connection);
      }).catch(error => {
        this._maybeLog(`Failed to join ${voice.name}`);
        reject(error);
      });
    })
  }

  /**
   * Enqueues a song
   * @param {string} text
   * @param {Member} member
   * @param {Command} command
   * @param {Object} [options] options
   * @param {number} [options.limit] optional limit for songs the member can have queued
   */
  enqueue(text, member, command, options = {}) {
    // split text into arguments and video
    let thingList = text.split(/((?:https?):\/\/[^\s]+)/ig).filter((n) => {
      return n !== ''
    });
    thingList.forEach((song) => {
      this.resolveVid(song).then((video) => {
        if (video.hasOwnProperty("playlist")) {
          this.enqueuePlaylist(video.playlist, member, command, options);
        } else if (video.hasOwnProperty("video")) {
          let maybeQueue;
          if (options.limit) {
            maybeQueue = this.getUserVidCount(member).then(count => {
              if (count <= options.limit) return;
              throw `You have reached your limit of ${options.limit} songs in the queue`;
            });
          } else {
            maybeQueue = Promise.resolve();
          }
          return maybeQueue.then(() => {this.enqueueSong(video.video, member, command)});
        }
      }).catch(error => {
        this.slowSender.sendMessage(this.text, error);
      });
    })
  }

  /**
   * enqueue a single song
   * @param {string} song
   * @param {Member} member
   * @param {Command} command
   */
  enqueueSong(song, member, command) {
    this.musicDB.getCachingInfoLink(song, {allowOutdated: true}).then((info) => {
      let enqueuedVideo = {username: member.username, user_id: member.id, link: song};

      //noinspection JSCheckFunctionSignatures
      return this.musicDB.addSong(this.guild.id, enqueuedVideo).then(() => {
        this.slowSender.sendMessage(this.text, `Enqueued ${videoUtils.prettyPrint(info)}`);
        if (!this.currentVideo) this.playNext("enqueue");
      })
    }).catch(this._logQueueError.bind(this, command));
  }

  /**
   * Enqueues a song
   * @param {string} playlist
   * @param {Member} member
   * @param {Command} command
   * @param {Object} [options={}]
   * @param {number} [options.limit] defaults to 50 if not premium 250 if premium
   * @private
   * @returns {Promise.<void>}
   */
  async enqueuePlaylist(playlist, member, command, options = {}) {
    let requestLimit = this.premium ? 250 : 50;
    if (options.limit) {
      let currentUserQueueLength = await this.getUserVidCount(member);
      requestLimit = Math.min(options.limit - currentUserQueueLength, requestLimit);
    }
    this._fetchPlaylist(playlist, requestLimit).then((items) => {
      items.forEach((song, i) =>
        setTimeout(() => this.enqueueSong(`https://youtube.com/watch?v=${song.contentDetails.videoId}`, member, command), i * 50)
      );
    }).catch(this._logQueueError.bind(null, command));
  }

  /**
   * Logs an error queueing a song
   * @param {Command} command
   * @param {Error} error
   * @private
   */
  _logQueueError(command, error) {
    let stringifyedError = error.toString().match(/YouTube said: ((?:.|\n){5,500})/);
    if (stringifyedError != null) {
      stringifyedError = stringifyedError[0];
      stringifyedError += "...";
    } else {
      stringifyedError = error.toString().match(/.{0,1800}/);
      if (stringifyedError !== null) {
        stringifyedError = stringifyedError[0];
      }
    }
    command.replyAutoDeny(`Sorry while fetching that I encountered the error: ${utils.clean(stringifyedError)}.`);
  }

  /**
   *
   * @param {User | Member} user
   * @returns {Promise<number>}
   */
  getUserVidCount(user) {
    return this.musicDB.countVideosQueuedBy(this.guild.id, user.id);
  }

  /**
   * Shuffles the current queue
   * @returns {string}
   */
  shuffle() {
    this.musicDB.shuffle(this.guild.id);
    return ":thumbsup::skin-tone-2:";
  }

  /**
   * Pauses the current song
   */
  pause() {
    this.pauseTime = Date.now();
    this.paused = true;
    this.connection.pause();
  }

  /**
   * Resumes music streaming
   */
  resume() {
    this.startTime = Date.now() - this.pauseTime + this.startTime;
    this.paused = false;
    this.connection.resume();
  }

  /**
   * Skips the current song.
   */
  skipSong() {
    this.lastPlay = Date.now();
    if (this.connection.playing === false && this.queue.length > 0) {
      this.playNext("song skipped");
    } else {
      this.connection.stopPlaying();
    }
  }

  /**
   * Gets the current time into the song in text form
   * @returns {string}
   */
  prettyTime() {
    return utils.secondsToTime((this.paused ? this.pauseTime - this.startTime : Date.now() - this.startTime) / 1000);
  }

  /**
   * Returns an array containing arrays of table contents.
   * @returns {Array<Array>}
   */
  prettyQueue() {
    let table = [
      [0, this.currentVideo.prettyTitle(), this.currentVideo.prettyViews(), this.currentVideo.prettyTime(), this.currentVideo.votes.length, utils.fullName(this.currentVideo.user)]
    ];
    for (let song in this.queue) {
      table.push(
        [(parseInt(song) + 1), this.queue[song].prettyTitle(), this.queue[song].prettyViews(), this.queue[song].prettyTime(), this.queue[song].votes.length, utils.fullName(this.queue[song].user)]
      );
    }
    return table;
  }

  /**
   *
   * @returns {string}
   */
  async prettyList() {
    let table = new Table({
      head: ["#", "song", "views", "length", "skip", "added by"],
      colWidths: [4, 40, 13, 10, 6, 24],
      chars: {
        'top': '', 'top-mid': '', 'top-left': '', 'top-right': ''
        , 'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': ''
        , 'left': '', 'left-mid': '', 'mid': '', 'mid-mid': ''
        , 'right': '', 'right-mid': '', 'middle': ' '
      },
      style: {
        head: [],
        boarder: []
      }
    });
    let queue = await this.musicDB.getNextVideos(this.guild.id, 10);
    let songList = await Promise.all(queue.map(song => this.musicDB.getCachingInfoLink(song.link, {allowOutdated: true})));
    let i = 1;
    if (this.currentVideo) {
      queue.unshift(this.currentVideo);
      songList.unshift(this.currentVideoInfo);
      i = 0;
    }
    for (; i < Math.min(songList.length, 10); i++) {
      let song = queue[i];
      let vidInfo = songList[i];
      table.push([
        i,
        videoUtils.prettyTitle(vidInfo),
        videoUtils.formatViewCount(vidInfo),
        videoUtils.prettyShortTime(vidInfo),
        videoUtils.prettyVotes(song),
        utils.clean(song.username)
      ]);
    }
    return table.toString().replace(/\[(?:90|39)m/g, "");
  }

  async playNext(from, possibleError) {
    this._maybeLog("PlayNext called from", from, possibleError, "time played",
      utils.secondsToTime((this.paused ? this.pauseTime - this.startTime : Date.now() - this.startTime) / 1000));
    if (this.connection.playing) {
      this.slowSender.sendMessage(this.text, "Skipping the current song as next one is being played.");
      return this.connection.stopPlaying("playNext", "Already encoding");
    }
    if (from === "error") {
      this.slowSender.sendMessage(this.text, `Finished Playing ${videoUtils.prettyPrint(this.currentVideoInfo)} because of ${possibleError}`);
      if (this.raven) {
        this.raven.captureException(possibleError);
      }
    }
    this.lastPlay = Date.now();
    let queueLength = await this.musicDB.queueLength(this.guild.id);
    if (queueLength < 1) {
      if (this.currentVideo) {
        this.slowSender.sendMessage(this.text, `Finished Playing ${videoUtils.prettyPrint(this.currentVideoInfo)}`);
      }
      this.currentVideo = null;
      return;
      //TODO: add video to queue from file
    }
    try {
      this.currentVideo = await this.musicDB.spliceVideo(this.guild.id);
      this.currentVideoInfo = await this.musicDB.getCachingInfoLink(this.currentVideo.link);
    } catch (error) {
      this.slowSender.sendMessage(this.text, `Error fetching info from the youtube api ${error}`);
      this.currentVideo = null;
      if (this.currentVideoInfo == null) {
        this.currentVideo = null;
      }
      this.playNext("playNext0", error);
      return;
    }
    if (this.connection) {
      let source;
      let fetchError;
      try {
        source = videoUtils.getURL(this.currentVideoInfo);
      } catch (error) {
        fetchError = error;
      }
      if (fetchError || !source) {
        this.slowSender.sendMessage(this.text, `Could not find a format to queue for ${
          videoUtils.prettyPrint(this.currentVideoInfo)
          }${
          fetchError ? ` because of the error \`\`\`${fetchError}\`\`\`` : ""
          }`);
        this.playNext("playNext1", "fetchError");
        return
      }
      let options = {frameDuration: 20, voiceDataTimeout: 2000};
      if (((source.container === "webm" && source.encoding === "opus")
        || (source.container === "ogg" && source.encoding === "opus")) && this.premium === false) {
        options.format = source.container;
      } else {
        options.inputArgs = ["-reconnect", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "2"];
        if (this.premium && this.volume !== 1) {
          options.encoderArgs = ["-af", `volume=${this.volume}`]
        }
      }
      this.startTime = Date.now();
      try {
        this.currentOptions = options;
        if (this.connection.playing) {
          this.slowSender.sendMessage(this.text, "Skipping the current song as next one is being played");
          return this.connection.stopPlaying("nextTick", "Already encoding");
        }
        let url;
        if (source.url.includes("youtube") && !source.url.includes("ratebypass")) {
          url = source.url + "&ratebypass=yes";
        } else {
          url = source.url;
        }
        this.connection.play(url, options);
      } catch (error) {
        if (this.raven) this.raven.captureException(error, {
          extra: {
            source,
            options,
            voiceChannel: this.voice,
            voiceConnection: this.connection
          }
        });
      }
      this.slowSender.sendMessage(this.text, `Playing ${videoUtils.prettyPrint(this.currentVideoInfo)} Container:${source.container} Encoding:${source.encoding}`);
    }
  }


  async resolveVid(text) {
    text = text.trim();
    if (/^http/.test(text)) { // text is a URL
      let parsed = url.parse(text, true);
      if (!parsed) throw "Error parsing";
      if (parsed.query.list) {
        return {playlist: parsed.query.list};
      }
      if (parsed.query.v) {
        return {video: `https://www.youtube.com/watch?v=${parsed.query.v}`};
      }
      if (parsed.host === "youtu.be" && parsed.pathname && parsed.query.t) {
        return {
          video: `https://www.youtube.com/watch?v=${parsed.pathname.slice(1, parsed.pathname.length)}`,
          time: YTDurationToSeconds(parsed.query.t)
        };
      }
      if (parsed.host === "youtu.be" && parsed.pathname) {
        return {video: `https://www.youtube.com/watch?v=${parsed.pathname.slice(1, parsed.pathname.length)}`};
      }
      return {video: text};

    } else { // search youtube for the song
      let requestUrl = 'https://www.googleapis.com/youtube/v3/search' +
        `?part=snippet&q=${encodeURIComponent(text)}&key=${this.key}&regionCode=${this.regionCode}`;
      let response;
      try {
        response = await request(requestUrl);
      } catch (error) {
        if (this.raven) {
          this.raven.captureException(error);
        }
        throw 'There was an error searching:' + error;
      }

      if (response.statusCode != 200) {
        throw `Error searching, response code ${response.statusCode}`;
      }
      let body = response.body;
      if (body.items.length === 0) {
        throw 'Your query gave 0 results.';
      }
      for (let item of body.items) {
        if (item.id.kind === 'youtube#video') {
          return {video: `https://www.youtube.com/watch?v=${item.id.videoId}`};
        }
      }
      throw 'No video has been found!';
    }
  }

  /**
   * Fetches a list of songs from the youtube api
   * @param {string} id
   * @param {number} requestLimit
   * @param {string} [pageToken]
   * @returns {Promise<Array<{contentDetails: {videoId: string}}>>}
   * @private
   */
  _fetchPlaylist(id, requestLimit, pageToken) {
    return new Promise((resolve, reject) => {
      let requestUrl = 'https://www.googleapis.com/youtube/v3/playlistItems' +
        `?part=contentDetails&maxResults=${Math.min(requestLimit, 50)}` +
        `&playlistId=${id}&key=${this.key}`;
      if (pageToken) {
        requestUrl += `&pageToken=${pageToken}`;
      }
      request.get(requestUrl).end((error, response) => {
        if (error || response.statusCode !== 200) return reject(error);
        requestLimit -= response.body.items.length;
        let fetchedSongs = response.body.items;
        if (requestLimit > 0 && response.body.nextPageToken) {
          this._fetchPlaylist(id, requestLimit, response.body.nextPageToken).then((promisedSongs) => {
            fetchedSongs.push(...promisedSongs);
            resolve(fetchedSongs);
          }).catch(() => {
            resolve(fetchedSongs);
          });
        } else {
          resolve(fetchedSongs);
        }
      })
    })
  }
}

function YTDurationToSeconds(duration) {
  let match = duration.match(/(\d+h)?(\d+m)?(\d+s)?/);
  return (parseInt(match[1]) || 0) * 3600 + (parseInt(match[2]) || 0) * 60 + (parseInt(match[3]) || 0);
}

function delayedPromise(time, value) {
  return new Promise(resolve => {
    setTimeout(() => resolve(value), time);
  })
}

module.exports = Player;