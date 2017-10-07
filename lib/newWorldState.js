/**
 * Created by macdja38 on 2016-06-23.
 */
"use strict";

let request = require("request");
let colors = require("colors");
const BaseDB = require("./BaseDB");
let cluster = require("cluster");

// preview here http://jsonviewer.stack.hu/#http://content.warframe.com/dynamic/worldState.php

const defaultStates = {
  "pc": "http://content.warframe.com/dynamic/worldState.php",
//  "xb1": "http://content.xb1.warframe.com/dynamic/worldState.php",
//  "ps4": "http://content.ps4.warframe.com/dynamic/worldState.php",
};

let master;
if (cluster.worker && cluster.worker.id == 1) {
  master = true;
}

/**
 * @class WorldState
 * @extends BaseDB
 * @property {R} r
 */
class WorldState extends BaseDB {
  /**
   * WorldState object
   * @constructor
   * @param {R} r
   * @param {boolean | number} autoFetch automatically update the state
   * @param {Object} states
   */
  constructor(r, autoFetch = false, states = defaultStates) {
    super(r);
    this.ensureTable("worldState");
    this._states = states;
    if (autoFetch) {
      this.fetch = this.fetch.bind(this);
      this.interval = setInterval(this.fetch, autoFetch);
    }
  }

  /**
   * Get's the current warframe worldState
   * @param {String} platform
   * @returns {Promise<Object>}
   */
  get(platform) {
    return this.r.table("worldState").get(platform).run();
  }

  /**
   * Fetches the latest worldState
   * @returns {Promise<Object>}
   */
  fetch() {
    return Promise.all(Object.entries(this._states).map(([key, value]) => this.r
      .table("worldState")
      .insert(
        this.r.http(value, {resultFormat: "json"})
          .merge({id: key}), {conflict: "update"}).run()));
  }
}

module.exports = WorldState;