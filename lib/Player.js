/**
 * Created by macdja38 on 2016-05-05.
 */
"use strict";

let url = require('url');
let request = require('superagent');
let fs = require('fs');
let EventEmitter = require('events');
let Table = require('cli-table2');
let utils = require('../lib/utils');
let Queue = require('./Queue.js');
let YoutubeTrack = require('./youtube-track');

/**
 * @type {Player}
 */
class Player extends EventEmitter {
  /**
   * new instant of music playing thing.
   * @constructor
   * @param {Object} e
   * @param {Client} e.client;
   * @param {Config} e.config;
   * @param {GuildChannel} e.textChannel;
   * @param {GuildChannel} e.voiceChannel
   * @param {Raven} e.raven
   * @param {string} e.apiKey
   */
  constructor(e) {
    super();
    this.lastPlay = Date.now();
    this.client = e.client;
    this.config = e.config;
    this.guild = e.textChannel.guild;
    this.voice = e.voiceChannel;
    this.text = e.textChannel;
    this.raven = e.raven;
    this.queue = [];
    this.key = e.apiKey;
    this.queueingPlaylist = false;
    this.r = e.r;
    this.ready = false;
    this.paused = false;
    this.volume = this.config.get("volume", 0.2, {server: this.guild.id});
    this.premium = this.config.get("premium", false, {server: this.guild.id});
    this.regionCode = this.config.get("regionCode", "CA");
    this.queueDB = new Queue(e);
    return this;
  }

  /**
   * Destroys the current voice connection
   */
  destroy() {
    this.queue = [];
    if (this.connection) {
      console.log("trying to run .destroy");
      this.connection.disconnect(null, false);
    }
  }

  /**
   * Changes the current volume
   * @param {number} volume
   */
  setVolume(volume) {
    this.volume = volume / 250;
    this.config.set("volume", this.volume, {server: this.guild.id});
    this.connection.setVolume(this.volume);
  }

  /**
   * Gets the current volume
   * @returns {number}
   */
  getVolume() {
    return 250 * this.volume;
  }

  /**
   * Checks to see if the bot has permission to join and speak in the voice channel
   * @returns {Boolean}
   */
  canInit() {
    return this.voice.permissionsOf(this.client.user.id).has("voiceConnect") &&
      this.voice.permissionsOf(this.client.user.id).has("voiceSpeak");
  }

  /**
   * Initialises the voice connection (join voice channel)
   * @returns {Promise<VoiceConnection>}
   */
  init() {
    return new Promise((resolve, reject) => {
      console.log("Trying to join " + this.voice.name);
      if (!this.canInit()) return reject("Insufficient permissions to join / speak in voice channel.");
      this.client.joinVoiceChannel(this.voice.id).then((connection) => {
        console.log("Joined " + this.voice.name);
        this.ready = true;
        this.connection = connection;
        connection.on('end', this.playNext.bind(this));
        connection.on('error', this.playNext.bind(this));
        resolve(connection);
      }).catch(error => {
        console.error("Failed to join with ", error);
        console.error("Failed to join " + this.voice.name);
        reject(error);
      });
    })
  }

