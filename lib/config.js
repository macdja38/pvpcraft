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
    console.log("green".green);
    console.log(JSON.stringify(this.data, null, 2).green);
    fs.writeFile(this.filename, JSON.stringify(this.data, null, 2),{}, (err)=>{
        console.error(err);
    });
};

Config.prototype.get = function get(key, def) {
    if (this.data[key] === undefined) {
        return def;
    }
    return this.data[key];
};

Config.prototype.set = function set(key, def) {
    console.log("data".green);
    console.log(this.data);
    this.data[key] = def;
    console.log("after data".green);
    console.log(this.data);
    this.save();
};

module.exports = Config;
