/**
 * Created by macdja38 on 2016-05-05.
 */
"use strict";

var url = require('url');
var request = require('superagent');
var ytdl = require('ytdl-core');

var YoutubeTrack = require('./youtube-track');

module.exports = class player {
    /**
     * new instant of music playing thing.
     * @param client client to play music with.
     * @param voice voice channel to connect to.
     * @param text text channel to accept commands in.
     * @param key Youtube api key for queueing playlists and searching.
     */
    constructor(client, voice, text, key) {
        this.client = client;
        this.server = text.server;
        this.voice = voice;
        this.volume = 1;
        this.text = text;
        this.queue = [];
        this.key = key;
        this.volume = 0.20;
    }

    destroy() {
        this.connection.destroy();
    }

    init(msg) {
        this.client.joinVoiceChannel(this.voice, (error, connection)=> {
            if (error) {
                console.error(error);
                console.error(error.stack);
                msg.reply(error);
            }
            else {
                this.connection = connection;
                this.connection.setVolume(0.20)
            }
        })
    }

    enqueue(msg, video) {
        if (/list=/i.test(video)) {
            //we probably found a playlist

        }
        var vid = resolveVid(msg, video);
        if (vid.video) {
            YoutubeTrack.getInfoFromVid(vid.video, msg, (error, video)=> {
                if (error) {
                    console.error(error);
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
                        YoutubeTrack.getInfoFromVid(vid, msg, (error, video)=> {
                            if (error) {
                                console.error(error);
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
                    console.error(error);
                    this.text.sendMessage('There was an error finding playlist with that id.');
                }
            })
        }
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
                }
                else if (err.toString() === 'Error: write after end') {
                    //Basically we ignore this. Their should be a way to tell yt-dl to stop pumping data. maybe that would be a good idea.
                }
                else {
                    console.error(err);
                    this.text.sendMessage(`There was an error during playback! **${err}**`);
                }

                //this.playNext(); // skip to next video
            });

            this.connection.playRawStream(this.currentStream).then((intent) => {
                this.text.sendMessage(`Playing ${this.currentVideo.prettyPrint()}`);
                intent.on('end', ()=> {
                    this.text.sendMessage('End intent fired.');
                    this.playNext()
                });
            });
        }
    }
};

function resolveVid(msg, text) {
    text = text.trim();
    if (/^http/.test(text)) {
        var parsed = url.parse(text, true);
        //console.log(parsed);
        if (parsed.query.list) return {playlist: parsed.query.list};
        if (parsed.query.v) return {video: parsed.query.v};
        msg.reply("Not a youtube video.");
    }
    else return text;
}