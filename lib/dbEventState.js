/**
 * Created by macdja38 on 2016-08-22.
 */

var EventEmitter = require('events');

module.exports = class dbEventState extends EventEmitter {
  constructor({ client, r }) {
    super();
    this.r = r;
    this.enabled = false;
    this.readyDB()
      .then(this.followChanges.bind(this)).catch(console.error);
  }

  enable() {

  }

  disable() {

  }

  followChanges() {
    this.r.table("alertsV2").changes().run((err, cursor)=>{
      if (err) {
        console.log(err);
        return;
      }

      cursor.each((err, alert) => {
        if (err) return;
        try {
          this.emit("alert", alert);
        } catch (error) {
          console.error(error);
        }
      })
    })
  }

  readyDB() {
    return new Promise((resolve, reject)=> {
      if (!global.cluster.worker || global.cluster.worker.id == 1) {
        createDBIfNotExists("alertsV2").then(()=> {
          resolve();
        });
      } else {
        resolve();
      }
    })
  }
};

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