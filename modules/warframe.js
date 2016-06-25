/**
 * Created by macdja38 on 2016-04-17.
 */
"use strict";

var StateGrabber = require("../lib/worldState.js");
var worldState = new StateGrabber();

var ParseState = require('../lib/parseState');
var parseState = new ParseState();

var Utils = require('../lib/utils');
var utils = new Utils();

var Twitter = require('twit');

var newStateGrabber = require("../lib/newWorldState");
var newWorldState = new newStateGrabber("http://content.warframe.com/dynamic/worldState.php", "pc");

var master;
if (process.env.id == 0) {
    master = true;
}

var twitter;

var request = require('request');

var _ = require('underscore');

var warframe = function (e) {
    warframe.client = e.client;
    warframe.config = e.configDB;
    warframe.raven = e.raven;
    warframe.alerts = [];
    if (master) {
        var twitter_auth = e.auth.get("twitter", false);
        warframe.twitter = new Twitter(twitter_auth);
        warframe.stream = warframe.twitter.stream('statuses/filter', {follow: "1344755923"});
    }
    warframe.onAlert = new Promise((resolve)=> {
        global.conn.then((con)=> {
            let dbReady;
            if (global.cluster.worker.id == 1) {
                dbReady = createDBIfNotExists("alerts", con);
            } else {
                dbReady = Promise.resolve();
            }
            dbReady.then(()=> {
                /*global.r.table(this.table).insert([{id: "*", prefix: "//", "changeThresh": 1}]).run(this.con).then((res)=>{
                 console.log(res);
                 });*/
                console.log("Did, DB Thing");
                for (var item in warframe.config.data) {
                    if (warframe.config.data.hasOwnProperty(item) && warframe.config.data[item].hasOwnProperty("warframeAlerts")) {
                        if (warframe.client.channels.get("id", warframe.config.data[item]["warframeAlerts"].channel) != null) {
                            warframe.alerts.push(warframe.config.data[item].warframeAlerts);
                        } else {
                            //TODO: notify the server owner their mod alerts channel has been removed and that //setalerts false will make that permanent.
                        }
                    }
                }
                if (master) {
                    console.log(`Shard ${process.env.id} is the Master Shard!`);
                    if (twitter_auth) {
                        //build the map of server id's and logging channels.
                        console.log(warframe.alerts);
                        console.log("twitter auth found, declairing onAlert");
                        resolve(
                            function (tweet) {
                                console.log(tweet);
                                if (tweet.user.id_str === '1344755923' && !tweet.retweeted_status) {
                                    console.log("Tweet Found");
                                    let alert = tweet.text.match(/(.*?): (.*?) - (.*?) - (.*)/);
                                    if (alert) {
                                        alert = alert.slice(1, 5);
                                        alert.invasion = false;
                                    } else {
                                        alert = tweet.text.match(/(.*?): (.*?) (VS\.) (.*)/);
                                        if (alert) {
                                            alert = alert.slice(1, 5);
                                            alert.invasion = true;
                                        }
                                    }
                                    if (alert) {
                                        console.log("Logging tweet");
                                        global.r.table('alerts').insert(alert.reduce(function (o, v, i) {
                                            o[i] = v;
                                            return o;
                                        }, {})).run(con).then(console.log);
                                    }
                                }
                            })
                    }
                }
                global.r.table('alerts').changes().run(con, (err, cursor)=> {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    cursor.each((alert)=> {
                        console.dir(warframe.alerts, {depth: 2});
                        warframe.alerts.forEach((server)=> {
                            let channel = warframe.client.channels.get("id", server.channel);
                            if (channel && server.tracking === true)
                                console.log(channel.name);
                            let things = [];
                            let madeMentionable = [];
                            for (let thing in server.items) {
                                if (server.items.hasOwnProperty(thing)) {
                                    if (alert["3"].toLowerCase().indexOf(thing) > -1) {
                                        things.push(server.items[thing]);
                                        madeMentionable.push(warframe.client.updateRole(server.items[thing], {
                                            mentionable: true
                                        }));
                                    }
                                    if (alert.invasion && alert["2"].toLowerCase().indexOf(thing) > -1) {
                                        things.push(server.items[thing]);
                                        madeMentionable.push(warframe.client.updateRole(server.items[thing], {
                                            mentionable: true
                                        }));
                                    }
                                }
                            }
                            let sendAlert = () => {
                                return warframe.client.sendMessage(channel, `\`\`\`xl\n${alert.join("\n")}\`\`\`${things.map((thing)=> {
                                    return `<@&${thing}>`
                                })}`)
                            };
                            let makeUnmentionable = () => {
                                for (let thing in things) {
                                    if (things.hasOwnProperty(thing)) {
                                        let role = server.roles.get("id", things[thing]);
                                        if (role) {
                                            warframe.client.updateRole(role, {
                                                mentionable: false
                                            });
                                        }
                                    }
                                }
                            };
                            Promise.all(madeMentionable).then(()=> {
                                sendAlert().then(makeUnmentionable);
                            }).catch((error)=> {
                                //console.error(error);
                                //sendAlert();
                                //makeUnmentionable();
                                //warframe.client.sendMessage(channel, "Unable to make role mentionable, please contact @```Macdja38#7770 for help after making sure the bot has sufficient permissions").catch(console.error);
                            });

                        });
                    });
                });
            });
        });
    });
};

