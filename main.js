/**
 * Created by macdja38 on 2016-04-17.
 */

var Discord = require("discord.js");
var client = new Discord.Client();

var Configs = require("./lib/config.js");
console.log(Configs);
var config = new Configs("config");

var now = require("performance-now");
var Parse = require("./lib/newParser.js");

var Permissions = require("./lib/permissions.js");
console.log(Permissions);
var perms = new Permissions(config);

var request = require('request');

var key = require('../auth.json').key;

var defaults = {
    "prefix": []
};


var moduleList;

var mention;
var name;
var id;

client.on('message', (msg)=> {
    if(msg.author.id === id) return;
    var t1 = now();
    var l;
    if(msg.channel.server) {
        l = config.get(msg.channel.server.id, defaults).prefix;
    } else {
        l = defaults.prefix
    }
    var command = Parse.command(l, msg, {"allowMention": mention, "botName": name});
    if(command) {
        //console.log("value is".blue);
        for(var mod in moduleList) {
            //console.log(command.command);
            //console.log(moduleList[mod].commands);
            //console.log(moduleList[mod].commands.indexOf(command.command));
            if(moduleList[mod].commands.indexOf(command.commandnos)>-1) {
                try {
                    if (moduleList[mod].callback(msg, command, perms, l) === true) {
                        break;
                    }
                } catch(error) {
                    console.log(error);
                    console.log(error.stack);
                }
            }
        }
    }
    var t2 = now();
    console.log(t2 - t1);
});

function reload() {
    defaults = config.get("default", {"prefix": ["!!", "//"]});
    console.log("defaults");
    console.log(defaults);
    name = client.user.name;
    moduleList = [];
    var modules = config.get("modules");
    console.log(modules);
    for(var module in modules) {
        var Module = require(modules[module]);
        var mod = new Module(client);
        moduleList.push({"commands": mod.getCommands(), "callback": mod.onMessage})
    }
    console.log(moduleList);
}

client.on('ready', ()=>{
    id = client.user.id;
    mention = "<@" + id + ">";
    name = client.user.name;
    console.log(mention);
    reload();
    setTimeout(updateCarbon(), 3600000)
});

client.loginWithToken(require('../auth.json').token);

process.on('SIGINT', ()=> {
    setTimeout(() => {process.exit(1)}, 5000);
    console.log("Logging out.");
    client.logout(()=> {
        console.log("Bye");
        process.exit(0);
    });
});

function updateCarbon() {
    request.post(
        'https://www.carbonitex.net/discord/data/botdata.php',
        {form:{ key: key, servercount: client.servers.length}},
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body)
            }
        }
    );
}