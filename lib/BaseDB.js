/**
 * Created by macdja38 on 2016-11-26.
 */
"use strict";

class baseDB {
  /**
   * Base database constructor, includes saving r to this.r
   * @param {R} r rethinkdb object.
   */
  constructor(r) {
    this.r = r;
  }

  /**
   * Ensures a table exists in the database
   * @param {String} tableName name of the table
   * @param {Object} [tableOptions={}] options object to be passed to r.tableCreate
   * @returns {Promise} true if table exists, table if not.
   */
  ensureTable(tableName, tableOptions={}) {
    console.log(tableName);
    return this.r.tableList()
      .contains(tableName)
      .branch(true, this.r.tableCreate(tableName, tableOptions))
      .run();
  }
}

module.exports = baseDB;