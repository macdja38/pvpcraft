/**
 * Created by macdja38 on 2016-11-26.
 */
"use strict";
const BaseDB = require("./BaseDB");
const request = require("request");
const youtubeDl = require("youtube-dl");
const ytdl = require("ytdl-core");
const crypto = require("crypto");

let normalisationMap = {
  author: ["author", "uploader"],
  time: ["time"],
  view_count: ["viewCount", "view_count"],
  formats: ["formats"],
  title: ["title"],
};

class MusicDB extends BaseDB {
  /**
   * Music database and utils
   * @param {R} r
   * @param {Object} [e={}]
   * @param {string} [e.apiKey] youtube api key without this music queueing will be disabled
   */
  constructor(r, e = {}) {
    super(r);
    this.apiKey = e.apiKey;
    this.table = "queue";
    this.rtable = this.r.table(this.table);
    this.searchCache = "searchCache";
    this.videoCache = "videoCache";
    this.discordFMCache = "discordFMCache";
    this.ensureTable("queue", {});
    this.ensureTable(this.searchCache);
    this.ensureTable(this.videoCache);
    this.ensureTable(this.discordFMCache);
  }

  getAll(...args) {
    return this.r.table(this.table).getAll(...args);
  }

  /**
   * Returns a count of the number of songs queued by a specific user
   * @param {string} guild_id
   * @param {string} user_id
   * @returns {Promise<number>}
   */
  countVideosQueuedBy(guild_id, user_id) {
    return this.r.table(this.table).get(guild_id)("queue").filter({user_id,}).count();
  }

  saveQueue(info, queue) {
    let status = {
      id: info.id,
      guild_name: info.guild_name,
      text: info.text,
      text_id: info.text_id,
      voice: info.voice,
      voice_id: info.voice_id,
      queue
    };
    return this.r.table(this.table).insert(status, {conflict: "update"}).run();
  }

  /**
   * Adds a song to a guild's queue
   * @param {string} id
   * @param {...Object} song
   * @param {string} song.link
   * @param {string} song.user_id
   * @param {string} song.user_name
   */
  addSong(id, ...song) {
    return this.r.table(this.table).get(id).update({
      queue: this.r.row("queue").append(...song)
    }).run();
  }

  queueLength(id) {
    return this.r.table(this.table).get(id)("queue").count().run();
  }

  /**
   * adds an item to an array, takes the key to the array
   * @param {string} id
   * @param {number} index
   * @param {string} userId
   * @returns {Promise<number | boolean>} number of votes if added, false if unchanged
   */
  addVote(id, index, userId) {
    return this.r.db("tau").table("queue").get(id).update({
      queue: this.r.row("queue").changeAt(index,
        this.r.row("queue").nth(5).do(function(song) {
          return song.merge({votes: song("votes").default([]).setInsert(userId)})
        })
      )}, {nonAtomic: true, returnChanges: true})
      .do((doc) => {
        return this.r.branch(doc("changes").count().gt(0), doc("changes").nth(0)("new_val")("queue").nth(index)("votes").count(), false)
      }).run();
  }

  saveCurrentSong(info, currentSong) {
    let status = {
      id: info.id,
      guild_name: info.guild_name,
      text: info.text,
      text_id: info.text_id,
      voice: info.voice,
      voice_id: info.voice_id,
      currentSong
    };
    return this.r.table(this.table).insert(status, {conflict: "update"}).run();
  }

  /**
   * Shuffles the current Queue
   * @param {string} id
   */
  shuffle(id) {
    return this.r.table(this.table).get(id).update({queue: this.r.row("queue").sample(10000000)}, {nonAtomic: true}).run();
  }

  /**
   * Removes a video from the queue and returns it
   * @param id
   * @param index
   * @returns {Promise.<TResult>|Request|*}
   */
  spliceVideo(id, index=0) {
    return this.r.table(this.table).get(id).update({
      queue: this.r.row("queue").deleteAt(index)
    }, {returnChanges: true}).run().then((thing) => {
      return thing.changes[0].old_val.queue[index];
    });
  }

  /**
   * Get's the next video(s) in the queue
   * @param {string} id guild id
   * @param {number} [count=1] number of songs to fetch
   * @param {number} [starting=0] index to start at, for pagination etc.
   * @returns {*}
   */
  getNextVideos(id, count=1, starting=0) {
    return this.r.table(this.table).get(id)("queue").slice(starting, starting+count).run();
  }

  /**
   * Get's the next video(s) in the queue
   * @param {string} id guild id
   * @param {number} [count=1] number of songs to fetch
   * @param {number} [starting=0] index to start at, for pagination etc.
   * @returns {Object<{song: Object, info: Object}>}
   */
  async getNextVideosCachedInfoAndVideo(id, count=1, starting=0) {
    let queue = await this.getNextVideos(id, count, starting);
    let songList = await Promise.all(queue.map(song => this.getCachingInfoLink(song.link, {allowOutdated: true})));
    return queue.map((song, i) => ({song: song, info: songList[i]}));
  }

