/**
 * Created by macdja38 on 2017-03-12.
 */
"use strict";

/**
 * The object that describes a video object stored in pvpcraft
 * @typedef {Object} VideoUtils~Video
 * @property {Array<String>} votes
 */

/**
 * The object that describes video info fetched from youtube
 * @typedef {Object} VideoUtils~VideoInfo
 * @property {String} title The video's title
 * @property {Object | String} author The video's author
 * @property {String} title The video's title
 * @property {String} length_seconds The video's length in seconds
 * @property {String} view_count The video's view count
 * @property {String} [webpage_url] Video source URL
 * @property {String} [loaderUrl] Video Source URL
 * @property {Array<VideoUtils~VideoFormat>} formats Array of video formats
 */

/**
 * The object that describes A format included in the video info fetched from youtube
 * @typedef {Object} VideoUtils~VideoFormat
 * @property {String} itag
 * @property {String} format_id
 * @property {number} audioBitrate
 * @property {number} bitrate
 * @property {number} abr
 * @property {String} container
 * @property {String} ext
 * @property {String} encoding
 * @property {String} audioEncoding
 * @property {String} acodec
 */

const utils = require("./utils");

// formats in order of preference when streaming them
// starting numbers are itag values for youtube https://en.wikipedia.org/wiki/YouTube#Quality_and_formats
let idealFormatIds = ["250", "251", "249", "171", "140", "141", "127", "128", "82", "83", "100", "84", "85", "5", "18", "43", "22", "36", "17", "http_mp3_128_url"];

/**
 * Class containing methods designed for manipulating the info received from youtube-dl and ytdl-core results.
 * @class VideoUtils
 */
class VideoUtils {
  /**
   * returns a pretty version of the info received
   * @param {VideoUtils~VideoInfo} info {@link #VideoUtils~VideoInfo|Vidio Info}
   * @returns {string}
   */
  static prettyPrint(info) {
    return `**${utils.removeBlocks(info.title)}** by **${
      utils.removeBlocks(VideoUtils.prettyAuthor(info))}** (*${
      VideoUtils.formatViewCount(info)}* views) [${
      VideoUtils.prettyTime(info)}]`;
  }

  /**
   * returns pretty author info
   * @param {VideoUtils~VideoInfo} info {@link #VideoUtils~VideoInfo|Vidio Info}
   * @returns {string}
   */
  static prettyAuthor(info) {
    if (info.author) {
      if (typeof info.author === "object") {
        return utils.removeBlocks(info.author.name);
      } else {
        return utils.removeBlocks(info.author);
      }
    }
    return "none"
  }

  /**
   * Returns a videos vote skip count
   * @param {VideoUtils~Video} video {@link #VideoUtils~Video|Video}
   * @returns {number}
   */
  static prettyVotes(video) {
    if (Array.isArray(video.votes)) {
      return video.votes.length;
    } else {
      return 0;
    }
  }

  /**
   *
   * @param {VideoUtils~VideoInfo} info {@link #VideoUtils~VideoInfo|Video Info}
   * @returns {string}
   */
  static prettyTitle(info) {
    return utils.clean(info.title);
  }

  /**
   * returns a Stringified version of the video duration
   * @param {VideoUtils~VideoInfo} info {@link #VideoUtils~VideoInfo|Video Info}
   * @returns {string}
   */
  static prettyTime(info) {
    return utils.secondsToTime(parseInt(info.length_seconds, 10))
  }

  /**
   * returns a shorter string of the video duration
   * @param {VideoUtils~VideoInfo} info {@link #VideoUtils~VideoInfo|Video Info}
   * @returns {string}
   */
  static prettyShortTime(info) {
    return utils.secondsToShortTime(parseInt(info.length_seconds, 10));
  }

  /**
   * returns a video's view count
   * @param {VideoUtils~VideoInfo} info {@link #VideoUtils~VideoInfo|Video Info}
   * @returns {string}
   */
  static formatViewCount(info) {
    return info.view_count;
  }

