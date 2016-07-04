/**
 * Created by meew0 on 2015-011-27.
 */
"use strict";

var Utils = require('./utils.js');
var utils = new Utils();

var Track = function (vid, info, user, time) {
    this.vid = vid;
    this.title = info.title;
    this.author = info.author;
    this.time = time;
    this.viewCount = info.viewCount || info.view_count;
    this.lengthSeconds = info.lengthSeconds || info.length_seconds;
    this.votes = [];
    this.user = user;
};

Track.prototype.formatViewCount = function () {
    return this.viewCount ? this.viewCount.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 'unknown';
};

Track.prototype.formatTime = function () {
    return utils.secondsToTime(this.lengthSeconds);
};

Track.prototype.prettyPrint = function () {
    return `**${utils.removeBlocks(this.title)}** by **${utils.removeBlocks(this.author)}** *(${this.formatViewCount()} views)* [${this.formatTime()}]`;
};

Track.prototype.prettyTitle = function () {
    return utils.clean(this.title).replace(/'/g, "");
};

Track.prototype.prettyAuthor = function () {
    return utils.clean(this.author);
};

Track.prototype.prettyViews = function () {
    return this.formatViewCount();
};

Track.prototype.prettyTime = function () {
    return this.formatTime();
};

Track.prototype.fullPrint = function () {
    return `${this.prettyPrint()}, added by <@${this.userId}>`;
};

Track.prototype.saveable = function () {
    return {
        vid: this.vid,
        title: this.title,
        author: this.author,
        viewCount: this.viewCount,
        lengthSeconds: this.lengthSeconds
    };
};

Track.prototype.getTime = function () {
    return this.lengthSeconds;
};

module.exports = Track;