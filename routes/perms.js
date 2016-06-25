/**
 * Created by macdja38 on 2016-06-25.
 */
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    express.conn.then((conn)=>{
        var queries = [];
        var serverPerms;
        var defaultPerms;
        if(req.query.server) {
            queries.push(express.r.table('permissions').get(req.query.server).run(conn).then((thing)=> {
                serverPerms = thing;
            }));
        }
        queries.push(express.r.table('permissions').get("*").run(conn).then((thing)=> {
            defaultPerms = thing;
        }));
        Promise.all(queries).then(()=>{
            res.render('perms', {title: 'Permissions', serverPerms: serverPerms, defaultPerms: defaultPerms});
        }).catch(()=>{res.render('perms', {title: 'Permissions', err: "Data for this server could not be found."});})
        
    });
    
});

module.exports = router;