  saveVid(linkHash, link, video) {
    video.id = linkHash;
    video.link = link;
    video.timeFetched = Date.now();
    return this.r.table(this.videoCache).insert(video, {conflict: "replace"}).run();
  }

  getVid(hash) {
    return this.r.table(this.videoCache).get(hash).run();
  }

  saveSearch(string, result) {
    return this.r.table(this.searchCache).insert({id: string, result: result, timeFetched: Date.now()}, {conflict: "replace"}).run();
  }

  getSearch(string) {
    return this.r.table(this.searchCache).get(string).run();
  }

  saveDiscordFMPlaylist(id, playlist) {
    return this.r.table(this.discordFMCache).insert({id, playlist}, {conflict: "replace"}).run();
  }

  getDiscordFMPlaylist(id) {
    return this.r.table(this.discordFMCache).get(id).run();
  }

  async cachingSearch(string) {
    let cache = await this.getSearch(string);
    if (cache) return cache;
    let response = await this.search(string);
    this.saveSearch(string, response).catch(error => console.error);
    return response;
  }

  search(string) {
    return new Promise((resolve, reject) => {
      let requestUrl = "https://www.googleapis.com/youtube/v3/search" +
        `?part=snippet&q=${string}&key=${this.apiKey}&regionCode=${this.regionCode}`;
      request({method: "GET", uri: requestUrl, gzip: true}, (error, response) => {
        if (error) reject(error);
        resolve(JSON.parse(response.body));
      })
    })
  }

  /**
   * Uses cache to get info for a link
   * @param {string} link
   * @param {Object} [options]
   * @param {boolean} [options.allowOutdated=false]
   * @returns {Promise}
   */
  async getCachingInfoLink(link, options={}) {
    let hashedLink = crypto.createHash("sha256").update(link).digest("hex");
    return this.getCachingInfoHash(hashedLink, link, options)
  }

  /**
   * Uses cache to get info for a hashed link
   * @param {string} hashedLink
   * @param {string} link
   * @param {Object} [options]
   * @param {boolean} [options.allowOutdated=false]
   * @returns {Promise<Object>}
   */
  async getCachingInfoHash(hashedLink, link, options={}) {
    let cachedInfo = await this.getVid(hashedLink);
    console.log("resolving ", hashedLink);
    if (cachedInfo && (options.allowOutdated || cachedInfo.hasOwnProperty("timeFetched") && typeof cachedInfo.timeFetched === "number" && Date.now() - cachedInfo.timeFetched < 4 * 60 * 60 * 1000)) return cachedInfo;
    let info = await this.getInfoFromVid(link);
    console.log("Cache outdated. Fetched new info");
    this.saveVid(hashedLink, link, info);
    return info;
  }

  getInfoFromVid(...args) {
    if (args[0].indexOf("youtu") > -1) {
      return this.fetchWithYtdl(...args).catch((err) => {
        if (this.raven) {
          this.raven.captureException(err);
        }
        console.error(err); //TODO: remove before production
        this.fetchWithYoutubeDl(...args)
      });
    } else {
      return this.fetchWithYoutubeDl(...args);
    }
  }

  fetchWithYtdl(link) {
    return new Promise((resolve, reject)=> {
      ytdl.getInfo(link, [], (err, info) => {
        if (err) {
          reject(err);
        } else {
          resolve(this.normaliseInfo(info));
        }
      })
    });
  }

  fetchWithYoutubeDl(link) {
    return new Promise((resolve, reject)=> {
      youtubeDl.getInfo(link, [], {maxBuffer: 1000 * 1024}, (err, info) => {
        if (err) reject(err);
        else resolve(this.normaliseInfo(info));
      });
    })
  }

  /**
   * normalise a ytdl or youtube-dl info object
   * @param {Object} info
   */
  normaliseInfo(info) {
    let normalisedInfo = {};
    for (let prop in normalisationMap) {
      let value = normalisationMap[prop];
      for (let possiblePropName of value) {
        if (info[possiblePropName] != null) {
          normalisedInfo[prop] = info[possiblePropName];
          break;
        }
      }
    }
    if (info.lengthSeconds != null) {
      normalisedInfo.length_seconds = info.lengthSeconds;
    } else if (info.length_seconds != null) {
      normalisedInfo.length_seconds = info.length_seconds;
    } else if (info.duration != null) {
      normalisedInfo.length_seconds = MusicDB._timeToSeconds(info.duration);
    }
    return normalisedInfo;
  }


  /**
   * Converts string to seconds;
   * @param {string} string
   * @returns {number}
   * @private
   */
  static _timeToSeconds(string) {
    let parts = string.split(":");
    let seconds = parseInt(parts[parts.length - 1]);
    let minutes = parseInt(parts[parts.length - 2]) || 0;
    let hours = parseInt(parts[parts.length - 3]) || 0;

    return (60 * 60 * hours + 60 * minutes + seconds);
  }
}

module.exports = MusicDB;