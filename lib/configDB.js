/**
 * Created by macdja38 on 2016-06-21.
 */
"use strict";

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
    }

    /**
     * Reloads a specific servers records from the db.
     */
    reload() {
        try {
            global.r.tableList().contains(this.table)
                .do((databaseExists) => {
                    return global.r.branch(
                        databaseExists,
                        {dbs_created: 0},
                        global.r.tableCreate(this.table)
                    );
                }).run(this.con).then(()=> {
                /*global.r.table(this.table).insert([{id: "*", prefix: "//", "changeThresh": 1}]).run(this.con).then((res)=>{
                 console.log(res);
                 });*/
                console.log("Did, DB Thing");
                var completed = [];
                for (let server in this.client.servers) {
                    if (this.client.servers.hasOwnProperty(server) && this.client.servers[server] && this.client.servers[server].id) {
                        completed.push(global.r.table(this.table).get(this.client.servers[server].id).run(this.con).then((thing)=> {
                            if (thing) {
                                this.data[this.client.servers[server].id] = thing;
                            }
                        }))
                    }
                    completed.push(global.r.table(this.table).get("*").run(this.con).then((thing)=> {
                        if (thing) {
                            this.data["*"] = thing;
                        }
                    }));
                }
                return Promise.all(completed).then(()=> {
                    console.log(this.data);
                }).catch(console.error);
            });
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Saves config to the database
     * @param serverId of the server who's record is being saved.
     */
    write(serverId) {
        if (serverId) {
            if (!this.data[serverId].id) {
                this.data[serverId].id = serverId
            }
        } else {
            if (!this.data["*"].id) {
                this.data["*"].id = "*";
            }
        }
        return global.r.table(this.table).insert((serverId) ? this.data[serverId] : this.data["*"], {conflict: "update"}).run(this.con).then(console.log)
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
                this.data[options.server] = {[key]: value, id: options.server};
            } else {
                this.data[options.server][key] = value;
            }
        } else {
            this.data[key] = value;
        }
        return this.write((options && options.server) ? options.server : null);
    };

    /**
     * get config value by key. returns a promise in preparation for config's being pulled from an external database.
     * @param {String} key to check for
     * @param {*} def default value if value is not in config.
     * @param {Object} options takes an options value, supports {server: id} to get per server values of config settings.
     * @return {*} that will be resolved to the config key
     */
    get(key, def, options) {
        if (options && options.hasOwnProperty("server")) {
            if (key == null) {
                return serverData[options.server];
            }
            if (this.data.hasOwnProperty(options.server)) {
                var serverData = this.data[options.server];
            } else {
                var globalData = this.data["*"];
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
