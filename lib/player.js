/**
 * Created by macdja38 on 2016-05-05.
 */
"use strict";

var url = require('url');
var request = require('superagent');

var Utils = require('../lib/utils');
var utils = new Utils();

var Table = require('cli-table2');

var Queue = require('../lib/track-queue.js');

var fs = require('fs');

var AudioPlayer = require('./voice/AudioPlayer');

var EventEmitter = require('events');

var WebmOpusPlayer = require('./voice/WebmOpusPlayer');

var YoutubeTrack = require('./youtube-track');

class player {
  /**
   * new instant of music playing thing.
   * @param e Object containing client, textChannel, voiceChannel, raven, apiKey, r and conn
   */
  constructor(e) {
    this.lastPlay = Date.now();
    this.client = e.client;
    this.config = e.config;
    this.server = e.textChannel.server;
    this.voice = e.voiceChannel;
    this.text = e.textChannel;
    this.raven = e.raven;
    this.queue = [];
    this.key = e.apiKey;
    this.queueingPlaylist = false;
    this.r = e.r;
    this.ready = false;
    this.paused = false;
    this.conn = e.conn;
    this.volume = this.config.get("volume", 0.2, {server: this.server.id});
    this.premium = this.config.get("premium", false, {server: this.server.id});
    this.regionCode = this.config.get("regionCode", "CA");
    this.queueDB = new Queue(e);
    return this;
  }

  destroy() {
    this.queue = [];
    if (this.connection) {
      console.log("trying to run .destroy");
      this.connection.destroy();
    }
  }

  setVolume(volume) {
    this.volume = volume / 250;
    this.config.set("volume", this.volume, {server: this.server.id});
    this.connection.setVolume(this.volume);
  }

  getVolume() {
    return 250 * this.volume;
  }

  init(msg, callback) {
    console.log("Trying to join " + this.voice.name);
    this.client.joinVoiceChannel(this.voice).then(({channel, session, token, endpoint}) => {
      this.audioPlayer = new AudioPlayer(endpoint, this.server.id, channel.id, this.client.user.id,
        session, token, this.client);
      this.ready = true;
      this.connection = this.audioPlayer;
      //this.connection.setVolume(this.volume);
      callback();
    }).catch(error => {
      callback(error);
    });
  }

