/**
 * Created by macdja38 on 2016-04-19.
 */
"use strict";

/**
 * @type Utils
 */
class Utils {
  /**
   * convert seconds into english time string
   * @param {number} secs
   * @returns {string}
   */
  static secondsToTime(secs) {
    secs = Math.round(secs);

    let days = Math.floor(secs / (60 * 60 * 24));

    let divisor_for_hours = secs % (24 * 60 * 60);
    let hours = Math.floor(divisor_for_hours / (60 * 60));

    let divisor_for_minutes = secs % (60 * 60);
    let minutes = Math.floor(divisor_for_minutes / 60);

    let divisor_for_seconds = divisor_for_minutes % 60;
    let seconds = Math.ceil(divisor_for_seconds);
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
  }

  /**
   * convert seconds into short english time string eg 25m 32s
   * @param {number} secs
   * @returns {string}
   */
  static secondsToShortTime(secs) {
    secs = Math.round(secs);

    let days = Math.floor(secs / (60 * 60 * 24));

    let divisor_for_hours = secs % (24 * 60 * 60);
    let hours = Math.floor(divisor_for_hours / (60 * 60));

    let divisor_for_minutes = secs % (60 * 60);
    let minutes = Math.floor(divisor_for_minutes / 60);

    let divisor_for_seconds = divisor_for_minutes % 60;
    let seconds = Math.ceil(divisor_for_seconds);
    if (days > 0) {
      return days + "d, " + hours + "h" ;
    }
    else if (hours > 0) {
      return hours + "h, " + minutes + "m" ;
    }
    else if (minutes > 0) {
      return minutes + "m, " + seconds + "s" ;
    }
    else {
      return seconds + "s" ;
    }
  }

  /**
   * Converts a discord id to a unix timestamp
   * @param {string} id
   * @returns {number}
   */
  static idToUnixTime(id) {
    // http://i.imgur.com/UxWvdYD.png
    // 2**22 is precomputed here to be 4194304
    return id / 4194304 + 1420070400000;
  }

  /**
   * Converts a discord id to an ISO String
   * @param {string} id
   * @returns {string} time
   */
  static idToUTCString(id) {
    return new Date(Utils.idToUnixTime(id)).toUTCString()
  }

  /**
   * Nullifies codeblocks and Mentions
   * @param {string} text
   * @returns {string}
   */
  static clean(text) {
    if (typeof(text) === "string") {
      return text.replace(/`/g, "`\u200B").replace(/@/g, "@\u200B");
    }
    else {
      return text;
    }
  }

  /**
   * returns user's name cleaned and with discriminator
   * @param {User | Member} user
   * @returns {string}
   */
  static fullName(user) {
    if (!user) return "Undefined user";
    return this.clean(user.username) + "#" + user.discriminator
  }

  /**
   * Returns user's name stripped of `, cleaned and with discriminator
   * @param {User|Member} user
   * @returns {string}
   */
  static fullNameB(user) {
    if (!user) return "Undefined user";
    return "" + this.removeBlocks(user.username) + "#" + user.discriminator + ""
  }

  /**
   * strips ` from text and replaces them with visually similar characters
   * @param {string} text
   * @returns {*}
   */
  static removeBlocks(text) {
    if (typeof(text) === "string") {
      return text.replace(/`/g, "｀").replace(/@/g, "@\u200B");
    }
    else {
      return text;
    }
  }

  /**
   * cleans text and add's codeblocks
   * @param {string} text
   * @returns {string}
   */
  static bubble(text) {
    return "```" + this.removeBlocks(text) + "```";
  }

  /**
   * Shuffles an array using fisher-Yates shuffle
   * @param {Array} array
   * @returns {Array}
   */
  static shuffle(array) {
    if (array.length > 0) {
      let m = array.length, t, i;

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
  }

  //noinspection JSUnusedGlobalSymbols
  /**
   * cleans text and add inline codeblocks.
   * @param {string} text
   * @returns {string}
   */
  static inline(text) {
    return "`" + this.clean(text) + "`";
  }

  /**
   * strips ZWS from text
   * @param {string|XML} text
   * @returns {void|string|XML}
   */
  static stripNull(text) {
    return text.replace(/\u200B/g, "")
  }

  /**
   * count differences between two strings.
   * @param {string} s string 1
   * @param {string} t string 2
   * @returns {number} count of changes
   */
  static compare(s, t) {
    //function coded by James Westgate
    let d = []; //2d matrix

    // Step 1
    let n = s.length;
    let m = t.length;

    if (n == 0) return m;
    if (m == 0) return n;

    //Create an array of arrays in javascript (a descending loop is quicker)
    for (let i = n; i >= 0; i--) d[i] = [];

    // Step 2
    for (let i = n; i >= 0; i--) d[i][0] = i;
    for (let j = m; j >= 0; j--) d[0][j] = j;

    // Step 3
    for (let i = 1; i <= n; i++) {
      let s_i = s.charAt(i - 1);

      // Step 4
      for (let j = 1; j <= m; j++) {

        //Check the jagged ld total so far
        if (i == j && d[i][j] > 4) return n;

        let t_j = t.charAt(j - 1);
        let cost = (s_i == t_j) ? 0 : 1; // Step 5

        //Calculate the minimum
        let mi = d[i - 1][j] + 1;
        let b = d[i][j - 1] + 1;
        let c = d[i - 1][j - 1] + cost;

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
  }
}

/**
 * returns s if seconds is greater than one.
 * @param {number} v
 * @returns {string}
 */
function s(v) {
  return (v > 1) ? "s" : "";
}

module.exports = Utils;