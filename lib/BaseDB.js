/**
 * Created by macdja38 on 2016-11-26.
 */
"use strict";

class baseDB {
  constructor(r) {
    this.r = r;
  }

  ensureTable(tableName, tableOptions) {
    console.log(tableName);
    return this.r.tableList()
      .contains(tableName)
      .branch(true, this.r.tableCreate(tableName, tableOptions))
      .run();
  }
}

module.exports = baseDB;