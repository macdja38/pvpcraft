/**
 * Created by macdja38 on 2016-06-21.
 */
"use strict";

var colors = require('colors');

module.exports = class config {
  /**
   * create config instance.
   * @param table the configs are stored in
   * @param client
   * @param con connection to the db
   */
  constructor(table, client, con) {
    this.table = table;
    this.client = client;
    this.con = con;
    this.data = {};
    this._cursor = null;
  }

  serverCreated(server) {
    return global.r.table(this.table).get(server.id).run(this.con).then((thing)=> {
      if (thing) {
        this.data[server.id] = thing;
      }
      this.follow();
    });
  }

  follow() {
    global.r.table(this.table).getAll(...addStar(this.client.servers.map(s => s.id))).changes().run(this.con).then((cursor)=>{
      if(this._cursor) this._cursor.close();
      this._cursor = cursor;
      cursor.each((err, thing) => {
        this.data[thing.new_val.id] = thing.new_val;
        console.log(thing);
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
          var completed = [];
          return global.r.table(this.table).getAll(...addStar(this.client.servers.map(s => s.id))).run(this.con).then(cursor => {
            cursor.each((error, thing) => {
              if (error) return console.error(error);
              console.log(thing);
              this.data[thing.id] = thing;
            }, ()=> {
              resolve();
              this.follow()
            });
            console.log(`Loaded Data from db ${this.table} on shard ${process.env.id}`.yellow + 0);
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
    let serverId = ((options && options.server) ? options.server : "*");
    if (serverId) {
      if (!this.data[serverId].id) {
        this.data[serverId].id = serverId
      }
    } else {
      if (!this.data["*"].id) {
        this.data["*"].id = "*";
      }
    }
    return global.r.table(this.table).insert((serverId) ? this.data[serverId] : this.data["*"], { conflict: (options.conflict) ? options.conflict : "update" }).run(this.con).then(console.log)
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