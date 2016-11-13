/**
 * Created by meew0 on 2015-011-27.
 */
"use strict";

var youtubeDl = require('youtube-dl');
var ytdl = require('ytdl-core');
var Track = require('./track.js');


// formats in order of preference when streaming them
// starting numbers are itag values for youtube https://en.wikipedia.org/wiki/YouTube#Quality_and_formats
let idealItags = ["249", "250", "251", "171", "140", "141", "127", "128", "82", "83", "100", "84", "85", "5", "18", "43", "22", "36", "17",];

var YoutubeTrack = function () {
  Track.apply(this, arguments);
};

YoutubeTrack.prototype = Object.create(Track.prototype);

YoutubeTrack.getInfoFromVid = function (...args) {
  if (args[0].indexOf("youtu") > -1) {
    return fetchWithYtdl(...args).catch(() => fetchWithYoutubeDl(...args));
  } else {
    return fetchWithYoutubeDl(...args);
  }
};

function fetchWithYtdl(vid, m, user, time, raven) {
  return new Promise((resolve, reject)=> {
    ytdl.getInfo(vid, [], (err, info) => {
      if (err) {
        reject(err);
      } else {
        var video = new YoutubeTrack(info.url, info, user, time, raven);
        video.userId = m.author.id;
        video.containedVideo = info;
        resolve(video);
      }
    })
  });
}

function fetchWithYoutubeDl(vid, m, user, time, raven) {
  return new Promise((resolve, reject)=> {
    youtubeDl.getInfo(vid, [], {maxBuffer: 1000 * 1024}, (err, info) => {
      if (err) {
        reject(err);
      }
      else {
        var video = new YoutubeTrack(info.url, info, user, time, raven);
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
  // first round, extract anything with opus and feed that through.
  let streamableSource = {};
  let formats = this.containedVideo.formats;
  streamableSource.sourceURL = this.containedVideo.webpage_url || this.containedVideo.loaderUrl;
  // try and just use itag values
  let formatMap = formats.map(f => f.itag);
  for (let itag of idealItags) {
    if (formatMap.indexOf(itag) > -1) {
      console.log("found based on itag");
      let format = formats[formatMap.indexOf(itag)];
      streamableSource.encoding = getEncoding(format);
      streamableSource.container = getContainer(format);
      streamableSource.url = format.url;
      return streamableSource;
    }
  }

  let opusItems = this.containedVideo.formats
    .filter(f => isEncodedAs(f, "opus"));
  let webMOpusItems = opusItems.filter(f => isContainer(f, "webm"));
  if (webMOpusItems.length > 0) {
    streamableSource.encoding = "opus";
    streamableSource.container = "webm";
    let sortedwebMOpusItems = webMOpusItems.sort((a, b) => (b.abr || b.audioBitrate) - (a.abr || a.audioBitrate));
    streamableSource.url = sortedwebMOpusItems[0].url;
    console.log("Found webm/opus");
    if (this.raven) {
      process.nextTick(() => {
        let formats = toObj(this.containedVideo.formats);
        formats.chosen = streamableSource;
        this.raven.captureException("Could not determine format using itag values, found a webm/opus though", {
          extra: formats,
          level: "warning"
        });
      });
    }
    return streamableSource;
  }

  // let oggItems = opusItems.filter(f => isContainer(f, "ogg"));

  // second round, capture anything with a bitrate and no resolution
  formats = this.containedVideo.formats
    .sort((a, b) => b.abr - a.abr);
  if (formats.length > 0) {
    let format = (formats.find(f => (f.abr || f.audioBitrate) > 0 && !f.resolution) || formats.find(f => (f.abr || f.audioBitrate) > 0));
    if (format) {
      streamableSource.url = format.url;
      streamableSource.container = getContainer(format);
      streamableSource.encoding = getEncoding(format);
      console.log("defaulted to other ", streamableSource.container, streamableSource.encoding);
      if (this.raven) {
        process.nextTick(() => {
          let formats = toObj(this.containedVideo.formats);
          formats.chosen = streamableSource;
          this.raven.captureException("Could not find a webm/opus to queue", {
              extra: formats,
              level: "warning"
            });
        });
      }
      return streamableSource;
    }


    // 3rd round, extract mp3's and return those.
    format = formats.find(f => isContainer(f, "mp3"));
    if (format) {
      streamableSource.url = format.url;
      streamableSource.container = getContainer(format);
      streamableSource.encoding = getEncoding(format);
      console.log("defaulted to other ", streamableSource.container, streamableSource.encoding);
      if (this.raven) {
        process.nextTick(() => {
          let formats = toObj(this.containedVideo.formats);
          formats.chosen = streamableSource;
          this.raven.captureException("Could not find something with a bitrate and no reduction, defaulting to mp3", {
            extra: formats,
            level: "warning"
          });
        });
      }
      return streamableSource;
    }
  }
  if (this.raven) {
    this.raven.captureException("Could not find a format to queue", {
      extra: toObj(this.containedVideo.formats),
      level: "error"
    });
  }
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

function toObj(arr) {
  return arr.reduce(function (o, v, i) {
    o[i] = v;
    return o;
  }, {});
}

module.exports = YoutubeTrack;