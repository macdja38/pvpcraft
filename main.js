/**
 * Created by macdja38 on 2016-04-17.
 */
/* var module = require('module');
 module.wrapper[0] += '"use strict";';
 Object.freeze(module.wrap);
 */
"use strict";
const cluster = require('cluster');

let Configs = require("./lib/config.js");
let fileConfig = new Configs("config");
let fileAuth = new Configs("auth");

if (cluster.isMaster && fileConfig.get("shards", 2) > 1) {
  let ShardManager = require("./ShardManager");
  new ShardManager(fileConfig, fileAuth);
} else {
  let PvPCraft = require("./PvPCraft");
  new PvPCraft(fileConfig, fileAuth);
}
