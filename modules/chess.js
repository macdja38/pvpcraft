/**
 * Created by macdja38 on 2016-10-01.
 */

var StandardDB = require('../lib/StandardDB');

let table = "chess";

module.exports = class chess {
  constructor(e) {
    this.client = e.client;
    this.raven = e.raven;
    this.r = e.r;
    global.r.tableList().contains(table)
      .do((databaseExists) => {
        return global.r.branch(
          databaseExists,
          { dbs_created: 0 },
          global.r
            .tableCreate(table, {})
            .do(()=>this.r.table(table).indexCreate("channel1"))
            .do(()=>this.r.table(table).indexCreate("channel2"))
        );
      }).run()
  }

  getCommands() {
    //this needs to return a list of commands that should activate the onCommand function
    //of this class. array of strings with trailing s's removed.
    return ["move", "startchess"];
  }

  onCommand(msg, command, perms) {
    if (command.command === "startchess") {
      r.table(table).insert({})
    }


    if (command.command === "move") {
      r.table("chess")
    }
  }
};