  /**
   * Get's a streamable URL from a track
   * @param {VideoUtils~VideoInfo} info {@link #VideoUtils~VideoInfo|Video Info}
   * @returns {Object | null}
   */
  static getURL(info) {
    let streamableSource = {};
    let formats = info.formats;
    if (!info.hasOwnProperty("formats")) {
      throw "No formats available for requested media";
    }
    streamableSource.sourceURL = info.webpage_url || info.loaderUrl;
    // try and just use itag values
    let formatMap = formats.map(f => getFormatId(f));
    for (let itag of idealFormatIds) {
      if (formatMap.indexOf(itag) > -1) {
        let format = formats[formatMap.indexOf(itag)];
        streamableSource.encoding = getEncoding(format);
        streamableSource.container = getContainer(format);
        streamableSource.bitrate = getBitrate(format);
        streamableSource.url = format.url;
        return streamableSource;
      }
    }

    let opusItems = info.formats
      .filter(f => isEncodedAs(f, "opus"));
    let webMOpusItems = opusItems.filter(f => isContainer(f, "webm"));
    if (webMOpusItems.length > 0) {
      streamableSource.encoding = "opus";
      streamableSource.container = "webm";
      let sortedWebMOpusItems = webMOpusItems.sort((a, b) => getBitrate(b) - getBitrate(a));
      streamableSource.url = sortedWebMOpusItems[0].url;
      streamableSource.bitrate = getBitrate(sortedWebMOpusItems[0]);
      if (this.raven) {
        process.nextTick(() => {
          let formats = toObj(info.formats);
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
    formats = info.formats
      .sort((a, b) => getBitrate(b) - getBitrate(a));
    if (formats.length > 0) {
      let format = (formats.find(f => getBitrate(f) > 0 && !f.resolution) || formats.find(f => getBitrate(f) > 0));
      if (format) {
        streamableSource.url = format.url;
        streamableSource.container = getContainer(format);
        streamableSource.encoding = getEncoding(format);
        streamableSource.bitrate = getBitrate(format);
        if (this.raven) {
          process.nextTick(() => {
            let formats = toObj(info.formats);
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
        streamableSource.bitrate = getBitrate(format);
        if (this.raven) {
          process.nextTick(() => {
            let formats = toObj(info.formats);
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
        streamableSource.bitrate = getBitrate(format);
        if (this.raven) {
          process.nextTick(() => {
            let formats = toObj(info.formats);
            formats.chosen = streamableSource;
            this.raven.captureException("Could not find something with a bitrate and no reduction, defaulting to mp4", {
              extra: formats,
              level: "warning"
            });
          });
        }
        return streamableSource;
      }
    }
    if (this.raven) {
      let extra = toObj(info.formats);
      extra.source = streamableSource.sourceURL;
      this.raven.captureException("Could not find a format to queue", {
        extra,
        level: "error"
      });
    }
    return null;
  }
}

/**
 * Gets encoding from format
 * @param {VideoUtils~VideoFormat} format {@link #VideoUtils~VideoFormat|Video Format}
 * @returns {String}
 * @private
 */
function getEncoding(format) {
  return format.encoding || format.audioEncoding || format.acodec;
}

/**
 * Gets encoding from format
 * @param {VideoUtils~VideoFormat} format {@link #VideoUtils~VideoFormat|Video Format}
 * @returns {String}
 * @private
 */
function getContainer(format) {
  return format.ext || format.container;
}

/**
 * Gets encoding from format
 * @param {VideoUtils~VideoFormat} format {@link #VideoUtils~VideoFormat|Video Format}
 * @returns {number}
 * @private
 */
function getBitrate(format) {
  return format.audioBitrate || format.bitrate || format.abr;
}

/**
 * Gets encoding from format
 * @param {VideoUtils~VideoFormat} format {@link #VideoUtils~VideoFormat|Video Format}
 * @returns {String}
 * @private
 */
function getFormatId(format) {
  return format.itag || format.format_id;
}

/**
 * Gets encoding from format
 * @param {VideoUtils~VideoFormat} format {@link #VideoUtils~VideoFormat|Video Format}
 * @param {String} encoding
 * @returns {boolean}
 * @private
 */
function isEncodedAs(format, encoding) {
  return getEncoding(format) === encoding;
}

/**
 * Gets encoding from format
 * @param {VideoUtils~VideoFormat} format {@link #VideoUtils~VideoFormat|Video Format}
 * @param {String} container
 * @returns {boolean}
 * @private
 */
function isContainer(format, container) {
  return getContainer(format) === container;
}

/**
 * Turns an array into an object
 * @param {Array<*>} arr
 * @returns {Object}
 * @private
 */
function toObj(arr) {
  return arr.reduce(function (object, variable, index) {
    object[index] = variable;
    return object;
  }, {});
}

module.exports = VideoUtils;