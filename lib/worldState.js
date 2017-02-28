/**
 * Created by macdja38 on 2016-03-12.
 */
"use strict";

let request = require("request");
let colors = require('colors');

//preview here http://jsonviewer.stack.hu/#http://content.warframe.com/dynamic/worldState.php
let url = "http://content.warframe.com/dynamic/worldState.php";

class WorldState {
  /**
   * Class for fetching the worldstate and reading it directly using promises, includes a cache
   * @constructor
   */
  constructor() {
    WorldState.state = false;
    WorldState.lastFech = 0;
    this.get(function (state) {
      WorldState.state = state;
    });
  }

  /**
   * Get's the current worldstate
   * @returns {Promise}
   */
  get() {
    return new Promise((resolve, reject) => {
      if (this.age() > 20000) {
        request({
          url: url,
          json: true
        }, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            WorldState.lastFech = Date.now();
            WorldState.status = body;
            resolve(body);
          } else {
            reject(error);
          }
          console.log("Made worldState Request.".green);
        });
      }
      else {
        resolve(WorldState.status);
      }
    })
  }

  /**
   * Checks the age of the current cache
   * @returns {number}
   */
  age() {
    console.log(("Cache age: " + (Date.now() - WorldState.lastFech)).green);
    return Date.now() - WorldState.lastFech;
  }
}

module.exports = WorldState;