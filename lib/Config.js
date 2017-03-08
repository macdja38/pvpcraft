"use strict";

let fs = require("fs");
let path = require("path");

/**
 * File based config system
 */
class Config {
  /**
   * Standard File based config system
   * @constructor
   * @param {string} name of config
   */
  constructor(name) {
    this.name = name;
    this.filename = path.join(__dirname, `../config/${name}.json`);
    this.exampleFilename = path.join(__dirname, `../config/example/${name}.example.json`);
    console.log("opening:" + this.filename);
    this.reload();
  }

  reload() {
    let data;
    try {
      data = fs.readFileSync(this.filename);
    } catch (err) {
      if (err.code === "ENOENT") {
        fs.writeFileSync(this.filename, fs.readFileSync(this.exampleFilename, "utf8"));
        console.log(`The config ${this.name} was not found, I copied the example for you! Please edit config/${this.name}.json!`);
        throw new Error(`Missing ${this.name}.json`);
      }
    }

    try {
      data = JSON.parse(data);
    } catch (err) {
      throw new Error(`Invalid JSON in ${this.name}.json!`);
    }

    this.data = data;
  }

  /**
   * Writes out the config file to disk
   */
  save() {
    fs.writeFile(this.filename, JSON.stringify(this.data, null, 2), {}, (err) => {
      if (err) {
        console.error(err);
      }
    });
  }

  /**
   * Reads a value from the config
   * @param {string} key to read
   * @param {*} def Fallback
   * @param {Object} [options]
   * @param {string} [options.server="*"] server id to check permissions for
   * @returns {*}
   */
  get(key, def, options = {}) {
    if (options.hasOwnProperty("server")) {
      let serverData, globalData;
      if (this.data.hasOwnProperty(options.server)) {
        serverData = this.data[options.server];
      } else {
        globalData = this.data["*"];
      }
      if (serverData && serverData.hasOwnProperty(key)) {
        return serverData[key];
      }
      if (globalData && globalData.hasOwnProperty(key)) {
        return globalData[key];
      }
      return def;
    }
    if (this.data.hasOwnProperty(key)) {
      return this.data[key];
    }
    return def
  }

  /**
   * Set a value
   * @param {string} key to change
   * @param {*} def value to set key to
   * @param {Object} [options]
   * @param {string} [options.server="*"] id of discord to save config for null for global, not recommended for production
   * see ConfigDB for production ready per discord configs
   */
  set(key, def, options = {}) {
    if (options.hasOwnProperty("server")) {
      if (!this.data.hasOwnProperty(options.server)) {
        this.data[options.server] = {[key]: def};
      } else {
        this.data[options.server][key] = def;
      }
    } else {
      this.data[key] = def;
    }
    this.save();
  }
}

module.exports = Config;