function createDBIfNotExists(name, con) {
    return global.r.tableList().contains(name)
        .do((databaseExists) => {
            return global.r.branch(
                databaseExists,
                {dbs_created: 0},
                global.r.tableCreate(name)
            );
        }).run(con)
}

warframe.prototype.onReady = function () {
    if (warframe.twitter && master) {
        warframe.onAlert.then((alerts)=> {
            console.log("Attaching Listener");
            warframe.stream.on('tweet', alerts);
            warframe.stream.start();
        })
    }
};

warframe.prototype.onDisconnect = function () {
    if (warframe.twitter && master) {
        warframe.onAlert.then((alerts)=> {
            warframe.stream.removeListener('tweet', alerts);
            warframe.stream.stop();
        });
    }
};

var commands = ["setupalerts", "alert", "deal", "darvo", "trader", "voidtrader", "baro", "trial", "raid", "trialstat", "wiki", "sortie", "farm", "damage", "primeacces", "acces", "update", "update", "armorstat", "armourstat", "armor", "armour"];

warframe.prototype.getCommands = function () {
    return commands
};

warframe.prototype.checkMisc = function (msg, perms) {
    if (msg.content.toLowerCase().indexOf("soon") == 0 && msg.content.indexOf(":tm:") < 0 && perms.check(msg, "warframe.misc.soon")) {
        warframe.client.sendMessage(msg.channel, "Soon:tm:");
        return true;
    }
    return false;
};

