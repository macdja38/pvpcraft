/**
 * Created by meew0 on 2015-011-27.
 */
"use strict";

var youtubeDl = require('youtube-dl');
var ytdl = require('ytdl-core');
var Track = require('./track.js');

var YoutubeTrack = function () {
  Track.apply(this, arguments);
};

YoutubeTrack.prototype = Object.create(Track.prototype);

YoutubeTrack.getInfoFromVid = function (vid, m, user, time, raver, cb) {
  return new Promise((resolve, reject)=> {
    if (vid.indexOf("youtu") > -1) {
      ytdl.getInfo(vid, [], (err, info) => {
        if (err) {
          if (typeof(cb) === "function") {
            cb(err, null);
          }
          reject(err);
        } else {
          var video = new YoutubeTrack(info.url, info, user, time);
          video.userId = m.author.id;
          video.containedVideo = info;
          if (typeof(cb) === "function") {
            cb(null, video);
          }
          resolve(video);
        }
      })
    } else {
      youtubeDl.getInfo(vid, [], {maxBuffer: 1000 * 1024}, (err, info) => {
        if (err) {
          if (typeof(cb) === "function") {
            cb(err, null);
          }
          reject(err);
        }
        else {
          var video = new YoutubeTrack(info.url, info, user, time);
          video.userId = m.author.id;
          video.containedVideo = info;
          if (typeof(cb) === "function") {
            cb(null, video);
          }
          resolve(video);
        }
      });
    }
  });
};

/*YoutubeTrack.prototype.getURL = function () {
 console.log(this.containedVideo.formats);
 let formats = this.containedVideo.formats
 .filter(f => f.container === "webm")
 .sort((a, b) => b.audioBitrate - a.audioBitrate);

 return (formats.find(f => f.audioBitrate > 0 && !f.bitrate) || formats.find(f => f.audioBitrate > 0)).url;
 };*/

function getEncoding(info) {
  return info.encoding || info.audioEncoding;
}

function getContainer(info) {
  return info.ext || info.container;
}

function isEncodedAs(info, encoding) {
  return getEncoding(info) === encoding;
}

function isContainer(info, container) {
  return getContainer(info) === container;
}

YoutubeTrack.prototype.getURL = function () {
  let streamableSource = {};
  streamableSource.sourceURL = this.containedVideo.webpage_url || this.containedVideo.loaderUrl;
  let opusItems = this.containedVideo.formats
    .filter(f => isEncodedAs(f, "opus"));
  let webMOpusItems = opusItems.filter(f => isContainer(f, "webm"));
  if (webMOpusItems.length > 0) {
    streamableSource.encoding="opus";
    streamableSource.container="webm";
    let sortedwebMOpusItems = webMOpusItems.sort((a, b) => (b.abr || b.audioBitrate) - (a.abr || a.audioBitrate));
    streamableSource.url = sortedwebMOpusItems[0].url;
    console.log("Found webm/opus");
    return streamableSource;
  }

  // let oggItems = opusItems.filter(f => isContainer(f, "ogg"));




  let formats = this.containedVideo.formats
    .sort((a, b) => b.abr - a.abr);
  if (formats.length > 0) {
    let format = (formats.find(f => (f.abr || f.audioBitrate) > 0 && !f.resolution) || formats.find(f => (f.abr || f.audioBitrate) > 0));
    if (format) {
      streamableSource.url = format.url;
      streamableSource.container = getContainer(info);
      streamableSource.encoding = getEncoding(info);
      console.log("defaulted to other ", streamableSource.container, streamableSource.encoding);
      process.nextTick(() => YoutubeTrack.raven.captureMessage(this.containedVideo.formats));
      return streamableSource;
    }
  }
  YoutubeTrack.raven.captureMessage(this.containedVideo.formats);
  return null;

  // console.log("Formats found");
  // console.log(this.containedVideo.formats);
  // return (this.containedVideo.formats.find(f => f.format_id === "http_mp3_128_url") ||
  // this.containedVideo.formats.find(f => f.format_id === "fallback") || this.containedVideo.formats[0]).url;
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