  enqueue(msg, args, limit = 0) {
    let currentUserQueueLength = this.getUserVidCount(msg.author);
    let nowQueued = 0;
    if (limit === currentUserQueueLength) {
      msg.reply(`Sorry you have reached your limit of ${limit} songs in the queue, Please try again after some have been played`);
      return;
    }
    var text = args;
    text = text.join(" ");
    text = text.split(/((?:https?):\/\/[^\s]+)/ig).filter((n)=> {
      return n != ''
    });
    for (var song of text) {
      this.resolveVid(msg, song, this.key, (vid)=> {
        if (!vid) return;
        var startTime = vid.time ? vid.time : 0;
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
              server: this.server
            });
            if (!this.currentVideo) {
              this.playNext();
            }
            this.text.sendMessage(`Enqueued ${video.prettyPrint()} currently ${this.queue.length}`);

          }).catch(e => {
            console.error(e);
            this.text.sendMessage(e);
          });
        }
        else if (vid.playlist) {
          if (this.queueingPlaylist) {
            msg.reply("Sorry only one playlist can be queued at a time.");
            return true;
          }
          if (!this.key) {
            msg.reply("Playlists disabled. (No api key)");
            return true;
          }
          var requestUrl = 'https://www.googleapis.com/youtube/v3/playlistItems' +
            `?part=contentDetails&maxResults=${limit ? limit - currentUserQueueLength - nowQueued : 50}` +
            `&playlistId=${vid.playlist}&key=${this.key}`;
          request.get(requestUrl).end((error, response) => {
            console.error(error);
            if (!error && response.statusCode == 200) {
              this.queueingPlaylist = true;
              var body = response.body;
              if (body.items.length == 0) {
                this.text.sendMessage('That playlist has no videos.');
                return;
              }

              this.text.sendMessage(`Loading ${body.items.length} videos...\n`);
              var text = "";
              var currentText;
              var promises = [];
              body.items.forEach((elem, idx) => {
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
                      this.text.sendMessage(text);
                      text = currentText;
                    } else {
                      text += currentText;
                    }
                  }).catch((error)=> {
                    let stringifyedError = error.toString().match(/ERROR: YouTube said: (.{5,500})/);
                    if (stringifyedError && stringifyedError.length > 520) {
                      stringifyedError += "...";
                    } else {
                      stringifyedError = error.toString().match(/.{0,2000}/);
                    }
                    msg.reply(`Sorry while fetching that I encountered the error: ${utils.clean(stringifyedError)}.`);
                  }));
              });
              Promise.all(promises).then(()=> {
                this.text.sendMessage(text);
                this.queueingPlaylist = false;
                this.queueDB.set(this.queue, {
                  textChannel: this.text,
                  voiceChannel: this.voice,
                  server: this.server
                });
              })
            } else {
              if (error == "Error: Forbidden") {
                this.text.sendMessage("Forbidden, playlist may be private. try visiting the url while not logged in, if it work's please report the problem on the github.")
              } else {
                this.text.sendMessage('There was an error finding playlist with that id.');
              }
            }
          })
        }
      })
    }
  }

  getUserVidCount(user) {
    return this.queue.filter(v => v.userId === user.id).length;
  }

  shuffle() {
    utils.shuffle(this.queue);
    return ":thumbsup::skin-tone-2:";
  }

  pause() {
    this.paused = true;
    this.connection.pause();
  }

  resume() {
    this.paused = false;
    this.connection.resume();
  }

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

  prettyTime() {
    return utils.secondsToTime(this.time);
  }

  prettyList() {
    var table = new Table({
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
    for (var song in this.queue) {
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
        this.text.sendMessage(`Finished Playing ${this.currentVideo.prettyPrint()}`)
      }
      this.currentVideo = null;
      this.currentStream = null;
      return;
      //TODO: add video to queue from file
    }
    this.currentVideo = this.queue.splice(0, 1)[0];
    if (this.connection) {
      let source = this.currentVideo.getURL();

      let endListener;

      setTimeout(()=> {
        this.connection.play(source)
        //this.connection.playArbitraryFFmpeg(FFmpegArgs, {})
        .then((intent) => {
          let errorListener = (error)=> {
            if (this.raven) {
              this.raven.captureException(error, {
                extra: {
                  info: "error is from intent.on('error'",
                  server: this.voice.server.id,
                  channel: this.voice.id,
                  video: this.currentVideo
                }
              });
            }
            console.error(error);
          };
          endListener = () => {
            this.lastPlay = Date.now();
            this.playNext();
            this.queueDB.set(this.queue, {
              textChannel: this.text,
              voiceChannel: this.voice,
              server: this.server
            });
            intent.removeListener("error", errorListener);
            intent.removeListener("time", timeListener);
            intent.removeListener("timestamp", timeListener);
          };
          let timeListener = (time) => {
            this.time = time;
          };
          intent.on("error", errorListener);
          intent.on('time', timeListener);
          intent.on('timestamp', timeListener);
          this.connection.once("end", ()=> {
            console.log("End one");
            endListener();
          });
        })
        .catch((error) => {
          console.error(error);
        });

      }, 250);

      this.text.sendMessage(`Playing ${this.currentVideo.prettyPrint()}`);
      /*this.connection.once("end", ()=> {
       console.log("Starting Next Song!");
       this.lastPlay = Date.now();
       this.playNext();
       this.queueDB.set(this.queue, {
       textChannel: this.text,
       voiceChannel: this.voice,
       server: this.server
       });
       });*/
    }
  }

  resolveVid(msg, targetVideo, key, callback) {
    targetVideo = targetVideo.trim();
    if (/^http/.test(targetVideo)) {
      var parsed = url.parse(targetVideo, true);
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
      msg.reply("Not a youtube video.");
      callback(false);
    }
    else {
      var requestUrl = 'https://www.googleapis.com/youtube/v3/search' +
        `?part=snippet&q=${targetVideo}&key=${key}&regionCode=${this.regionCode}`;

      request(requestUrl, (error, response) => {
        if (!error && response.statusCode == 200) {
          var body = response.body;
          if (body.items.length == 0) {
            msg.reply('Your query gave 0 results.');
            callback(false);
            return;
          }

          for (var item of body.items) {
            if (item.id.kind === 'youtube#video') {
              callback({video: `https://www.youtube.com/watch?v=${item.id.videoId}`});
              return;
            }
          }
          msg.reply('No video has been found!');
          callback(false);
        } else {
          msg.reply('There was an error searching.');
          callback(false);
        }
      });
    }
  }
}


function YTDurationToSeconds(duration) {
  var match = duration.match(/(\d+h)?(\d+m)?(\d+s)?/);
  return (parseInt(match[1]) || 0) * 3600 + (parseInt(match[2]) || 0) * 60 + (parseInt(match[3]) || 0);
}

function delayedPromise(time, value) {
  return new Promise(resolve => {
    setTimeout(()=>resolve(value), time);
  })
}

module.exports = player;