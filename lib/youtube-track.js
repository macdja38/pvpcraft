/**
 * Created by meew0 on 2015-011-27.
 */
"use strict";

let youtubeDl = require('youtube-dl');
let ytdl = require('ytdl-core');
let Track = require('./track.js');


// formats in order of preference when streaming them
// starting numbers are itag values for youtube https://en.wikipedia.org/wiki/YouTube#Quality_and_formats
let idealFormatIds = ["249", "250", "251", "171", "140", "141", "127", "128", "82", "83", "100", "84", "85", "5", "18", "43", "22", "36", "17", "http_mp3_128_url"];

class YoutubeTrack extends Track {
  /**
   * Youtube specific track
   * @param args passed to track this extends
   */
  constructor(...args) {
    super(...args);
  }

  /**
   * Get's a streamable URL from a track
   * @returns {*}
   */
  getURL() {
    let streamableSource = {};
    let formats = this.containedVideo.formats;
    streamableSource.sourceURL = this.containedVideo.webpage_url || this.containedVideo.loaderUrl;
    // try and just use itag values
    let formatMap = formats.map(f => getFormatId(f));
    for (let itag of idealFormatIds) {
      if (formatMap.indexOf(itag) > -1) {
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

      // 4rd round, extract mp4's and return those.
      format = formats.find(f => isContainer(f, "mp4"));
      if (format) {
        streamableSource.url = format.url;
        streamableSource.container = getContainer(format);
        streamableSource.encoding = getEncoding(format);
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
      let extra = toObj(this.containedVideo.formats);
      extra.source = streamableSource.sourceURL;
      this.raven.captureException("Could not find a format to queue", {
        extra,
        level: "error"
      });
    }
    return null;
  }


  static getInfoFromVid(...args) {
    if (args[0].indexOf("youtu") > -1) {
      return fetchWithYtdl(...args).catch(() => fetchWithYoutubeDl(...args));
    } else {
      return fetchWithYoutubeDl(...args);
    }
  }
}


function fetchWithYtdl(vid, m, user, time, raven) {
  return new Promise((resolve, reject)=> {
    ytdl.getInfo(vid, [], (err, info) => {
      if (err) {
        reject(err);
      } else {
        let video = new YoutubeTrack(info.url, info, user, time, raven);
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
        let video = new YoutubeTrack(info.url, info, user, time, raven);
        video.userId = m.author.id;
        video.containedVideo = info;
        resolve(video);
      }
    });
  })
}

function getEncoding(info) {
  return info.encoding || info.audioEncoding || info.acodec;
}

function getContainer(info) {
  return info.ext || info.container;
}

function getFormatId(info) {
  return info.itag || info.format_id;
}

function isEncodedAs(info, encoding) {
  return getEncoding(info) === encoding;
}

function isContainer(info, container) {
  return getContainer(info) === container;
}

function toObj(arr) {
  return arr.reduce(function (o, v, i) {
    o[i] = v;
    return o;
  }, {});
}

module.exports = YoutubeTrack;