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
        this.client = e.client;
        this.config = e.config;
        this.server = e.textChannel.server;
        this.voice = e.voiceChannel;
        this.text = e.textChannel;
        this.raven = e.raven;
        this.queue = [];
        this.key = e.apiKey;
        this.r = e.r;
        this.conn = e.conn;
        this.volume = this.config.get("volume", 0.2, {server: this.server.id});
        this.queueDB = new Queue(e)
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
        this.client.joinVoiceChannel(this.voice, (error, connection)=> {
            console.log("Joined voice channel!");
            if (error) {
                callback(error);
            }
            else {
                this.connection = connection;
                this.connection.setVolume(this.volume);
                callback();
            }
        })
    }

    enqueue(msg, args) {
        var text = args;
        text = text.join(" ");
        console.log("args");
        console.log(text);
        text = text.split(/((?:https?):\/\/[^\s]+)/ig).filter((n)=> {
            return n != ''
        });
        console.log(text);
        for (var song of text) {
            resolveVid(msg, song, this.key, (vid)=> {
                console.log("Video");
                console.log(vid);
                if (!vid) return;
                var startTime = vid.time ? vid.time : 0;
                if (vid.video) {
                    YoutubeTrack.getInfoFromVid(vid.video, msg, msg.author, startTime, (error, video)=> {
                        if (error) {
                            this.text.sendMessage(error);
                        }
                        else {
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
                        }
                    });
                }
                else if (vid.playlist) {
                    if (!this.key) {
                        msg.reply("Playlists disabled. (No api key)")
                    }
                    var requestUrl = 'https://www.googleapis.com/youtube/v3/playlistItems' +
                        `?part=contentDetails&maxResults=50&playlistId=${vid.playlist}&key=${this.key}`;
                    console.log(requestUrl);
                    request.get(requestUrl).end((error, response) => {
                        if (!error && response.statusCode == 200) {
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
                                var vid = elem.contentDetails.videoId;
                                promises.push(YoutubeTrack.getInfoFromVid(vid, msg, msg.author, 0, (error, video)=> {
                                    if (error) {
                                        this.text.sendMessage(error);
                                    }
                                    else {
                                        this.queue.push(video);
                                        if (!this.currentVideo) {
                                            this.playNext();
                                        }
                                        currentText = `Enqueued ${video.prettyPrint()} currently ${this.queue.length}\n`;
                                        console.log(idx + ":" + currentText);
                                        if ((text.length + currentText.length) > 1999) {
                                            this.text.sendMessage(text);
                                            text = currentText;
                                        } else {
                                            text += currentText;
                                        }
                                    }
                                }));
                            }, this);
                            Promise.all(promises).then(()=> {
                                this.text.sendMessage(text);
                                this.queueDB.set(this.queue, {
                                    textChannel: this.text,
                                    voiceChannel: this.voice,
                                    server: this.server
                                });
                            });
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
        if (this.currentVideo) {
            this.connection.stopPlaying();
            this.text.sendMessage(`Finished Playing ${this.currentVideo.prettyPrint()}`);
        }
        if (!this.queue || this.queue.length < 1) {
            this.currentVideo = null;
            this.currentStream = null;
            return;
            //TODO: add video to queue from file
        }
        this.currentVideo = this.queue.splice(0, 1)[0];
        if (this.connection) {
            this.currentStream = this.currentVideo.getStream();
            this.currentStream.on('error', (err) => {
                if (err.code === 'ECONNRESET') {
                    this.text.sendMessage(`There was a network error during playback! The connection to YouTube may be unstable. Auto-skipping to the next video...`);
                } else if (err.message == "Status code 403") {
                    this.text.sendMessage(`Permissions denied for video ${this.currentVideo.prettyPrint()}`);
                    this.playNext();
                } else if (err.message == "Status code 400") {
                    this.text.sendMessage(`Bad request for video ${this.currentVideo.prettyPrint()}, remember, the bot can not play live-streams.`);
                    this.playNext();
                } else {
                    if (this.raven) {
                        this.raven.captureException(err, {
                            extra: {
                                info: "error is from stream.on('error'",
                                server: this.voice.server.id,
                                channel: this.voice.id,
                                video: this.currentVideo
                            }
                        });
                    }
                    console.error(err);
                    console.error(err.message);
                    console.error(err.stack);
                    this.text.sendMessage(`There was an error during playback! **${err}**, if music stops you may need to destroy and re-init.`);
                }
            });

            this.connection.playRawStream(this.currentStream, {seek: this.currentVideo.time}).then((intent) => {
                this.text.sendMessage(`Playing ${this.currentVideo.prettyPrint()}`);
                this.intent = intent;
                intent.on('end', ()=> {
                    this.playNext();
                    this.queueDB.set(this.queue, {
                        textChannel: this.text,
                        voiceChannel: this.voice,
                        server: this.server
                    });
                });
                intent.on('time', (time)=> {
                    this.time = time / 1000;
                });
                intent.on('error', (error)=> {
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
                })
            });
        }
    }
}
;

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
            callback({video: parsed.query.v});
            return;
        }
        if (parsed.host === "youtu.be" && parsed.pathname && parsed.query.t) {
            callback({
                video: parsed.pathname.slice(1, parsed.pathname.length),
                time: YTDurationToSeconds(parsed.query.t)
            });
            return;
        }
        if (parsed.host === "youtu.be" && parsed.pathname) {
            callback({video: parsed.pathname.slice(1, parsed.pathname.length)});
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
                        callback({video: item.id.videoId});
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