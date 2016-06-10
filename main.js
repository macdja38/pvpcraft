/**
 * Created by macdja38 on 2016-04-17.
 */
"use strict";
var git = require('git-rev');

var Discord = require("discord.js");
var client = new Discord.Client({forceFetchUsers: true, autoReconnect: true});

var Configs = require("./lib/config.js");
var config = new Configs("config");
var auth = new Configs("auth");

var raven;

if (auth.get("sentryURL", "") != "") {
    console.log("Sentry Started".yellow);
    git.long((commit)=> {
        git.branch((branch)=> {
            raven = new (require('raven')).Client(auth.data.sentryURL, {release: commit + "-" + branch});
            raven.patchGlobal(function (result) {
            });
            raven.on('logged', function (e) {
                console.log("Error reported to sentry!: ".green + e.id);
            });

            raven.on('error', function (e) {
                // The event contains information about the failure:
                //   e.reason -- raw response body
                //   e.statusCode -- response status code
                //   e.response -- raw http response object

                console.error('Could not report event to sentry');
                console.error(e.reason);
                console.error(e.statusCode);
                console.error(e.response);
            })
        })
    });
}

var key = auth.get("key", null);
if (key == "key") {
    key = null;
}

var now = require("performance-now");
var Parse = require("./lib/newParser.js");

var colors = require('colors');

var Permissions = require("./lib/permissions.js");
var perms = new Permissions(config);

var request = require('request');

var defaults = {
    "prefix": []
};

var hasBeenReady = false;

var moduleList = [];
var middlewareList = [];

var mention;
var name;
var id;

var Website = require("./www");
var website = new Website(config.get("website", {port: 8000}).port);

client.on('message', (msg)=> {
    if (msg.author.id === id) return;
    var t1 = now();
    var l;
    var mod;
    var ware;

    // handle per server prefixes.
    if (msg.channel.server) {
        l = config.get(msg.channel.server.id, defaults).prefix;
        if (l == null) {
            l = defaults.prefix;
        }
    } else {
        l = defaults.prefix;
    }

    //Message middleware starts here.
    for (ware in middlewareList) {
        if (middlewareList[ware].ware.onMessage) {
            middlewareList[ware].ware.onMessage(msg, perms)
        }
    }

    var command = Parse.command(l, msg, {"allowMention": id, "botName": name});
    //Reload command starts here.
    if (command.command === "reload" && msg.author.id === "85257659694993408") {
        reloadTarget(msg, command, perms, l, moduleList, middlewareList)
    }

    //Command middleware starts here.
    if (command) {
        for (ware in middlewareList) {
            if (middlewareList[ware].ware.onCommand) {
                middlewareList[ware].ware.onCommand(msg, command, perms, l)
            }
        }
    }
    for (ware in middlewareList) {
        if (middlewareList[ware].ware.changeMessage) {
            msg = middlewareList[ware].ware.changeMessage(msg, perms)
        }
    }
    if (command) {
        for (ware in middlewareList) {
            if (middlewareList[ware].ware.changeCommand) {
                command = middlewareList[ware].ware.changeCommand(msg, command, perms, l)
            }
        }
    }
    if (command) {
        console.log("Command Used".blue);
        console.log(command);
        for (mod in moduleList) {
            //console.log(moduleList[mod].commands.indexOf(command.command));
            if (moduleList[mod].commands.indexOf(command.commandnos) > -1) {
                try {
                    if (moduleList[mod].module.onCommand(msg, command, perms, l) === true) {
                        return;
                    }
                } catch (error) {
                    msg.reply("Sorry their was an error processing your command. The error is ```" + error + "```");
                    if (raven) {
                        raven.captureError(error, {
                            user: msg.author,
                            extra: {
                                mod: mod,
                                server: msg.channel.server.id,
                                server_name: msg.channel.server.name,
                                channel: msg.channel.id,
                                channel_name: msg.channel.name,
                                command: command,
                                msg: msg.content
                            }
                        }, (something)=> {
                            console.log(something);
                        });
                    }
                    console.error(error);
                }
            }
        }
    }
    //apply misc responses.
    for (mod in moduleList) {
        //console.log(command.command);
        //console.log(moduleList[mod].commands);
        //console.log(moduleList[mod].commands.indexOf(command.command));
        if (moduleList[mod].module.checkMisc) {
            try {
                if (moduleList[mod].module.checkMisc(msg, perms, l) === true) {
                    break;
                }
            } catch (error) {
                if (raven) {
                    raven.captureError(error, {
                        user: msg.author,
                        extra: {
                            mod: mod,
                            server: msg.channel.server.id,
                            server_name: msg.channel.server.name,
                            channel: msg.channel.id,
                            channel_name: msg.channel.name,
                            command: command,
                            msg: msg.content
                        }
                    });
                }
                console.error(error);
                console.error(error.stack);
            }
        }
    }
    var t2 = now();
    if (msg.channel.server) {
        console.log("s: ".magenta + msg.channel.server.name + " c: ".blue + msg.channel.name + " u: ".cyan +
            msg.author.username + " m: ".green + msg.content.replace(/\n/g, "\n    ") + " in ".yellow + (t2 - t1) + "ms".red);
    } else {
        console.log("u: ".cyan + msg.author.username + " m: ".green + msg.content.replace(/\n/g, "\n    ").rainbow +
            " in ".yellow + (t2 - t1) + "ms".red);
    }
});

