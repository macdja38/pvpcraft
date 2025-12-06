/**
 * Created by macdja38 on 2016-06-30.
 */
/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

var nudity = require('nudity');

var fs = require('fs');

var Utils = require('../lib/utils');
var utils = new Utils();

var https = new require('https');

var request = require('request').defaults({encoding: null});

var Canvas = require('canvas');

module.exports = class template {
    constructor(e) {
        this.client = e.client;
    }

    /**
     * Get's called every time the bot connects, not just the first time.
     */
    onReady() {

    }

    /**
     * Get's called every time the bot disconnects.
     */
    onDisconnect() {

    }

    /**
     * get's called every Message, (unless a previous middleware on the list override it.) can modify message.
     * @param msg
     * @param perms
     * @returns msg that will be passed to modules and other middleware
     */
    changeMessage(msg, perms) {
        //return a modified version of the message.
        if(perms.check(msg, "scan.nudity")) {
            try {
                if (msg.attachments.length > 0) {
                    console.log(`Image contains attachment`);
                    request.get(msg.attachments[0].url, (err, res, image)=> {
                        console.log(image);
                        console.dir(image);
                        if (err) console.error(err);
                        console.log(`Scanning image`);
                        let data = Buffer.from(image);
                        console.log(data);
                        console.dir(data);
                        setTimeout(()=> {
                            nudity.scanData(data, (err, scan)=> {
                                console.error(err);
                                console.log(scan);
                                msg.reply(`Image Scan concluded results are ${scan}`);
                            })
                        }, 0);
                    });
                }
            } catch (error) {
                console.error(error);
            }
        }
        return msg;
    }
};

/*
 try {
 if (msg.attachments.length > 0) {
 console.log(`Image contains attachment`);
 var r = request(msg.attachments[0].url);
 r.on('end', ()=> {
 console.log(`Scanning image`);
 nudity.scanData(r.data(), (err, scan)=> {
 console.error(err);
 console.log(scan);
 msg.reply(`Image Scan concluded results are ${scan}`);
 })
 });
 }
 } catch (error) {
 console.error(error);
 }
 return msg;
 */

/*download
 console.log(`Image contains attachment`);
 var r = request(msg.attachments[0].url).pipe(fs.createWriteStream(process.env.id));
 r.on('close', ()=>{
 nudity.scanFile(process.env.id, (err, scan)=> {
 console.error(err);
 console.log(scan);
 msg.reply(`Image Scan concluded results are ${scan}`);
 })
 });
 */

function getImage(url, cb) {
    https.get(url)
        .on('response', function (res) {

            // http://stackoverflow.com/a/14269536/478603
            var chunks = [];
            res.on('data', function (data) {
                chunks.push(data)
            });
            res.on('end', function () {
                var img = new Canvas.Image();
                img.src = Buffer.concat(chunks);
                cb(null, img)
            })

        })
        .on('error', function (err) {
            cb(err)
        })
}