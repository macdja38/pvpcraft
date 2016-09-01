/**
 * Created by macdja38 on 2016-08-22.
 */

var EventEmitter = require('events');

module.exports = class dbEventState extends EventEmitter {
  constructor({ conn, client, r }) {
    super();
    this.r = r;
    this.enabled = false;
    conn
      .then(this.readyDB.bind(this))
      .then(this.followChanges.bind(this))
      .catch((error)=> {console.error(error)});
  }

  enable() {

  }

  disable() {

  }

  followChanges(conn) {
    this.r.table("alertsV2").changes().run(conn, (err, cursor)=>{
      if (err) {
        console.log(err);
        return;
      }

      cursor.each((err, alert) => {
        if (err) return;
        try {
          console.log(alert);
          console.log(alert.new_val);
          console.log(alert.old_val);
          this.emit("alert", alert);
        } catch (error) {
          console.error(error);
        }
      })
    })
  }

  readyDB(conn) {
    return new Promise((resolve, reject)=> {
      if (!global.cluster.worker || global.cluster.worker.id == 1) {
        createDBIfNotExists("alertsV2", conn).then(()=> {
          resolve(conn);
        });
      } else {
        resolve(conn);
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