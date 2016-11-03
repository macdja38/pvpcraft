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

YoutubeTrack.getInfoFromVid = function (...args) {
  if (args[0].indexOf("youtu") > -1) {
    return fetchWithYtdl(...args).catch(fetchWithYoutubeDl);
  } else {
    return fetchWithYoutubeDl(...args);
  }
};

function fetchWithYtdl(vid, m, user, time) {
  return new Promise((resolve, reject)=> {
      ytdl.getInfo(vid, [], (err, info) => {
        if (err) {
          reject(err);
        } else {
          var video = new YoutubeTrack(info.url, info, user, time);
          video.userId = m.author.id;
          video.containedVideo = info;
          resolve(video);
        }
      })
  });
}

function fetchWithYoutubeDl(vid, m, user, time) {
  return new Promise((resolve, reject)=>{
    youtubeDl.getInfo(vid, [], {maxBuffer: 1000 * 1024}, (err, info) => {
      if (err) {
        reject(err);
      }
      else {
        var video = new YoutubeTrack(info.url, info, user, time);
        video.userId = m.author.id;
        video.containedVideo = info;
        resolve(video);
      }
    });
  })
}

/*YoutubeTrack.prototype.getURL = function () {
 console.log(this.containedVideo.formats);
 let formats = this.containedVideo.formats
 .filter(f => f.container === "webm")
 .sort((a, b) => b.audioBitrate - a.audioBitrate);

 return (formats.find(f => f.audioBitrate > 0 && !f.bitrate) || formats.find(f => f.audioBitrate > 0)).url;
 };*/

YoutubeTrack.prototype.getURL = function () {
  let sourceURL = this.containedVideo.webpage_url || this.containedVideo.loaderUrl;
  let formats = this.containedVideo.formats
    .filter(f => f.ext === "webm" || f.container === "webm")
    .sort((a, b) => b.abr - a.abr);
  if (formats.length > 0) return (formats.find(f => (f.abr || f.audioBitrate) > 0 && !f.resolution) || formats.find(f => (f.abr || f.audioBitrate) > 0)).url;
  console.log("Could not find webm for ", sourceURL);
  formats = this.containedVideo.formats
    .filter(f => f.ext === "mp4" || f.container === "mp4")
    .sort((a, b) => b.abr - a.abr);
  if (formats.length > 0) return (formats.find(f => (f.abr || f.audioBitrate) > 0 && !f.resolution) || formats.find(f => (f.abr || f.audioBitrate) > 0)).url;
  console.log("Could not find mp4 for ", sourceURL);
  formats = this.containedVideo.formats
    .filter(f => f.ext === " vorbis" || f.container === "vorbis")
    .sort((a, b) => b.abr - a.abr);
  if (formats.length > 0) return (formats.find(f => (f.abr || f.audioBitrate) > 0 && !f.resolution) || formats.find(f => (f.abr || f.audioBitrate) > 0)).url;
  console.log("Could not find vorbis for ", sourceURL);
  formats = this.containedVideo.formats
    .filter(f => f.ext === " vorbis" || f.container === "vorbis")
    .sort((a, b) => b.abr - a.abr);
  if (formats.length > 0) return (formats.find(f => (f.abr || f.audioBitrate) > 0 && !f.resolution) || formats.find(f => (f.abr || f.audioBitrate) > 0)).url;
  console.log("Could not find vorbis for ", sourceURL);
  console.log("Formats found");
  console.log(this.containedVideo.formats);
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