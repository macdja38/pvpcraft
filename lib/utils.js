/**
 * Created by macdja38 on 2016-04-19.
 */

var Utils = function () {

};

/**
 * convert seconds into english time string
 * @param secs
 * @returns {string}
 */
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
    else {
        return seconds + " Second" + s(seconds);
    }
};

/**
 * returns s if seconds is greater than one.
 * @param v
 * @returns {string}
 */
function s(v) {
    return (v > 1) ? "s" : "";
}

/**
 * Nullifies codeblocks and Mentions
 * @param text
 * @returns {*}
 */
Utils.prototype.clean = function clean(text) {
    if (typeof(text) === "string") {
        return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
    }
    else {
        return text;
    }
};

/**
 * returns user's name cleaned and with discriminator
 * @param user
 * @returns {string}
 */
Utils.prototype.fullName = function fullName(user) {
    if (!user) return "Undefined user";
    return this.clean(user.username) + "#" + user.discriminator
};

/**
 * Returns user's name stripped of `, cleaned and with discriminator
 * @param user
 * @returns {string}
 */
Utils.prototype.fullNameB = function fullName(user) {
    if (!user) return "Undefined user";
    return "" + this.removeBlocks(user.username) + "#" + user.discriminator + ""
};

/**
 * strips ` from text and replaces them with visually similar characters
 * @param text
 * @returns {*}
 */
Utils.prototype.removeBlocks = function removeBlocks(text) {
    if (typeof(text) === "string") {
        return text.replace(/`/g, "｀").replace(/@/g, "@" + String.fromCharCode(8203));
    }
    else {
        return text;
    }
};

/**
 * cleans text and add's codeblocks
 * @param text
 * @returns {string}
 */
Utils.prototype.bubble = function bubble(text) {
    return "```" + this.removeBlocks(text) + "```";
};

/**
 * Shuffles an array using fisher-Yates shuffle
 * @param array
 * @returns {*}
 */
Utils.prototype.shuffle = function shuffle(array) {
    if (array.length > 0) {
        var m = array.length, t, i;

        // While there remain elements to shuffle…
        while (m) {

            // Pick a remaining element…
            i = Math.floor(Math.random() * m--);

            // And swap it with the current element.
            t = array[m];
            array[m] = array[i];
            array[i] = t;
        }
    }
    return array;
};

/**
 * cleans text and add inline codeblocks.
 * @param text
 * @returns {string}
 */
Utils.prototype.inline = function inline(text) {
    return "`" + this.clean(text) + "`";
};

/**
 * count differences between two strings.
 * @param s string 1
 * @param t string 2
 * @returns {*} count of changes
 */
Utils.prototype.compare = function compare(s, t) {
    //function coded by James Westgate
    var d = []; //2d matrix

    // Step 1
    var n = s.length;
    var m = t.length;

    if (n == 0) return m;
    if (m == 0) return n;

    //Create an array of arrays in javascript (a descending loop is quicker)
    for (var i = n; i >= 0; i--) d[i] = [];

    // Step 2
    for (var i = n; i >= 0; i--) d[i][0] = i;
    for (var j = m; j >= 0; j--) d[0][j] = j;

    // Step 3
    for (var i = 1; i <= n; i++) {
        var s_i = s.charAt(i - 1);

        // Step 4
        for (var j = 1; j <= m; j++) {

            //Check the jagged ld total so far
            if (i == j && d[i][j] > 4) return n;

            var t_j = t.charAt(j - 1);
            var cost = (s_i == t_j) ? 0 : 1; // Step 5

            //Calculate the minimum
            var mi = d[i - 1][j] + 1;
            var b = d[i][j - 1] + 1;
            var c = d[i - 1][j - 1] + cost;

            if (b < mi) mi = b;
            if (c < mi) mi = c;

            d[i][j] = mi; // Step 6

            //Damerau transposition
            if (i > 1 && j > 1 && s_i == t.charAt(j - 2) && s.charAt(i - 2) == t_j) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
            }
        }
    }
    // Step 7
    return d[n][m];
};

module.exports = Utils;