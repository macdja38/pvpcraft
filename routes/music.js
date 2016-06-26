/**
 * Created by macdja38 on 2016-05-26.
 */
var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res, next) {
    //res.render('music', { title: 'Express' });
    /*
     var music = express.moduleList.find((a)=>{return a.module.constructor.name === "music"});
     if(music.module.boundChannels.hasOwnProperty(req.query.server)) {
     res.render('music', {
     title: music.module.boundChannels[req.query.server].queue.length + " Songs queued",
     servers: Object.keys(music.module.boundChannels).length,
     queue: music.module.boundChannels[req.query.server].queue,
     server: music.module.boundChannels[req.query.server].server,
     textChannel: music.module.boundChannels[req.query.server].text,
     voiceChannel: music.module.boundChannels[req.query.server].voice
     });
     } else {
     //console.log(music.module.boundChannels[req.params]);
     res.render('music', {title: "0 Songs queued", servers: Object.keys(music.module.boundChannels).length})
     }
     */

    express.conn.then((conn)=> {
        var queries = [];
        var serverTrack;
        if (req.query.server) {
            queries.push(express.r.table('queue').get(req.query.server).run(conn).then((thing)=> {
                serverTrack = thing;
            }));
            Promise.all(queries).then(()=> {
                res.render('music-v2', {
                    title: `${serverTrack.queue.length} songs queued`,
                    queue: serverTrack.queue,
                    server: serverTrack.server,
                    text: serverTrack.text,
                    voice: serverTrack.voice
                });
            }).catch(()=> {
                res.render('music-v2', {title: '0 songs queued', err: "No songs queued."});
            })
        } else {
            res.render('music-v2', {title: '0 songs queued', err: "No songs queued."});
        }
    });
});

module.exports = router;