warframe.prototype.onCommand = function (msg, command, perms) {
    console.log("WARFRAME initiated");
    //console.log(command);
    if ((command.commandnos === 'deal' || command.command === 'darvo') && perms.check(msg, "warframe.deal")) {
        worldState.get(function (state) {
            warframe.client.sendMessage(msg.channel, "```xl\n" + "Darvo is selling " +
                parseState.getName(state.DailyDeals[0].StoreItem) +
                " for " + state.DailyDeals[0].SalePrice +
                "p (" +
                state.DailyDeals[0].Discount + "% off, " + (state.DailyDeals[0].AmountTotal - state.DailyDeals[0].AmountSold) +
                "/" + state.DailyDeals[0].AmountTotal + " left, refreshing in " + utils.secondsToTime(state.DailyDeals[0].Expiry.sec - state.Time) +
                ")" +
                "\n```");
        });
        return true;
    }

    if (command.commandnos === "alert") {
        if (command.args[0] === "list" && perms.check(msg, "rank.list")) {
            let roles = warframe.config.get("warframeAlerts", {items: {}}, {server: msg.server.id}).items;
            let coloredRolesList = "";
            for (var role in roles) {
                if (roles.hasOwnProperty(role) && role != "joinrole") {
                    coloredRolesList += `${role}\n`;
                }
            }
            if (coloredRolesList != "") {
                msg.channel.sendMessage(`Available alerts include \`\`\`xl\n${coloredRolesList}\`\`\``)
            } else {
                msg.reply(`No alerts are being tracked.`)
            }
            return true;
        }
        if (command.args[0] === "join" && perms.check(msg, "warframe.alerts.join")) {
            let roles = warframe.config.get("warframeAlerts", {items: {}}, {server: msg.server.id}).items;
            if (!command.args[1] || !roles[command.args[1]]) {
                msg.reply(`Please supply an item to join using \`${command.prefix}rank join \<rank\>\`, for a list of items use \`${command.prefix}rank list\``);
                return true;
            }
            let rankToJoin = command.args[1].toLowerCase();
            role = msg.server.roles.get("id", roles[rankToJoin]);
            if (role) {
                warframe.client.addMemberToRole(msg.author, role, (error)=> {
                    let logChannel = warframe.config.get("msgLog", false, {server: msg.server.id});
                    if (error) {
                        if (logChannel) {
                            logChannel = msg.server.channels.get("id", logChannel);
                            if (logChannel) {
                                warframe.client.sendMessage(logChannel, `Error ${error} promoting ${utils.removeBlocks(msg.author.username)} try redefining your rank and making sure the bot has enough permissions.`).catch(console.error)
                            } else {
                                msg.reply(`Error ${error} promoting ${utils.removeBlocks(msg.author.username)} try redefining your rank and making sure the bot has enough permissions.`)
                            }
                        }
                    } else {
                        if (logChannel) {
                            logChannel = msg.server.channels.get("id", logChannel);
                            if (logChannel) {
                                warframe.client.sendMessage(logChannel, `${utils.removeBlocks(msg.author.username)} added themselves to ${utils.removeBlocks(role.name)}!`)
                            }
                        }
                        msg.reply(":thumbsup::skin-tone-2:");
                    }
                })
            } else {
                msg.reply(`Role could not be found, have an administrator use \`${command.prefix}tracking --add <item>\` to add it.`);
            }
            return true;
        }
        if (command.args[0] === "leave" && perms.check(msg, "warframe.alerts.leave")) {
            let roles = warframe.config.get("warframeAlerts", {items: {}}, {server: msg.server.id}).items;
            if (!command.args[1] || !roles[command.args[1]]) {
                msg.reply(`Please supply a rank to leave using \`${command.prefix}alerts leave \<rank\>\`, for a list of ranks use \`${command.prefix}alerts list\``);
                return true;
            }
            role = msg.server.roles.get("id", roles[command.args[1]]);
            if (role) {
                warframe.client.removeMemberFromRole(msg.author, role, (error)=> {
                    let logChannel = warframe.config.get("msgLog", false, {server: msg.server.id});
                    if (error) {
                        if (logChannel) {
                            logChannel = msg.server.channels.get("id", logChannel);
                            if (logChannel) {
                                warframe.client.sendMessage(logChannel, `Error ${error} demoting ${utils.removeBlocks(msg.author.username)} try redefining your rank and making sure the bot has enough permissions.`).catch(console.error)
                            }
                        }
                    } else {
                        if (logChannel) {
                            logChannel = msg.server.channels.get("id", logChannel);
                            if (logChannel) {
                                warframe.client.sendMessage(logChannel, `${utils.removeBlocks(msg.author.username)} removed themselves from ${utils.removeBlocks(role.name)}!`)
                            }
                        }
                        msg.reply(":thumbsup::skin-tone-2:");
                    }
                })
            } else {
                msg.reply(`Role could not be found, have an administrator use \`${command.prefix}alerts add <item>\` to add it.`);
                return true;
            }
            return true;
        }

        if (command.args[0] === "enable" && perms.check(msg, "admin.warframe.alerts")) {
            let config = warframe.config.get("warframeAlerts",
                {
                    "tracking": true,
                    "channel": "",
                    "items": {}
                }, {
                    server: msg.server.id
                }
            );
            if (command.args[0] && command.args[0] == "false") {
                config.tracking = false;
            } else if (config.tracking == false) {
                config.tracking = true;
            }
            if (command.channel) {
                config.channel = command.channel.id;
            } else {
                config.channel = msg.channel.id;
            }
            if (!config.items) {
                config.items = {};
            }
            warframe.config.set("warframeAlerts", config, {server: msg.channel.server.id});
            msg.reply(":thumbsup::skin-tone-2:");
            return true;
        }

        if (command.args[0] === "add" && perms.check(msg, "admin.warframe.alerts")) {
            if (command.args[1]) {
                let config = warframe.config.get("warframeAlerts",
                    {
                        "tracking": false,
                        "channel": "",
                        "items": {}
                    }

                    , {server: msg.server.id});
                if (typeof(config.tracking) !== "boolean") {
                    config.tracking = false;
                }
                if (!config.items) {
                    config.items = {};
                }
                if (config.items.hasOwnProperty(command.args[1].toLowerCase())) {
                    msg.reply(`Resource is already being tracked, use \`${command.prefix}alert join ${utils.clean(command.args[1])}\` to join it.`);
                    return;
                }
                msg.channel.server.createRole({
                    name: command.args[1].toLowerCase(),
                    permissions: [],
                    mentionable: true
                }, (error, role) => {
                    if (error) {
                        if (error.status == 403) {
                            msg.reply("Error, insufficient permissions, please give me manage roles.");
                        }
                        else {
                            msg.reply("Unexpected error please report the issue https://pvpcraft.ca/pvpbot");
                            console.log(error);
                            console.log(error.stack);
                        }
                        return;
                    }
                    config.items[role.name] = role.id;
                    warframe.config.set("warframeAlerts", config, {server: msg.channel.server.id});
                    console.log(config);
                    msg.reply("Created role " + utils.clean(role.name) + " with id `" + role.id + "`");
                });
                return true;
            }
            msg.reply("invalid option's please specify the name of a resource to track to change tracking options");
            return true;
        }

        if (command.args[0] === "remove" && perms.check(msg, "admin.warframe.alerts")) {
            if (command.args[1]) {
                let config = warframe.config.get("warframeAlerts",
                    {
                        "tracking": false,
                        "channel": "",
                        "items": {}
                    }

                    , {server: msg.server.id});
                if (typeof(config.tracking) !== "boolean") {
                    config.tracking = false;
                }
                if (!config.items) {
                    config.items = {};
                }
                if (!config.items.hasOwnProperty(command.args[1])) {
                    msg.reply(`Resource is not being tracked, use \`${command.prefix}alert add ${utils.clean(command.args[1])}\` to add it.`);
                    return;
                }
                let role = msg.server.roles.get("name", command.args[1]);
                if (role) {
                    warframe.client.deleteRole(role, (error) => {
                        if (error) {
                            if (error.status == 403) {
                                msg.reply("Error, insufficient permissions, please give me manage roles.");
                            }
                            else {
                                msg.reply("Unexpected error please report the issue https://pvpcraft.ca/pvpbot");
                                console.log(error);
                                console.log(error.stack);
                            }
                            return;
                        }
                        delete config.items[command.args[1]];
                        warframe.config.set("warframeAlerts", config, {server: msg.channel.server.id});
                        msg.reply("Deleted role " + utils.clean(command.args[1]) + " with id `" + role.id + "`");
                    });
                    return true;
                } else {
                    delete config.items[command.args[1]];
                    warframe.config.set("warframeAlerts", config, {server: msg.channel.server.id});
                    msg.reply("Role not found, removed " + utils.clean(command.args[1]) + " from list.");
                    return true;
                }
            }
            msg.reply("Invalid option's please specify the name of a resource to track to change tracking options");
            return true;
        }
    }

    if ((command.commandnos === 'trader' || command.commandnos === 'voidtrader' || command.commandnos === 'baro') && perms.check(msg, "warframe.trader")) {
        worldState.get(function (state) {
            if (state.VoidTraders[0].Manifest) {
                var rep = "```xl\nBaro leaving " + state.VoidTraders[0].Node + " in " +
                    utils.secondsToTime(state.VoidTraders[0].Expiry.sec - state.Time) + "\n";
                for (var item of state.VoidTraders[0].Manifest) {
                    rep += "item: " + parseState.getName(item.ItemType) + " - price:" + item.PrimePrice + " ducats " + item.RegularPrice + "cr\n";
                }
                rep += "```"
                warframe.client.sendMessage(msg.channel, rep);
            }
            else {
                warframe.client.sendMessage(msg.channel, "```xl\nBaro appearing at " + state.VoidTraders[0].Node + " in " +
                    utils.secondsToTime(state.VoidTraders[0].Activation.sec - state.Time) + "\n```");
            }
        });
        return true;
    }

    else if ((command.commandnos === 'trial' || command.commandnos === 'raid' || command.commandnos === 'trialstat') && perms.check(msg, "warframe.trial")) {
        warframe.client.sendMessage(msg.channel,
            "Hek: \<http://tinyurl.com/qb752oj\> Nightmare: \<http://tinyurl.com/p8og6xf\> Jordas: \<http://tinyurl.com/prpebzh\>");
        return true;
    }

    else if (command.commandnos === 'alert' && perms.check(msg, "warframe.alert")) {
        worldState.get(function (state) {
            if (state.Alerts) {
                for (var alert of state.Alerts) {
                    var rewards = "";
                    if (alert.MissionInfo.missionReward) {
                        if (alert.MissionInfo.missionReward.items) {
                            for (var reward of alert.MissionInfo.missionReward.items) {
                                if (rewards != "") rewards += " + ";
                                rewards += parseState.getName(reward);
                            }
                        }
                        if (alert.MissionInfo.missionReward.countedItems) {
                            for (var reward of alert.MissionInfo.missionReward.countedItems) {
                                if (rewards != "") rewards += " + ";
                                rewards += reward.ItemCount + " " + parseState.getName(reward.ItemType);
                            }
                        }
                        if (rewards != "") rewards += " + ";
                        if (alert.MissionInfo.missionReward.credits) rewards += alert.MissionInfo.missionReward.credits + " credits";
                    }
                    warframe.client.sendMessage(msg.channel,
                        "```xl\n" +
                        alert.MissionInfo.location + " levels " + alert.MissionInfo.minEnemyLevel + "-" + alert.MissionInfo.maxEnemyLevel + "\n" +
                        parseState.getLevel(alert.MissionInfo.descText) + "\n" +
                        parseState.getFaction(alert.MissionInfo.faction) + " " + parseState.getMissionType(alert.MissionInfo.missionType) + "\n" +
                        rewards +
                        "\nExpires in " + utils.secondsToTime(alert.Expiry.sec - state.Time) +
                        "\n```"
                    );
                }

            }
        });
        return true;
    }

    else if (command.command === 'wiki' && perms.check(msg, "warframe.wiki")) {
        //use wikia's api to search for the item.
        if (command.args.length === 0) {
            warframe.client.sendMessage(msg.channel, "Please provide something to search for!");
            return true;
        }
        request.post("http://warframe.wikia.com/api/v1/Search/List", {
            form: {
                query: command.args.join(' '),
                limit: 1
            }
        }, function (err, response, body) {
            if (err || response.statusCode === 404) {
                warframe.client.sendMessage(msg.channel, "Could not find **" + utils.clean(command.args.join(' ')) + "**");
            } else if (response.statusCode !== 200) {
                console.error(' returned HTTP status ' + response.statusCode);
            } else {
                try {
                    warframe.client.sendMessage(msg.channel, JSON.parse(body).items[0].url);
                } catch (e) {
                    console.error('Invalid JSON from http://warframe.wikia.com/api/v1/Search/List while searching the wiki');
                }
            }
        });
        return true;

    }

    else if (command.commandnos === 'sortie' && perms.check(msg, "warframe.sortie")) {
        worldState.get(function (state) {
            if (state.Sorties[0]) {
                var boss = parseState.getBoss(state.Sorties[0].Variants[0].bossIndex);
                var text = "```xl\n" + utils.secondsToTime(state.Sorties[0].Expiry.sec - state.Time) + " left to defeat " +
                    boss.name + " of the " + boss.faction + "\n";
                for (var Variant of state.Sorties[0].Variants) {
                    var Region = parseState.getRegion(Variant.regionIndex);
                    if (Region.missions[Variant.missionIndex] != "Assassination") {
                        text += Region.missions[Variant.missionIndex] + " on " + Region.name + " with " +
                            parseState.getModifiers(Variant.modifierIndex) + "\n";
                    }
                    else {
                        text += "Assassinate " + boss.name + " on " + Region.name + " with " +
                            parseState.getModifiers(Variant.modifierIndex) + "\n";
                    }
                }
                text += "```";
                warframe.client.sendMessage(msg.channel, text);
                return true;
            }
        });
        return true;
    }

    else if (command.command === 'farm' && perms.check(msg, "warframe.farm")) {
        warframe.client.sendMessage(msg.channel, "You can probably find that resource here: \<https://steamcommunity.com/sharedfiles/filedetails/?id=181630751\>");
        return true;
    }

    else if ((command.commandnos === 'damage' || command.command === 'element') && perms.check(msg, "warframe.damage")) {
        warframe.client.sendMessage(msg.channel, "```xl\nDamage 2.0: https://pvpcraft.ca/wfd2.png Thanks for image Telkhines\n```");
        return true;
    }

    else if ((command.command === 'primeaccess' || command.command === 'access') && perms.check(msg, "warframe.access")) {
        worldState.get(function (state) {
            var text = "```xl\n";
            for (var event of state.Events) {
                if (event.Messages[0].Message.toLowerCase().indexOf("access") > -1) {
                    text += event.Messages[0].Message.toUpperCase()
                        + " since " + utils.secondsToTime(state.Time - event.Date.sec) + " ago\n";
                }
            }
            if (text != "```xl\n") {
                warframe.client.sendMessage(msg.channel, text + "```")
            }
        });
        return true;
    }

    else if ((command.commandnos === 'update') && perms.check(msg, "warframe.update")) {
        worldState.get(function (state) {
            console.log(state.Events);
            var String = "```xl\n";
            var checks = ["update", "hotfix"];
            for (var event of state.Events) {
                for (var l of checks) {
                    if (event.Messages[0].Message.toLowerCase().indexOf(l) > -1) {
                        String += event.Messages[0].Message.toUpperCase() + " since " +
                            utils.secondsToTime(state.Time - event.Date.sec) + " ago \n learn more here: " + event.Prop + "\n";
                        checks.slice(l);
                    }
                }
            }
            if (String !== "```xl\n") {
                warframe.client.sendMessage(msg.channel, String + "```");
            }
        });
        return true;
    }

    else if ((command.commandnos === 'armorstat' || command.commandnos === 'armor' ||
        command.commandnos === 'armourstat' || command.commandnos === 'armour') && perms.check(msg, "warframe.armor")) {
        (function () {
            if (command.args.length < 1 || command.args.length == 2 || command.args.length > 3) {
                warframe.client.sendMessage(msg.channel, "```xl\npossible uses include:\n" +
                    command.prefix + "armor (Base Armor) (Base Level) (Current Level) calculate armor and stats.\n" +
                    command.prefix + "armor (Current Armor)\n```");
                return true;
            }
            var text = "```xl\n";
            if (command.args.length == 3) {
                if ((parseInt(command.args[2]) - parseInt(command.args[1])) < 0) {
                    warframe.client.sendMessage(msg.channel, "```xl\nPlease check your input values\n```");
                    return true;
                }
                var armor = parseInt(command.args[0]) * (1 + (Math.pow((parseInt(command.args[2]) - parseInt(command.args[1])), 1.75) / 200));
                text += "at level " + command.args[2] + " your enemy would have " + armor + " Armor\n";
            }
            else {
                var armor = parseInt(command.args[0]);
            }
            text += armor / (armor + 300) * 100 + "% damage reduction\n";
            warframe.client.sendMessage(msg.channel, text + "```");
        })();
        return true;
    }
    return false;
};

module.exports = warframe;