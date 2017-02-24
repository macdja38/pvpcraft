/**
 * Created by meew0 on 2015-011-27.
 */
"use strict";

let utils = require('./utils.js');

class Track {
  constructor(vid, info, user, time, raven) {
    this.raven = raven;
    this.vid = vid;
    this.title = info.title;
    this._author = info.author || info.uploader || "none";
    this.time = time;
    this.link = info.video_id ? `https://www.youtube.com/watch?v=${info.video_id}` : (info.webpage_url || info.loaderUrl || vid);
    this.viewCount = info.viewCount || info.view_count || 0;
    this.lengthSeconds = info.lengthSeconds || info.length_seconds || (info.duration ? timeToSeconds(info.duration) : null) || 0;
    this.votes = [];
    this.user = user;
  }

  get author() {
    if (typeof this._author === "object" && this._author != null) {
      return this._author.name;
    }
    return this._author;
  }

  formatViewCount() {
    return this.viewCount;
  }

  formatTime() {
    return utils.secondsToTime(this.lengthSeconds);
  }

  prettyPrint() {
    return `**${utils.removeBlocks(this.title)}** by **${utils.removeBlocks(this.author)}** (*${this.formatViewCount()}* views) [${this.formatTime()}]`;
  }

  prettyTitle() {
    return utils.clean(this.title).replace(/'/g, "");
  }

  prettyAuthor() {
    return utils.clean(this.author);
  }

  prettyViews() {
    return this.formatViewCount();
  }

  prettyTime() {
    return this.formatTime();
  }

  fullPrint() {
    return `${this.prettyPrint()}, added by <@${this.userId}>`;
  }

  saveable() {
    return {
      vid: this.vid,
      title: this.title,
      author: this.author,
      viewCount: this.viewCount,
      lengthSeconds: this.lengthSeconds
    };
  }

  getTime() {
    return this.lengthSeconds;
  }
}

module.exports = Track;

function timeToSeconds(string) {
  let parts = string.split(":");
  let seconds = parseInt(parts[parts.length-1]);
  let minutes = parseInt(parts[parts.length-2]) || 0;
  let hours = parseInt(parts[parts.length-3]) || 0;

  return (60*60*hours + 60*minutes + seconds);
}