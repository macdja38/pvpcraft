/**
 * Created by meew0 on 2015-011-27.
 */
"use strict";

var ytdl = require('ytdl-core');
var Track = require('./track.js');

var YoutubeTrack = function () {
    Track.apply(this, arguments);
};

YoutubeTrack.prototype = Object.create(Track.prototype);

YoutubeTrack.getInfoFromVid = function (vid, m, user, time, cb) {
    return new Promise((resolve, reject)=> {
        var requestUrl = 'http://www.youtube.com/watch?v=' + vid;
        ytdl.getInfo(requestUrl, (err, info) => {
            if (err) {
                cb(err, null);
                resolve(null, err);
            }
            else {
                var video = new YoutubeTrack(vid, info, user, time);
                video.userId = m.author.id;
                video.containedVideo = info;
                cb(null, video);
                resolve(video);
            }
        });
    });
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