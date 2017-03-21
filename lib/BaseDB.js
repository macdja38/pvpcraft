/**
 * Created by macdja38 on 2016-11-26.
 */
"use strict";

class baseDB {
  constructor(r) {
    this.r = r;
  }

  ensureTable(tableName, tableOptions) {
    let table = this.r.table(tableName);
    return this.r.tableList()
      .contains(tableName)
      .branch(table, this.r.tableCreate(tableName, tableOptions))
      .run();
  }
}

module.exports = baseDB;