  /**
   *
   * @param {Message} msg
   * @param {string[]} args
   * @param {number?} limit
   */
  enqueue(msg, args, limit = 0) {
    let currentUserQueueLength = this.getUserVidCount(msg.author);
    let nowQueued = 0;
    if (limit === currentUserQueueLength) {
      msg.channel.createMessage(msg.author.mention + ", " + `Sorry you have reached your limit of ${limit} songs in the queue, Please try again after some have been played`);
      return;
    }
    let text = args;
    text = text.join(" ");
    text = text.split(/((?:https?):\/\/[^\s]+)/ig).filter((n) => {
      return n != ''
    });
    for (let song of text) {
      this.resolveVid(msg, song, this.key, (vid) => {
        if (!vid) return;
        let startTime = vid.time ? vid.time : 0;
        if (vid.video) {
          YoutubeTrack.getInfoFromVid(vid.video, msg, msg.author, startTime, this.raven).then(video => {
            if (limit && limit <= currentUserQueueLength + nowQueued) {
              return;
            }
            this.queue.push(video);
            nowQueued++;
            this.queueDB.set(this.queue, {
              textChannel: this.text,
              voiceChannel: this.voice,
              server: this.guild
            });
            if (!this.currentVideo) {
              this.playNext();
            }
            this.text.createMessage(`Enqueued ${video.prettyPrint()} currently ${this.queue.length}`);

          }).catch(this._logQueueError.bind(this, msg));
        }
        else if (vid.playlist) {
          if (this.queueingPlaylist) {
            msg.channel.createMessage(msg.author.mention + ", " + "Sorry only one playlist can be queued at a time.");
            return true;
          }
          if (!this.key) {
            msg.channel.createMessage(msg.author.mention + ", " + "Playlists disabled. (No api key)");
            return true;
          }
          let requestLimit = this.premium ? 250 : 50;
          if (limit) {
            requestLimit = Math.min(limit - currentUserQueueLength - nowQueued, requestLimit);
          }
          this._fetchPlaylist(vid.playlist, requestLimit).then((items) => {
            this.queueingPlaylist = true;
            if (items.length == 0) {
              this.text.createMessage('That playlist has no videos.');
              return;
            }

            this.text.createMessage(`Loading ${items.length} videos...\n`);
            let text = "";
            let currentText;
            let promises = [];
            items.forEach((elem, idx) => {
              const vid = elem.contentDetails.videoId;
              promises.push(delayedPromise(1000 * idx)
                .then(() => YoutubeTrack.getInfoFromVid(`https://youtube.com/watch?v=${vid}`, msg, msg.author, 0, this.raven))
                .then(video => {
                  if (limit && limit <= currentUserQueueLength + nowQueued) {
                    return;
                  }
                  this.queue.push(video);
                  nowQueued++;
                  if (!this.currentVideo) {
                    this.playNext();
                  }
                  currentText = `Enqueued ${video.prettyPrint()} currently ${this.queue.length}\n`;
                  if ((text.length + currentText.length) > 1999) {
                    this.text.createMessage(text);
                    text = currentText;
                  } else {
                    text += currentText;
                  }
                }).catch(this._logQueueError.bind(this, msg)));
            });
            Promise.all(promises).then(() => {
              this.text.createMessage(text);
              this.queueingPlaylist = false;
              this.queueDB.set(this.queue, {
                textChannel: this.text,
                voiceChannel: this.voice,
                server: this.guild
              });
            })
          }).catch((error) => {
            if (error) {
              if (error == "Error: Forbidden") {
                this.text.createMessage("Forbidden, playlist may be private. try visiting the url while not logged in, if it work's please report the problem on the github.")
              } else {
                this.text.createMessage('There was an error finding playlist with that id.');
                if (this.raven) {
                  this.raven.captureException(error);
                }
              }
            }
          })
        }
      })
    }
  }

  _logQueueError(msg, error) {
    console.log(error);
    let stringifyedError = error.toString().match(/YouTube said: ((?:.|\n){5,500})/);
    console.log("Error to String", error.toString());
    if (stringifyedError != null) {
      stringifyedError = stringifyedError[0];
      stringifyedError += "...";
    } else {
      stringifyedError = error.toString().match(/.{0,1800}/);
      if (stringifyedError !== null) {
        stringifyedError = stringifyedError[0];
      }
    }
    msg.channel.createMessage(msg.author.mention + ", " + `Sorry while fetching that I encountered the error: ${utils.clean(stringifyedError)}.`);
  }

  /**
   *
   * @param {User | Member} user
   * @returns {Number}
   */
  getUserVidCount(user) {
    return this.queue.filter(v => v.userId === user.id).length;
  }

