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
    this.conn = e.conn;
    this.volume = this.config.get("volume", 0.2, {server: this.server.id});
    this.queueDB = new Queue(e);
    return this;
  }

  destroy() {
    this.queue = [];
    if (this.connection) {
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
    this.client.joinVoiceChannel(this.voice).then(connection => {
      console.log("Joined voice channel!");
      this.ready = true;
      this.connection = connection;
      this.connection.setVolume(this.volume);
      callback();
    }).catch(error => {
      callback(error);
    });
  }

  enqueue(msg, args) {
    var text = args;
    text = text.join(" ");
    text = text.split(/((?:https?):\/\/[^\s]+)/ig).filter((n)=> {
      return n != ''
    });
    for (var song of text) {
      resolveVid(msg, song, this.key, (vid)=> {
        if (!vid) return;
        var startTime = vid.time ? vid.time : 0;
        if (vid.video) {
          YoutubeTrack.getInfoFromVid(vid.video, msg, msg.author, startTime).then(video => {
            this.queue.push(video);
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
            `?part=contentDetails&maxResults=50&playlistId=${vid.playlist}&key=${this.key}`;
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
                setTimeout(()=>{
                var vid = elem.contentDetails.videoId;
                promises.push(YoutubeTrack.getInfoFromVid(`https://youtube.com/watch?v=${vid}`, msg, msg.author, 0, (error, video)=> {
                  if (error) {
                    msg.reply(`Sorry error ${utils.clean(error)} fetching that video.`);
                    console.log(utils.clean(error), vid);
                    return;
                  }
                  this.queue.push(video);
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
                }));
                }, idx * 2000);
              }, this);
              setTimeout(()=>{
                Promise.all(promises).then(()=> {
                  this.text.sendMessage(text);
                  this.queueingPlaylist = false;
                  this.queueDB.set(this.queue, {
                    textChannel: this.text,
                    voiceChannel: this.voice,
                    server: this.server
                  });
                }).catch(()=>{});
              }, body.items.length * 2000 + 1000)
            } else {
              if (error == "Error: Forbidden") {
                this.text.sendMessage("Forbidden, playlist may be private. try visiting the url while not logged in, if it work's please report the problem on the github.")
              } else {
                this.text.sendMessage('There was an error finding playlist with that id.');
              }
            }
          })
        }
      });
    }
  }

  shuffle() {
    utils.shuffle(this.queue);
    return ":thumbsup::skin-tone-2:";
  }

  pause() {
    this.connection.pause();
  }

  resume() {
    this.connection.resume();
  }

  skipSong() {
    this.lastPlay = Date.now();
    if (this.connection.playingIntent === null && this.queue.length > 0) this.playNext();
    else {
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
      let url = this.currentVideo.getURL();
      let FFmpegArgs = ["-i", `${url}`, "-threads", "1"];
      if (this.currentVideo.time) {
        FFmpegArgs.unshift(...["-ss", this.currentVideo.time]);
      }
      this.connection.playArbitraryFFmpeg(FFmpegArgs, {})
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
          let endListener = () => {
            this.lastPlay = Date.now();
            this.playNext();
            this.queueDB.set(this.queue, {
              textChannel: this.text,
              voiceChannel: this.voice,
              server: this.server
            });
            intent.removeListener("error", errorListener);
            intent.removeListener("end", endListener);
            intent.removeListener("time", timeListener);
          };
          let timeListener = (time) => {
            this.time = time / 1000;
          };
          intent.on("error", errorListener);
          intent.on('end', endListener);
          intent.on('time', timeListener);
        })
        .catch((error) => {
          console.error(error);
        });

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
}

function resolveVid(msg, targetVideo, key, callback) {
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
      `?part=snippet&q=${targetVideo}&key=${key}`;

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

function YTDurationToSeconds(duration) {
  var match = duration.match(/(\d+h)?(\d+m)?(\d+s)?/);
  return (parseInt(match[1]) || 0) * 3600 + (parseInt(match[2]) || 0) * 60 + (parseInt(match[3]) || 0);
}

module.exports = player;