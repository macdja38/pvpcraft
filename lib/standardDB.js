/**
 * Created by macdja38 on 2016-09-12.
 */

"use strict";

var colors = require('colors');

module.exports = class config {
  /**
   * create config instance.
   * @param table the configs are stored in
   * @param ids
   * @param con connection to the db
   */
  constructor(table, ids, conn) {
    this._ids = ids;
    this.table = table;
    this.con = conn;
    this.data = {};
    this._cursor = null;
  }

  follow() {
    global.r.table(this.table).getAll(...this._ids).changes().run(this.con).then((cursor)=>{
      if (this._cursor) this._cursor.close();
      this._cursor = cursor;
      cursor.each((err, thing) => {
        if (!thing.hasOwnProperty("new_val") && thing.hasOwnProperty("old_val")) {
          delete this.data[thing.old_val.id];
        } else if(thing.hasOwnProperty("new_val")) {
          this.data[thing.new_val.id] = thing.new_val;
        } else {
          console.log("thing from follow in standardDB", thing);
        }
      })
    }).catch(e => console.error(e));
  }

  /**
   * Reloads a specific servers records from the db.
   */
  reload() {
    return new Promise((resolve, reject)=> {
      try {
        global.r.tableList().contains(this.table)
          .do((databaseExists) => {
            return global.r.branch(
              databaseExists,
              { dbs_created: 0 },
              global.r.tableCreate(this.table)
            );
          }).run(this.con).then(()=> {
          /*global.r.table(this.table).insert([{id: "*", prefix: "//", "changeThresh": 1}]).run(this.con).then((res)=>{
           console.log(res);
           });*/
          console.log(`Connected to db ${this.table} on shard ${process.env.id}`.blue);
          console.log(this._ids);
          return global.r.table(this.table).getAll(...this._ids).run(this.con).then(cursor => {
            cursor.each((error, thing) => {
              if (error) return console.error(error);
              console.log(thing);
              this.data[thing.id] = thing;
            }, ()=> {
              resolve();
              this.follow()
            });
            console.log(`Loaded Data from db ${this.table} on shard ${process.env.id}`.yellow);
            console.log(this.data);
          }).catch(e => console.error(e));
        });
      } catch (error) {
        console.error(error);
        reject("error loading");
      }
    })
  }

  /**
   * Saves config to the database
   * @param options of the server who's record is being saved.
   */
  write(options) {
    let serverId = ((options && options.hasOwnProperty("server")) ? options.server : "*");
    if (this.data[serverId] !== null && typeof(this.data[serverId]) === "object") {
      this.data[serverId].id = serverId;
      return global.r.table(this.table).insert(this.data[serverId], { conflict: (options.conflict) ? options.conflict : "update" }).run(this.con).catch(console.error);
    }
    return global.r.table(this.table).get(serverId).delete().run(this.con).catch(console.error);
  }

  /**
   * adds an item to an array, takes the key to the array
   * @param key
   * @param value
   * @param options
   * @returns {Runner}
   */
  add(key, value, options = {}) {
    if (!options.hasOwnProperty("server")) {
      options.server = "*";
    }
    if (!options.hasOwnProperty("conflict")) {
      options.server = "update";
    }

    return global.r.table(this.table).insert({
      "id": options.server,
      entries: global.r.table(this.table).get(options.server)(key).setInsert(value)
    }, { "conflict": options.conflict }).run(this.con);
  }

  /**
   * Stores the value in the current data and writes it out to file.
   * @param key
   * @param value
   * @param options takes an options value, supports {server: id} to get per server values of config settings.
   *
   */
  set(key, value, options) {
    if (options && options.hasOwnProperty("server")) {
      if (key === null) {
        this.data[options.server] = value;
      }
      else if (!this.data.hasOwnProperty(options.server)) {
        this.data[options.server] = { [key]: value, id: options.server };
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
   * @param key
   * @param options
   */
  count(key, options = {}) {
    if (!options.hasOwnProperty("server")) {
      options.server = "*";
    }
    return global.r.table(this.table).get(options.server)(key).count().run(this.con);
  }

  /**
   * Get a random item from the array contained in key
   * @param key
   * @param count
   * @param options
   * @returns {Runner}
   */
  getRandom(key, count, options = {}) {
    if (!options.hasOwnProperty("server")) {
      options.server = "*";
    }
    return global.r.table(this.table).get(options.server)(key).sample(count).run(this.con);
  }

  /**
   * get config value by key. returns a promise in preparation for config's being pulled from an external database.
   * @param {String} key to check for
   * @param {*} def default value if value is not in config.
   * @param {Object} options takes an options value, supports {server: id} to get per server values of config settings.
   * @return {*} that will be resolved to the config key
   */
  get(key, def, options) {
    if (options && options.hasOwnProperty("server")) {
      if (this.data.hasOwnProperty(options.server)) {
        var serverData = this.data[options.server];
      } else {
        var globalData = this.data["*"];
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
};

function addStar(array) {
  array.push("*");
  return array;
}