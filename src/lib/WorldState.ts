/**
 * Created by macdja38 on 2016-06-23.
 */
"use strict";

import BaseDB from "./BaseDB";
import cluster from "cluster";

// preview here http://jsonviewer.stack.hu/#http://content.warframe.com/dynamic/worldState.php

let master;
if (cluster.worker && cluster.worker.id == 1) {
  master = true;
}

const WORLDSTATE_TABLE = "worldState";

/**
 * Class designed to hold the current warframe world's state as fetched from the world state api.
 * @class WorldState
 * @extends BaseDB
 */
class WorldState extends BaseDB {
  private _states: { ps4: string; pc: string; xb1: string };
  private interval?: NodeJS.Timeout;

  static get availableStates() {
    return {
      "pc": "http://content.warframe.com/dynamic/worldState.php",
      "xb1": "http://content.xb1.warframe.com/dynamic/worldState.php",
      "ps4": "http://content.ps4.warframe.com/dynamic/worldState.php",
    }
  }
  /**
   * WorldState object
   * @constructor
   * @param {R} r
   * @param {boolean | number} autoFetch automatically update the state
   * @param {Object} states
   */
  constructor(r: any, autoFetch: false | number = false, states = WorldState.availableStates) {
    super(r, WORLDSTATE_TABLE);
    this.ensureTable(WORLDSTATE_TABLE);
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
  get(platform: string) {
    return this.r.table("worldState").get(platform).run();
  }

  getEnabledStates() {
    return this._states;
  }

  /**
   * Fetches the latest worldState
   * @returns {Promise<Object>}
   */
  fetch() {
    return Promise.all(Object.entries(this._states).map(([key, value]) => this.r
      .table("worldState")
      .insert(
        // @ts-ignore
        this.r.http(value, { resultFormat: "json" })
          .merge({id: key}), {conflict: "update"}).run()));
  }
}

module.exports = WorldState;