  /**
   * Shuffles the current queue
   * @returns {string}
   */
  shuffle() {
    utils.shuffle(this.queue);
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
      console.log("player   PlayNext");
      this.playNext();
    }
    else {
      console.log("player, stopPlaying");
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
   * @returns {[*]}
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
  prettyList() {
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
    table.push(
      [0, this.currentVideo.prettyTitle(), this.currentVideo.prettyViews(), this.currentVideo.prettyTime(), this.currentVideo.votes.length, utils.fullName(this.currentVideo.user)]
    );
    for (let song in this.queue) {
      if (song > 10) {
        break;
      }
      table.push(
        [(parseInt(song) + 1), this.queue[song].prettyTitle(), this.queue[song].prettyViews(), this.queue[song].prettyTime(), this.queue[song].votes.length, utils.fullName(this.queue[song].user)]
      );
    }
    return table.toString().replace(/\[(?:90|39)m/g, "") + (this.queue.length > 11 ? "\n ..." : "");
  }

  playNext() {
    if (!this.queue || this.queue.length < 1) {
      if (this.currentVideo) {
        this.lastPlay = Date.now();
        this.text.createMessage(`Finished Playing ${this.currentVideo.prettyPrint()}`)
      }
      this.currentVideo = null;
      return;
      //TODO: add video to queue from file
    }
    this.currentVideo = this.queue.splice(0, 1)[0];
    if (this.connection) {
      let source;
      let fetchError;
      try {
        source = this.currentVideo.getURL();
      } catch (error) {
        fetchError = error;
      }
      if (fetchError || !source) {
        this.text.createMessage(`Could not find a format to queue for ${
          this.currentVideo.prettyPrint()
          }${
          fetchError ? ` because of the error \`\`\`${fetchError}\`\`\`` : ""
          }`);
        this.playNext();
        return
      }
      let options = {frameDuration: 20};
      if (source.container === "webm" && source.encoding === "opus"
        || source.container === "ogg" && source.encoding === "opus") {
        options.format = source.container;
      }
      this.startTime = Date.now();
      process.nextTick(() => {
        try {
          this.connection.play(source.url, options);
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
      });
      this.text.createMessage(`Playing ${this.currentVideo.prettyPrint()}`);
    }
  }

  resolveVid(msg, targetVideo, key, callback) {
    targetVideo = targetVideo.trim();
    if (/^http/.test(targetVideo)) {
      let parsed = url.parse(targetVideo, true);
      //console.log(parsed);
      if (parsed.query.list) {
        callback({playlist: parsed.query.list});
        return;
      }
      if (parsed.query.v) {
        callback({video: `https://www.youtube.com/watch?v=${parsed.query.v}`});
        return;
      }
      if (parsed.host === "youtu.be" && parsed.pathname && parsed.query.t) {
        callback({
          video: `https://www.youtube.com/watch?v=${parsed.pathname.slice(1, parsed.pathname.length)}`,
          time: YTDurationToSeconds(parsed.query.t)
        });
        return;
      }
      if (parsed.host === "youtu.be" && parsed.pathname) {
        callback({video: `https://www.youtube.com/watch?v=${parsed.pathname.slice(1, parsed.pathname.length)}`});
        return;
      }
      else if (parsed) {
        callback({video: targetVideo});
        return;
      }
      msg.channel.createMessage(msg.author.mention + ", " + "Not a youtube video.");
      callback(false);
    }
    else {
      let requestUrl = 'https://www.googleapis.com/youtube/v3/search' +
        `?part=snippet&q=${targetVideo}&key=${key}&regionCode=${this.regionCode}`;

      request(requestUrl, (error, response) => {
        if (!error && response.statusCode == 200) {
          let body = response.body;
          if (body.items.length == 0) {
            msg.channel.createMessage(msg.author.mention + ", " + 'Your query gave 0 results.');
            callback(false);
            return;
          }

          for (let item of body.items) {
            if (item.id.kind === 'youtube#video') {
              callback({video: `https://www.youtube.com/watch?v=${item.id.videoId}`});
              return;
            }
          }
          msg.channel.createMessage(msg.author.mention + ", " + 'No video has been found!');
          callback(false);
        } else {
          msg.channel.createMessage(msg.author.mention + ", " + 'There was an error searching.');
          callback(false);
        }
      });
    }
  }

  /**
   * Fetches a list of songs from the youtube api
   * @param {string} id
   * @param {number} requestLimit
   * @param {string} [pageToken]
   * @returns {Promise<Array<Object>>}
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