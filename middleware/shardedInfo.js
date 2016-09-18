/**
 * Created by macdja38 on 2016-09-01.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

var StandardDB = require('../lib/standardDB');

module.exports = class shardedInfo {
  constructor(e) {
    this._client = e.client;
    this._timer = false;
    this._ready = false;
    this._standardDB = false;
    e.conn.then((conn)=> {
      this._standardDB = new StandardDB("shards", this._getArray(parseInt(process.env.shards || 1)), conn);
      this._ready = this._standardDB.reload();
      console.log(this._ready);
    }).catch(error => console.error(error));
  }

  /**
   * Get's called every time the bot connects, not just the first time.
   */
  onReady() {
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(this._updateDB.bind(this), 10000);
  }

  _getArray(n) {
    return [...new Array(n).keys()].map(val => val.toString());
  }

  _updateDB() {
    if (!this._ready || !this._ready.then) return;
    this._ready.then(()=> {
      this._standardDB.set(null,
        {
          servers: this._client.servers.length,
          connections: this._client.voiceConnections.length,
          playing: this._client.voiceConnections.filter(c => c.playing).length,
          users: this._client.users.length,
          shards: parseInt(process.env.shards) || 1,
          lastUpdate: Date.now(),
        }, {server: process.env.id ? process.env.id : "0"})
    }).catch(error => console.error(error))
  }

  /**
   * Get's called every time the bot disconnects.
   */
  onDisconnect() {
    if (this._timer) clearInterval(this._timer);
  }

  /**
   * Get's called every message.
   * @param msg
   * @param perms
   */
  onMessage(msg, perms) {
  }

  /**
   * Get's called every command.
   * @param msg
   * @param command
   * @param perms
   * @param l
   */
  onCommand(msg, command, perms, l) {
  }

  /**
   * get's called every Message, (unless a previous middleware on the list override it.) can modify message.
   * @param msg
   * @param perms
   * @returns msg that will be passed to modules and other middleware
   */
  changeMessage(msg, perms) {
    return msg;
  }

  /**
   * get's called every Command, (unless a previous middleware on the list override it.) can modify message.
   * @param msg
   * @param command
   * @param perms
   * @param l
   * @returns command || Boolean object (may be modified.)
   */
  changeCommand(msg, command, perms, l) {
    try {
      if (command.command === "getshardedinfo") {
        if (!this._standardDB.data) msg.reply("Sorry db connection not ready yet");
        console.log(typeof(this._standardDB.data));
        console.log(this._standardDB.data);
        let serverData = [];
        for (let key in this._standardDB.data) {
          if (this._standardDB.data.hasOwnProperty(key) && parseInt(key) < parseInt(process.env.shards) || 1) {
            serverData[parseInt(key)] = this._standardDB.data[key]
          }
        }
        let shardsOnline = serverData.filter(s => Date.now() - s.lastUpdate < 30000).length;
        console.log(serverData);
        let serverCount = serverData.map(s => s.servers).reduce((total, num) => total + num, 0);
        let connections = serverData.map(s => s.connections).reduce((total, num) => total + num, 0);
        let playing = serverData.map(s => s.playing).reduce((total, num) => total + num, 0);
        let users = serverData.map(s => s.users).reduce((total, num) => total + num, 0);
        msg.reply(`\`\`\`xl\nshards online: ${shardsOnline}/${process.env.shards || 1}\nservers: ${serverCount}\nconnections: ${connections}\nplaying: ${playing}\nusers: ${users}\n\`\`\``);
        return false;
      }
      return command;
    } catch(error) {
      console.error(error);
      return command;
    }
  }
};