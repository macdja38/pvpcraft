/**
 * Created by macdja38 on 2016-05-26.
 */
var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
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
    res.render('music-disabled')
});

module.exports = router;