function reload() {
    defaults = config.get("default", {"prefix": ["!!", "//"]});
    console.log("defaults");
    console.log(defaults);
    name = client.user.name;
    var middleware;
    var module;
    for (middleware of middlewareList) {
        if (middleware.module) {
            if (middleware.module.onDisconnect) {
                console.log("Trying to Remove Listeners!".green);
                middleware.module.onDisconnect();
            }
        }
    }
    for (module of moduleList) {
        if (module.module) {
            if (module.module.onDisconnect) {
                console.log("Trying to Remove Listeners!".green);
                module.module.onDisconnect();
            }
        }
    }
    middlewareList = [];
    moduleList = [];
    var middlewares = config.get("middleware");
    var modules = config.get("modules");
    for (module in modules) {
        var Modul = require(modules[module]);
        var mod = new Modul(client, config, raven, auth);
        if (mod.onReady) mod.onReady();
        moduleList.push({"commands": mod.getCommands(), "module": mod});
    }
    for (middleware in middlewares) {
        var ware = new (require(middlewares[middleware]))(client, config, raven, auth);
        if (ware.onReady) ware.onReady();
        middlewareList.push({"ware": ware});
    }
    console.log(middlewareList);
    console.log(moduleList);
    website.setModuleList(moduleList);
}

client.on('error', (error)=> {
    if (raven) {
        raven.captureException(error);
    }
    console.error(error);
    console.error(error.stack);
});

client.on('disconnect', ()=> {
    console.log("Disconnect".red);
    for (var i in moduleList) {
        if (moduleList[i].module.onDisconnect) {
            moduleList[i].module.onDisconnect();
        }
    }
});

//When a connection is made initialise stuff.
client.on('ready', ()=> {
    id = client.user.id;
    mention = "<@" + id + ">";
    name = client.user.name;
    reload();
    console.log("-------------------");
    console.log("Ready as " + client.user.username);
    console.log("Mention  " + mention);
    console.log("-------------------");
    if (!hasBeenReady) {
        hasBeenReady = true;
        setTimeout(updateCarbon, 3600000)
    }
});

//Initiate a connection To Discord.
client.loginWithToken(auth.get("token", {}), (error)=> {
    if (error) {
        console.error("Error logging in.");
        console.error(error);
        console.error(error.stack);
    }
});

//When bot is added to a new server tell carbon about it.
client.on('serverCreated', ()=> {
    updateCarbon();
});


/**
 * logout on SIGINT
 * if logging out does not happen within 5s exit with an error.
 */
process.on('SIGINT', ()=> {
    setTimeout(() => {
        process.exit(1)
    }, 5000);
    console.log("Logging out.");
    client.logout(()=> {
        console.log("Bye");
        process.exit(0);
    });
});


/**
 * Updates Carbonitrix's website telling it the bot's new server count.
 */
function updateCarbon() {
    console.log("Attempting to update Carbon".green);
    if (process.uptime() < 60) {
        console.log("Not updating carbon to ensure all servers are loaded".green);
        return;
    }
    if (key) {
        request(
            {
                url: 'https://www.carbonitex.net/discord/data/botdata.php',
                body: {key: key, servercount: client.servers.length},
                json: true
            },
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log(body)
                }
                else if (error) {
                    console.error(error);
                }
                else {
                    console.error("Bad request or other");
                    console.error(response.body);
                }
            }
        );
    }
}

function reloadTarget(msg, command, perms, l, moduleList, middlewareList) {
    for (var module in moduleList) {
        if (moduleList[module].module.constructor.name === command.arguments[0]) {
            if (moduleList[module].module.onDisconnect) {
                moduleList[module].module.onDisconnect();
            }
            var modules = config.get("modules");
            delete require.cache[require.resolve(modules[command.arguments[0]])];
            msg.reply("Reloading " + command.arguments[0]);
            console.log("Reloading ".yellow + command.arguments[0].yellow);
            var mod = new (require(modules[command.arguments[0]]))(client, config, raven);
            if (mod.onReady) mod.onReady();
            moduleList[module].module = mod;
            moduleList[module].commands = mod.getCommands();
            console.log("Reloded ".yellow + command.arguments[0].yellow);
            msg.reply("Reloded " + command.arguments[0]);
        }
    }
}

//meew0's solution to the ECONNRESET crash error
process.on('uncaughtException', function (err) {
    // Handle ECONNRESETs caused by `next` or `destroy`
    if (err.code == 'ECONNRESET') {
        // Yes, I'm aware this is really bad node code. However, the uncaught exception
        // that causes this error is buried deep inside either discord.js, ytdl or node
        // itself and after countless hours of trying to debug this issue I have simply
        // given up. The fact that this error only happens *sometimes* while attempting
        // to skip to the next video (at other times, I used to get an EPIPE, which was
        // clearly an error in discord.js and was now fixed) tells me that this problem
        // can actually be safely prevented using uncaughtException. Should this bother
        // you, you can always try to debug the error yourself and make a PR.
        console.log('Got an ECONNRESET! This is *probably* not an error. Stacktrace:');
        console.log(err.stack);
    } else {
        // Normal error handling
        if (raven) {
            raven.captureException(err);
        }
        console.error(err);
        process.exit(1);
    }
});