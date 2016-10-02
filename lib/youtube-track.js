/**
 * Created by meew0 on 2015-011-27.
 */
"use strict";

var ytdl = require('youtube-dl');
var Track = require('./track.js');

var YoutubeTrack = function () {
    Track.apply(this, arguments);
};

YoutubeTrack.prototype = Object.create(Track.prototype);

YoutubeTrack.getInfoFromVid = function (vid, m, user, time, cb) {
    return new Promise((resolve, reject)=> {
        ytdl.getInfo(vid, [], (err, info) => {
            if (err) {
                if(typeof(cb) === "function")
                cb(err, null);
                reject(err);
            }
            else {
                var video = new YoutubeTrack(info.url, info, user, time);
                video.userId = m.author.id;
                video.containedVideo = info;
                if(typeof(cb) === "function") {
                    cb(null, video);
                }
                resolve(video);
            }
        });
    });
};

/*YoutubeTrack.prototype.getURL = function () {
    console.log(this.containedVideo.formats);
    let formats = this.containedVideo.formats
      .filter(f => f.container === "webm")
      .sort((a, b) => b.audioBitrate - a.audioBitrate);

    return (formats.find(f => f.audioBitrate > 0 && !f.bitrate) || formats.find(f => f.audioBitrate > 0)).url;
};*/

YoutubeTrack.prototype.getURL = function () {
  let formats = this.containedVideo.formats
    .filter(f => f.ext === "webm")
    .sort((a, b) => b.abr - a.abr);
  if(formats.length > 0) return (formats.find(f => f.abr > 0 && !f.resolution) || formats.find(f => f.abr > 0)).url;
  formats = this.containedVideo.formats
    .filter(f => f.ext === "mp4")
    .sort((a, b) => b.abr - a.abr);
  if(formats.length > 0) return (formats.find(f => f.abr > 0 && !f.resolution) || formats.find(f => f.abr > 0)).url;
  formats = this.containedVideo.formats
    .filter(f => f.ext === " vorbis")
    .sort((a, b) => b.abr - a.abr);
  if(formats.length > 0) return (formats.find(f => f.abr > 0 && !f.resolution) || formats.find(f => f.abr > 0)).url;
  return (this.containedVideo.formats.find(f => f.format_id === "http_mp3_128_url") || this.containedVideo.formats.find(f => f.format_id === "fallback") || this.containedVideo.formats[0]).url;
};

YoutubeTrack.prototype.getStream = function () {
    var options = {
        filter: (format) => format.container === 'mp4',
        quality: ['140', '141', '139', 'lowest'],
        audioonly: true
    };

    return ytdl.downloadFromInfo(this.containedVideo, options);
};

module.exports = YoutubeTrack;