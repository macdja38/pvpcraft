/**
 * Created by macdja38 on 2016-06-21.
 */
"use strict";

let colors = require('colors');

module.exports = class configDB {
  /**
   * create config instance.
   * @param table the configs are stored in
   * @param client
   */
  constructor(r, table, client) {
    this.r = r;
    this.table = table;
    this.client = client;
    this.data = {};
    this._cursor = null;
  }

  serverCreated(server) {
    return this.r.table(this.table).get(server.id).run().then((thing)=> {
      if (thing) {
        this.data[server.id] = thing;
      }
      this.follow();
    });
  }

  follow() {
    this.r.table(this.table).getAll(...addStar(this.client.guilds.map(s => s.id))).changes().run().then((cursor)=>{
      if(this._cursor) this._cursor.close();
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
   */
  reload() {
    return new Promise((resolve, reject)=> {
      try {
        this.r.tableList().contains(this.table)
          .do((databaseExists) => {
            return this.r.branch(
              databaseExists,
              { dbs_created: 0 },
              this.r.tableCreate(this.table)
            );
          }).run().then(()=> {
          /*this.r.table(this.table).insert([{id: "*", prefix: "//", "changeThresh": 1}]).run().then((res)=>{
           console.log(res);
           });*/
          console.log(`Connected to db ${this.table} on shard ${process.env.id}`.blue);
          let completed = [];
          return this.r.table(this.table).getAll(...addStar(this.client.guilds.map(s => s.id))).run().then(data => {
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
   * Saves config to the database
   * @param options of the server who's record is being saved.
   */
  write(options) {
    let serverId = ((options && options.hasOwnProperty("server")) ? options.server : "*");
    if (this.data[serverId] !== null && typeof(this.data[serverId]) === "object") {
      this.data[serverId].id = serverId;
      return this.r.table(this.table).insert(this.data[serverId], { conflict: (options.conflict) ? options.conflict : "update" }).run().catch(console.error);
    }
    return this.r.table(this.table).get(serverId).delete().run().catch(console.error);
  }

  /**
   * adds an item to an array, takes the key to the array
   * @param key
   * @param value
   * @param options
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
    }, { "conflict": options.conflict }).run();
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
      if (key == null) {
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
    if (options && options.write === false) {
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
   * counts the array at key
   * @param key
   * @param options
   */
  count(key, options = {}) {
    if (!options.hasOwnProperty("server")) {
      options.server = "*";
    }
    return this.r.table(this.table).get(options.server)(key).count().run();
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
    return this.r.table(this.table).get(options.server)(key).sample(count).run();
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
      let serverData, globalData;
      if (this.data.hasOwnProperty(options.server)) {
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
};

function addStar(array) {
  array.push("*");
  return array;
}