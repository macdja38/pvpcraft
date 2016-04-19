/**
 * Created by macdja38 on 2016-04-17.
 */

var Discord = require("discord.js");
var client = new Discord.Client();

var Configs = require("./lib/config.js");
console.log(Configs);
var config = new Configs("config");

var now = require("performance-now");
var Parse = require("./lib/parser.js");

var Permissions = require("./lib/permissions.js");
console.log(Permissions);
var perms = new Permissions(config);

var prefix;

var moduleList;

var mention;
var id;

client.on('message', (msg)=> {
    if(msg.author.id === id) return;
    var t1 = now();
    var l = config.get(msg.channel.server.id, prefix);
    var command = Parse.command(l, msg, {"allowMention": mention});
    if(command) {
        console.log("value is".blue);
        for(var mod in moduleList) {
            console.log(command.command);
            console.log(moduleList[mod].commands);
            console.log(moduleList[mod].commands.indexOf(command.command));
            if(moduleList[mod].commands.indexOf(command.commandnos)>-1) {
                if(moduleList[mod].callback(msg, command, perms) === true) {
                    break;
                }
            }
        }
    }
    var t2 = now();
    console.log(t2 - t1);
});

function reload() {
    prefix = config.get("default", {"prefix": ["!!", "//"]}).prefix;
    console.log(prefix);
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
    console.log(mention);
    reload();
});

client.loginWithToken(require('../auth.json').token);

process.on('SIGINT', ()=> {
    console.log("Logging out.");
    client.logout(()=> {
        console.log("Bye");
        process.exit(0);
    });
});