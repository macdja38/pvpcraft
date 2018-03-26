/**
 * Created by macdja38 on 2016-06-21.
 */
"use strict";

const BaseDB = require("./BaseDB");

/**
 * Database based config file with feed based updating
 * @class ConfigDB
 */
class ConfigDB extends BaseDB {
  /**
   * create config instance.
   * @constructor
   * @param {R} r rethinkdbdash R
   * @param {string} table the configs are stored in
   * @param {Eris} client Eris Client
   */
  constructor(r, table, client) {
    super(r);
    this.r = r;
    this.table = table;
    this.client = client;
    this.data = {};
    this._cursor = null;
  }

  /**
   * Must be passed guilds to be added to the config, otherwise their data will not be fetched.
   * @param {Guild} server Eris Guild object of new discord
   * @returns {Promise} if adding the guilds data was successful.
   */
  serverCreated(server) {
    return this.r.table(this.table).get(server.id).run().then((thing) => {
      if (thing) {
        this.data[server.id] = thing;
      }
      this.follow();
    });
  }

  /**
   * Follows all current servers
   * @private
   */
  follow() {
    this.r.table(this.table).getAll(...ConfigDB._addStar(this.client.guilds.map(s => s.id))).changes().run().then((cursor) => {
      if (this._cursor) this._cursor.close();
      this._cursor = cursor;
      cursor.each((err, thing) => {
        if (thing && thing.new_val) {
          this.data[thing.new_val.id] = thing.new_val;
        } else {
          delete this.data[thing.old_val.id];
        }
      })
    }).catch(e => console.error(e));
  }

  /**
   * Reloads a specific servers records from the db.
   * @returns {Promise} resolves when all data is loaded.
   */
  reload() {
    return new Promise((resolve, reject) => {
      try {
        this.ensureTable(this.table).then(() => {
          /*this.r.table(this.table).insert([{id: "*", prefix: "//", "changeThresh": 1}]).run().then((res)=>{
           console.log(res);
           });*/
          console.log(`Connected to db ${this.table} on shard ${process.env.id}`.blue);
          return this.r.table(this.table).getAll(...ConfigDB._addStar(this.client.guilds.map(s => s.id))).run().then(data => {
            data.forEach((thing) => {
              this.data[thing.id] = thing;
            });
            this.follow();
            console.log(`Loaded Data from db ${this.table} on shard ${process.env.id}`.yellow + 0);
            resolve();
          }).catch(e => console.error(e));
        });
      } catch (error) {
        console.error(error);
        reject("error loading");
      }
    })
  }

  /**
   * Saves a config record to the database
   * @param {Object} [options] optional options object
   * @param {string} [options.server = "*"] server who's record to record.
   */
  write(options = {server: "*"}) {
    let serverId = options.server || "*";
    if (this.data[serverId] !== null && typeof(this.data[serverId]) === "object") {
      this.data[serverId].id = serverId;
      return this.r.table(this.table).insert(this.data[serverId], {conflict: (options.conflict) ? options.conflict : "update"}).run().catch(console.error);
    }
    if (this.data.hasOwnProperty(serverId)) {
      delete this.data[serverId];
    }
    return this.r.table(this.table).get(serverId).delete().run().catch(console.error);
  }

  /**
   * adds an item to an array, takes the key to the array
   * @param {string} key key in database
   * @param {*} value default value
   * @param {Object} [options]
   * @param {string} [options.server="*"]
   * @param {string} [options.conflict="update"]
   * @returns {Promise}
   */
  add(key, value, options = {}) {
    if (!options.hasOwnProperty("server")) {
      options.server = "*";
    }
    if (!options.hasOwnProperty("conflict")) {
      options.conflict = "update";
    }

    return this.r.table(this.table).insert({
      "id": options.server,
      entries: this.r.table(this.table).get(options.server)(key).setInsert(value)
    }, {"conflict": options.conflict}).run();
  }

  /**
   * Stores the value in the current data and writes it out to file.
   * @param {string | null} key key to store if none is defined object is written directly to the db.
   * @param {*} value value to store at key
   * @param {Object} [options] optional options object
   * @param {string} [options.server="*"] id of record to write to, typically server id.
   * @param {boolean} [options.write=true] Save changes to database
   */
  set(key, value, options = {}) {
    if (options.hasOwnProperty("server")) {
      if (key == null) {
        this.data[options.server] = value;
      }
      else if (!this.data.hasOwnProperty(options.server)) {
        this.data[options.server] = {[key]: value, id: options.server};
      } else {
        this.data[options.server][key] = value;
      }
    } else {
      this.data["*"][key] = value;
    }
    if (options.write === false) {
      if (options.hasOwnProperty("server")) {
        return Promise.resolve(this.data[options.server]);
      } else {
        return Promise.resolve(this.data["*"]);
      }
    } else {
      return this.write(options);
    }
  };

  /**
   * Directly runs .update with a supplied object
   * @param {Object} object
   * @param {Object} [options = {}]
   * @param {string} [options.server = "*"]
   */
  directSet(object, options = {}) {
    if (!options.hasOwnProperty("server")) {
      options.server = "*";
    }
    if (typeof options.server !== "string") {
      throw "server must be string";
    }
    object.id = options.server;
    return this.r.table(this.table).insert(object, {conflict: "update"}).run();
  }

  /**
   * counts the array at key
   * @param {string} key key to check
   * @param {Object} [options] optional options object;
   * @param {string} [options.server="*"] server id to check record for.
   * @returns {Promise<number>}
   */
  count(key, options = {server: "*"}) {
    options.server = options.server || "*";
    return this.r.table(this.table).get(options.server)(key).count().run();
  }

  /**
   * Get a random item from the array contained in key
   * @param {string} key database key to get array from
   * @param {number} count number of entries to pick
   * @param {Object} [options]
   * @param {string} [options.server="*"] server to get records from
   * @returns {Promise<Array<string>>}
   */
  getRandom(key, count, options = {server: "*"}) {
    return this.r.table(this.table).get(options.server)(key).sample(count).run();
  }

  /**
   * get config value by key. returns a promise in preparation for config's being pulled from an external database.
   * @param {string | null} key to check for
   * @param {*} [def=null] default value if value is not in config.
   * @param {Object} [options] takes an options value, supports {server: id} to get per server values of config settings.
   * @param {string} [options.server="*"] Id of the guild to get data for
   * @return {*} that will be resolved to the config key
   */
  get(key, def, options) {
    if (options && options.hasOwnProperty("server")) {
      let serverData, globalData;
      if (this.data.hasOwnProperty(options.server)) {
        serverData = this.data[options.server];
      }
      globalData = this.data["*"];
      if (key == null) {
        if (serverData) {
          return serverData;
        } else {
          if (def) {
            return def;
          } else if (globalData) {
            return globalData;
          }
        }
      }
      if (serverData && serverData.hasOwnProperty(key)) {
        return serverData[key];
      }
      if (globalData && globalData.hasOwnProperty(key)) {
        return globalData[key];
      }
      return def;
    }
    if (this.data.hasOwnProperty(key)) {
      return this.data[key];
    }
    return def
  }

  /**
   * Adds "*" to an array
   * @param {Array<string>} array Array to append "*" to.
   * @returns {Array<string>}
   * @private
   */
  static _addStar(array) {
    array.push("*");
    return array;
  }
}

module.exports = ConfigDB;