"use strict";

var fs = require("fs");
var path = require("path");

var color = require('colors');

var Config = function (name) {
    this.name = name;
    this.filename = path.join(__dirname, `../config/${name}.json`);
    this.exampleFilename = path.join(__dirname, `../config/example/${name}.example.json`);
    console.log("opening:" + this.filename);
    this.reload();
};

Config.prototype.reload = function reload() {
    try {
        var data = fs.readFileSync(this.filename);
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
};

Config.prototype.save = function save() {
    //console.log("green".green);
    //console.log(JSON.stringify(this.data, null, 2).green);
    fs.writeFile(this.filename, JSON.stringify(this.data, null, 2), {}, (err)=> {
        if (err) {
            console.error(err);
        }
    });
};

Config.prototype.get = function get(key, def, options) {
    if (options && options.hasOwnProperty("server")) {
        if (this.data.hasOwnProperty(options.server)) {
            var serverData = this.data[options.server];
        } else {
            var globalData = this.data["*"];
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
};

Config.prototype.set = function set(key, def, options) {
    if (options && options.hasOwnProperty("server")) {
        console.log(options);
        if (!this.data.hasOwnProperty(options.server)) {
            this.data[options.server] = {[key]: def};
        } else {
            this.data[options.server][key] = def;
        }
    } else {
        this.data[key] = def;
    }
    this.save();
};

module.exports = Config;
