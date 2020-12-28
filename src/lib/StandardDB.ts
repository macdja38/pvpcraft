/**
 * Created by macdja38 on 2016-09-12.
 */

"use strict";

import BaseDB from "./BaseDB";

/**
 * Standard database abstractions class without any following of config specific code
 * @class StandardDB
 * @extends BaseDB
 */
class StandardDB extends BaseDB {
  private _ids: string[];
  private data: { [keyof: string]: any};
  private _cursor?: any;

  /**
   * create config instance
   * @constructor
   * @param {Object} r
   * @param {string} table the configs are stored in
   * @param {string[]} ids of configs to load
   */
  constructor(r: any, table: string, ids: string[]) {
    super(r, table);
    this.r = r;
    this._ids = ids;
    this.data = {};
    this._cursor = null;
  }

  follow() {
    // @ts-ignore
    this.r.table(this.table).getAll(...this._ids).changes().run().then((cursor: any) => {
      if (this._cursor) this._cursor.close();
      this._cursor = cursor;
      cursor.each((err: Error | null, thing: any) => {
        if (!thing.hasOwnProperty("new_val") && thing.hasOwnProperty("old_val")) {
          delete this.data[thing.old_val.id];
        } else if (thing.hasOwnProperty("new_val")) {
          this.data[thing.new_val.id] = thing.new_val;
        } else {
          console.log("thing from follow in standardDB", thing);
        }
      })
    }).catch((e: Error) => console.error(e));
  }

  /**
   * Reloads a specific servers records from the db.
   */
  reload() {
    return new Promise<void>((resolve, reject) => {
      try {
        this.ensureTable(this.table).then(() => {
          console.log(`Connected to db ${this.table} on shard ${process.env.id}`.blue);
          console.log(this._ids);
          // @ts-ignore
          return this.r.table(this.table).getAll(...this._ids).run().then((data: any[]) => {
            data.forEach((thing) => {
              this.data[thing.id] = thing;
            });
            resolve();
            this.follow();
            console.log(`Loaded Data from db ${this.table} on shard ${process.env.id}`.yellow);
          }).catch((e: Error) => console.error(e));
        });
      } catch (error) {
        console.error(error);
        reject("error loading");
      }
    })
  }

  /**
   * Saves config to the database
   * @param {Object} options of the server who's record is being saved.
   */
  write(options: { server?: string, conflict?: string } = {}) {
    let serverId = ((options.hasOwnProperty("server") && options.server) ? options.server : "*");
    if (this.data[serverId] !== null && typeof(this.data[serverId]) === "object") {
      this.data[serverId].id = serverId;
      return this.r.table(this.table).insert(this.data[serverId], {conflict: (options.conflict) ? options.conflict : "update"}).run().catch(console.error);
    }
    return this.r.table(this.table).get(serverId).delete().run().catch(console.error);
  }

  /**
   * adds an item to an array, takes the key to the array
   * @param {string} key
   * @param {*} value
   * @param {Object?} options
   * @returns {Promise}
   */
  add(key: string, value: any, options: { server?: string, conflict?: string } = {}) {
    if (!options.hasOwnProperty("server")) {
      options.server = "*";
    }
    if (!options.hasOwnProperty("conflict")) {
      options.server = "update";
    }

    return this.r.table(this.table).insert({
      "id": options.server,
      // @ts-ignore
      entries: this.r.table(this.table).get(options.server)(key).setInsert(value)
    }, {"conflict": options.conflict}).run();
  }

  /**
   * Stores the value in the current data and writes it out to file.
   * @param {string | null} key
   * @param {*} value
   * @param {Object?} options takes an options value, supports {server: id} to get per server values of config settings.
   *
   */
  set(key: string, value: any, options: { server?: string } = {}) {
    if (options.hasOwnProperty("server") && options.server) {
      if (key === null) {
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
    return this.write(options);
  };

  /**
   * counts the array at key
   * @param {string} key
   * @param {Object?} options
   */
  count(key: string, options: { server?: string } = {}) {
    if (!options.hasOwnProperty("server")) {
      options.server = "*";
    }
    // @ts-ignore
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
  getRandom(key: string, count: number, options: { server?: string } = {}) {
    if (!options.hasOwnProperty("server")) {
      options.server = "*";
    }
    // @ts-ignore
    return this.r.table(this.table).get(options.server)(key).sample(count).run();
  }

  /**
   * get config value by key. returns a promise in preparation for config's being pulled from an external database.
   * @param {string | null} key key to store if none is defined object is written directly to the db.
   * @param {*} def default value if value is not in config.
   * @param {Object} options takes an options value, supports {server: id} to get per server values of config settings.
   * @return {*} that will be resolved to the config key
   */
  get(key: string, def: any, options: { server?: string }) {
    if (options && options.hasOwnProperty("server")) {
      let serverData, globalData;
      if (options.server && this.data.hasOwnProperty(options.server)) {
        serverData = this.data[options.server];
      } else {
        globalData = this.data["*"];
      }
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
}

function addStar(array: string[]) {
  array.push("*");
  return array;
}

export default StandardDB;
