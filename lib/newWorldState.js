/**
 * Created by macdja38 on 2016-06-23.
 */
"use strict";

var request = require("request");
var colors = require("colors");

const fetchDelay = 5000;
const fetchInterval = 60000;

var master;
if (global.cluster.worker.id == 1) {
    master = true;
}

class worldState {
    prototype(url, platform) {
        this.state = null;
        this.lastFech = 0;
        this.url = url;
        this.platform = platform;
        this.interval = setTimeout(fetch, 300000)
    }

    get() {
        return new Promise((resolve, reject)=> {
            if (Date.now() - this.lastFech < fetchInterval) {
                if (this.state && master) {
                    resolve(this.state);
                } else {
                     this.fetch().then(resolve);
                }

            } else {
                resolve(this.state);
            }
        });
    }

    fetch() {
        return new Promise((resolve, reject)=> {
            if (master) {
                request({
                    url: this.url,
                    json: true
                }, (error, response, body) => {
                    if (!error && response.statusCode === 200) {
                        this.lastFech = Date.now();
                        this.state = body;
                        resolve(body);
                        global.conn.then((conn)=> {
                            createDBIfNotExists("worldState", conn).then(()=> {
                                body.id = this.platform;
                                global.r.table("worldState").insert(this.platform, {conflict: "update"}).run(conn).then(console.log)
                            })
                        })
                    } else {
                        reject(error)
                    }
                    console.log("Made worldState Request.".green);

                });
            } else {
                global.conn.then((conn)=> {
                    global.r.table("worldState").get(this.platform).run(conn).then((body)=> {
                        this.lastFech = Date.now();
                        this.state = body;
                    }
                    ).catch(reject)
                })
            }
        })
    }
}

module.exports = worldState;

function createDBIfNotExists(name, con) {
    return global.r.tableList().contains(name)
        .do((databaseExists) => {
            return global.r.branch(
                databaseExists,
                {dbs_created: 0},
                global.r.tableCreate(name)
            );
        }).run(con)
}