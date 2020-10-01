/**
 * Created by macdja38 on 2016-09-18.
 */
"use strict";

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const fetch = require("node-fetch");

/**
 * Source for constant (between updates) copies of warframe data, eg languages and other data
 * @class WarframeData
 */
class WarframeData {
  /**
   * Instantiates a config object.
   * @param {Object} options
   * @param {string} options.fileName
   */
  constructor({ fileName }) {
    this._fileName = fileName;
    this._filePath = path.join(__dirname, `../warframeData/${this._fileName}.json`);
    this._fileExampleUrl = `http://content.warframe.com/MobileExport/Manifest/${this._fileName}.json`;
    this.reload();
  }

  reload() {
    let rawFile, downloadPromise;
    try {
      rawFile = fs.readFileSync(this._filePath, "utf8")
    } catch (err) {
      if (err.code === "ENOENT") {
        console.error(`Config file ${this._fileName} not found in ${this._filePath} attempting to copy default from ${this._fileExampleUrl} Please download it if it does not exist.`);
        downloadPromise = this.downloadAndWrite();
        downloadPromise.then(() => {
          console.error(`Warframe resource file ${this._fileName} was copied to ${this._filePath}.`);
        }).catch((error) => {
          console.error(error);
          throw new Error(`Unable to fetch ${this._fileName} Please add it to the warframeData folder or disable the warframe module.`)
        })
      }
    }

    if (downloadPromise) return;
    try {
      this._data = JSON.parse(rawFile);
    } catch (err) {
      throw new Error(`Invalid JSON in ${this._fileName}.json`)
    }
  }

  downloadAndWrite() {
    return fetch(this._fileExampleUrl)
      .then(res => res.json())
      .then(json => {
        return json[this._fileName].reduce((acc, region) => {
          acc[region.uniqueName] = region;
          return acc;
        }, {})
      })
      .then(json => fsp.writeFile(this._filePath, JSON.stringify(json, null, "  ")));
  }

  /**
   * get a key from the config. will accept a fallBack value or throw if failThrow is defined.
   * @param {string} key
   * @param {Object | undefined} options
   * @param {* | undefined} options.fallBack
   * @param {boolean | undefined} options.failThrow
   * @returns {*}
   */
  get(key, options = {}) {
    let failThrow;
    if (options.hasOwnProperty("failThrow")) failThrow = `Error Property ${key} does not exist on ${this._fileName}`;
    let keys = key.split(".");
    return this._recursiveGet(keys, this._data, { fallback: options.fallBack, failThrow });
  }

  /**
   * Get's all the data
   * @returns {Object}
   */
  getData() {
    return this._data;
  }

  /**
   *
   * @param {string[]} keys
   * @param {object} data
   * @param fallback
   * @param failThrow
   * @returns {*}
   * @private
   */
  _recursiveGet(keys, data, { fallback, failThrow }) {
    if (keys.length === 0) {
      return data;
    }
    let key = keys.shift();
    if (typeof data === "object" && data.hasOwnProperty(key)) {
      return this._recursiveGet(keys, data[key], { fallback, failThrow });
    } else {
      if (fallback) return fallback;
      if (failThrow) throw failThrow;
    }
  }
}

module.exports = WarframeData;