/**
 * Created by macdja38 on 2016-04-19.
 */

var Utils = function() {
    
};

Utils.prototype.secondsToTime = function secondsToTime(secs) {
    secs = Math.round(secs);

    var days = Math.floor(secs / (60 * 60 * 24));

    var divisor_for_hours = secs % (24 * 60 * 60);
    var hours = Math.floor(divisor_for_hours / (60 * 60));

    var divisor_for_minutes = secs % (60 * 60);
    var minutes = Math.floor(divisor_for_minutes / 60);

    var divisor_for_seconds = divisor_for_minutes % 60;
    var seconds = Math.ceil(divisor_for_seconds);
    if (days > 0) {
        return days + " Day" + s(days) + " and " + hours + " Hour" + s(hours);
    }
    else if (hours > 0) {
        return hours + " Hour" + s(hours) + " and " + minutes + " Minute" + s(minutes);
    }
    else if (minutes > 0) {
        return minutes + " Minute" + s(minutes) + " and " + seconds + " Second" + s(seconds);
    }
    else if (seconds) {
        return seconds + " Second" + s(seconds);
    }
};

function s(v) {
    return (v > 1) ? "s" : "";
};

Utils.prototype.clean = function clean(text) {
    if (typeof(text) === "string") {
        return text.replace(/`/g, "`" + String.fromCharCode(8203));
    }
    else {
        return text;
    }
};

Utils.prototype.fullName = function fullName(user) {
    return this.clean(user.username) + "#" + user.discriminator
};

Utils.prototype.fullNameB = function fullName(user) {
    return "" + this.removeBlocks(user.username) + "#" + user.discriminator + ""
};

Utils.prototype.removeBlocks = function removeBlocks(text) {
    return text.replace(/`/g, "'")
};

Utils.prototype.bubble = function bubble(text) {
    return "\n```" + this.clean(text) + "```";
};

module.exports = Utils;