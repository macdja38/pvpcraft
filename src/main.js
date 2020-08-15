/**
 * Created by macdja38 on 2016-04-17.
 */
/* var module = require('module');
 module.wrapper[0] += '"use strict";';
 Object.freeze(module.wrap);
 */
"use strict";
const cluster = require('cluster');
const inspector = require("inspector");

import Configs from "./lib/Config";
const fileConfig = new Configs("config");
const fileAuth = new Configs("auth");

const bindIP = fileConfig.get("inspector-bind-ip", false);

const isMaster = cluster.isMaster && fileConfig.get("shards", 2) > 1;

if (bindIP) {
  let port;
  if (isMaster) {
    port = 9199;
  } else {
    port = 9200 + parseInt(process.env.id || "0", 10);
  }
  console.log(port);
  inspector.close();
  inspector.open(port, bindIP, false);
}

if (isMaster) {
  let ShardManager = require("./ShardManager");
  // make debugging easier
  global.shardManager = new ShardManager(fileConfig, fileAuth);
} else {
  let PvPCraft = require("./PvPCraft");
  new PvPCraft(fileConfig, fileAuth);
}
