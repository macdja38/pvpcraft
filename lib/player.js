/**
 * Created by macdja38 on 2016-05-05.
 */
"use strict";

var url = require('url');
var request = require('superagent');

var Utils = require('../lib/utils');
var utils = new Utils();

var YoutubeTrack = require('./youtube-track');

module.exports = class player {
    /**
     * new instant of music playing thing.
     * @param client client to play music with.
     * @param voice voice channel to connect to.
     * @param text text channel to accept commands in.
     * @param key Youtube api key for queueing playlists and searching.
     * @param raven instance for error reporting.
     */
    constructor(client, voice, text, key, raven) {
        this.client = client;
        this.server = text.server;
        this.voice = voice;
        this.text = text;
        this.raven = raven;
        this.queue = [];
        this.key = key;
        this.volume = 0.20;
    }

    destroy() {
        this.queue = [];
        if (this.connection) {
            this.connection.destroy();
        }
    }

    init(msg, callback) {
        //workaround because discord.js won't execute it's callback if their's an error at the moment.
        setTimeout(()=> {
            if (!this.connection) {
                callback("Could not connect, could not determine the reason, go bug the discord.js library maintainer")
            }
        }, 5000);
        console.log("Trying to join " + this.voice.name);
        this.client.joinVoiceChannel(this.voice, (error, connection)=> {
            console.log("Joined voice channel!");
            if (error) {
                console.error(error);
                console.error(error.stack);
                if (this.raven) {
                    this.raven.captureException(error, {
                        extra: {
                            server: this.voice.server.id,
                            channel: this.voice.id
                        }
                    });
                }
                console.log(error);
                msg.reply(error);
                callback(error);
            }
            else {
                this.connection = connection;
                this.connection.setVolume(0.20);
                callback();
            }
        })
    }

    enqueue(msg, video) {
        resolveVid(msg, video, this.key, (vid)=> {
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
                        if (!this.currentVideo) {
                            this.playNext();
                        }
                        this.text.sendMessage(`Enqueued ${video.prettyPrint()} currently ${this.queue.length}`);
                    }
                });
            }
            else if (vid.playlist) {
                if (!this.key) {
                    msg.reply("Playlists disabled. (No an api key)")
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
                        body.items.forEach((elem, idx) => {
                            var vid = elem.contentDetails.videoId;
                            YoutubeTrack.getInfoFromVid(vid, msg, msg.author, 0, (error, video)=> {
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
                            });
                        }, this);
                        setTimeout(()=> {
                            this.text.sendMessage(text)
                        }, 7000);
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

    shuffle() {
        utils.shuffle(this.queue);
    }

    //TODO: combine the following into something that toggles paused state.
    pause(msg) {
        this.currentStream.pause();
        msg.reply("paused");
    }

    resume(msg) {
        this.currentStream.resume();
        msg.reply("resumed");
    }

    skipSong() {
        this.connection.stopPlaying();
    }

    prettyTime() {
        return utils.secondsToTime(this.time);
    }

    prettyList(textLength) {
        var text = "Current Playlist\n";
        text += "`" + 0 + ".` " + this.currentVideo.prettyPrint() + " votes " + this.currentVideo.votes.length + " added by " + utils.fullNameB(this.currentVideo.user) + "\n";
        for (var song in this.queue) {
            var line = "`" + (parseInt(song) + 1) + ".` " + this.queue[song].prettyPrint() + " votes " + this.queue[song].votes.length + " added by " + utils.fullNameB(this.queue[song].user) + "\n";
            if (line.length + text.length > (textLength + 3)) {
                return text + "..."
            }
            text += line
        }
        return text;
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
                } else if (this.raven) {
                    this.raven.captureException(err, {
                        extra: {
                            info: "error is from stream.on('error'",
                            server: this.voice.server.id,
                            channel: this.voice.id
                        }
                    });
                }
                else {
                    console.error(err);
                    this.text.sendMessage(`There was an error during playback! **${err}**`);
                }
            });

            this.connection.playRawStream(this.currentStream, {seek: this.currentVideo.time}).then((intent) => {
                this.text.sendMessage(`Playing ${this.currentVideo.prettyPrint()}`);
                this.intent = intent;
                intent.on('end', ()=> {
                    this.text.sendMessage('End intent fired.');
                    this.playNext()
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
                                channel: this.voice.id
                            }
                        });
                    }
                    console.error(error);
                })
            });
        }
    }
};

function resolveVid(msg, text, key, callback) {
    text = text.trim();
    if (/^http/.test(text)) {
        var parsed = url.parse(text, true);
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
            `?part=snippet&q=${text}&key=${key}`;

        request(requestUrl, (error, response) => {
            if (!error && response.statusCode == 200) {
                var body = response.body;
                if (body.items.length == 0) {
                    client.reply(m, 'Your query gave 0 results.');
                    callback(false);
                    return;
                }

                for (var item of body.items) {
                    if (item.id.kind === 'youtube#video') {
                        callback({video: item.id.videoId});
                        return;
                    }
                }
                client.reply(m, 'No video has been found!');
                callback(false);
            } else {
                client.reply(m, 'There was an error searching.');
                callback(false);
            }
        });
    }
}

function YTDurationToSeconds(duration) {
    var match = duration.match(/(\d+h)?(\d+m)?(\d+s)?/);
    return (parseInt(match[1]) || 0) * 3600 + (parseInt(match[2]) || 0) * 60 + (parseInt(match[3]) || 0);
}