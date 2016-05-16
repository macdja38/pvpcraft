/**
 * Created by macdja38 on 2016-05-14.
 */
"use strict";
var auth = require("../config/auth.json").reThinkDB;

var r = require('rethinkdb');

module.exports = class database{
    constructor() {
        var self = this;
        r.connect({ host: auth.host, port: auth.port}, function(err, conn) {
            self.conn = conn;
            if(err) throw err;
            if(r.db('test').tableList().contains('messages')) {
                self.ready = true;
            }
            else {
                r.db('test').tableCreate('messages').run(conn, function (err, res) {
                    if (err) throw err;
                    console.log(res);
                    self.ready = true;
                });
            }
        });
    }
    
    logMessage(msg) {
        if(this.conn && this.ready) {
            if(msg.channel.server) {
                r.table('messages').insert({
                    id: msg.id,
                    content: msg.content,
                    author: msg.author.id,
                    created: Date.now(),
                    channel: msg.channel.id,
                    server: msg.channel.server.id
                }).run(this.conn, function (err, res) {
                    if (err) throw err;
                    //console.log(res);
                });
            } else {
                r.table('messages').insert({
                    id: msg.id,
                    content: msg.content,
                    author: msg.author.id,
                    created: Date.now(),
                    channel: msg.channel.id,
                    private: true
                }).run(this.conn, function (err, res) {
                    if (err) throw err;
                    //console.log(res);
                });
            }
        }
    }
};



