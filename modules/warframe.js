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

var request = require('request');

var _ = require('underscore');

var Warframe = function (cl, config) {
    Warframe.client = cl;
    Warframe.config = config;
};

var commands = ["setupalerts", "tracking", "alert", "deal", "darvo", "trader", "voidtrader", "baro", "trial", "raid", "trialstat", "wiki", "sortie", "farm", "damage", "primeacces", "acces", "update", "update", "armorstat", "armourstat", "armor", "armour"];

Warframe.prototype.getCommands = function () {
    return commands
};

Warframe.prototype.checkMisc = function (msg, perms, l) {
    if (msg.content.toLowerCase().indexOf("soon") == 0 && msg.content.indexOf(":tm:") < 0 && perms.check(msg, "warframe.misc")) {
        msg.reply("Soon:tm:");
        return true;
    }
    return false;
};

Warframe.prototype.onCommand = function (msg, command, perms, l) {
    console.log("WARFRAME initiated");
    //console.log(command);
    if ((command.commandnos === 'deal' || command.command === 'darvo') && perms.check(msg, "warframe.deal")) {
        worldState.get(function (state) {
            Warframe.client.sendMessage(msg.channel, "```xl\n" + "Darvo is selling " +
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

    if ((command.commandnos === 'setupalerts') && perms.check(msg, "admin.warframe.setupalerts")) {

        return true;
    }
    //TODO: track alerts, add command to set broadcast channel, regex alerts for role names and mention those roles in broadcast channels.
    //TODO: make roles created by bot mentionable
    if ((command.commandnos === 'tracking') && perms.check(msg, "admin.warframe.setupalerts")) {
        console.log(command);
        if (command.options.add) {
            var config = Warframe.config.get(msg.channel.server.id,
                {
                    "warframeAlerts": {
                        "tracking": false,
                        "items": {
                        }
                    }
                }
            );
            if(!config.warframeAlerts) {
                config.warframeAlerts = {"tracking": false, "items": {}};
            }
            if(typeof(config.warframeAlerts.tracking) !== "boolean") {
                config.warframeAlerts.tracking = false;
            }
            if(!config.warframeAlerts.items) {
                config.warframeAlerts.items = {};
            }
            msg.channel.server.createRole({name: command.options.add, permissions:[], position:10}, (error, role) => {
                if(error) {
                    msg.reply("error creating role, check to see if I have enough permissions.");
                    console.log(error);
                    console.log(error.stack);
                    return;
                }
                config.warframeAlerts.items[role.name] = role.id;
                Warframe.config.set(msg.channel.server.id, config);
                console.log(config);
                msg.reply("Created role " + role.name + " with id " + role.id);
            });
            return true;
        }

        msg.reply("invalid option's please specify --add <thing to track> or --remove <thing to remove> to change tracking options");
        return true;
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
                Warframe.client.sendMessage(msg.channel, rep);
            }
            else {
                Warframe.client.sendMessage(msg.channel, "```xl\nBaro appearing at " + state.VoidTraders[0].Node + " in " +
                    utils.secondsToTime(state.VoidTraders[0].Activation.sec - state.Time) + "\n```");
            }
        });
        return true;
    }

    else if ((command.commandnos === 'trial' || command.commandnos === 'raid' || command.commandnos === 'trialstat') && perms.check(msg, "warframe.trial")) {
        Warframe.client.sendMessage(msg.channel,
            "Hek: \<http://tinyurl.com/qb752oj\> Nightmare: \<http://tinyurl.com/p8og6xf\> Jordas: \<http://tinyurl.com/prpebzh\>");
        return true;
    }

    else if (command.commandnos === 'alert' && perms.check(msg, "warframe.trial")) {
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
                                rewards += reward.itemCount + " " + parseState.getName(reward.itemType);
                            }
                        }
                        if (rewards != "") rewards += " + ";
                        if (alert.MissionInfo.missionReward.credits) rewards += alert.MissionInfo.missionReward.credits + " credits";
                    }
                    Warframe.client.sendMessage(msg.channel,
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
        if (command.arguments.length === 0) {
            Warframe.client.sendMessage(msg.channel, "Please provide something to search for!");
            return true;
        }
        request.post("http://warframe.wikia.com/api/v1/Search/List", {
            form: {
                query: command.arguments.join(' '),
                limit: 1
            }
        }, function (err, response, body) {
            if (err || response.statusCode === 404) {
                Warframe.client.sendMessage(msg.channel, "Could not find **" + utils.clean(command.arguments.join(' ')) + "**");
            } else if (response.statusCode !== 200) {
                console.error(' returned HTTP status ' + response.statusCode);
            } else {
                try {
                    Warframe.client.sendMessage(msg.channel, JSON.parse(body).items[0].url);
                } catch (e) {
                    console.error('Invalid JSON from http://warframe.wikia.com/api/v1/Search/List while searching the wiki');
                }
            }
        });
        return true;

    }

    else if (command.commandnos === 'sortie' && perms.check(msg, "warframe.sortie")) {
        worldState.get(function (state) {
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
            Warframe.client.sendMessage(msg.channel, text);
            return true;
        });
        return true;
    }

    else if (command.command === 'farm' && perms.check(msg, "warframe.farm")) {
        Warframe.client.sendMessage(msg.channel, "You can probably find that resource here: \<https://steamcommunity.com/sharedfiles/filedetails/?id=181630751\>");
        return true;
    }

    else if ((command.commandnos === 'damage' || command.command === 'element') && perms.check(msg, "warframe.trader")) {
        Warframe.client.sendMessage(msg.channel, "```xl\nDamage 2.0: https://pvpcraft.ca/wfd2.png Thanks for image Telkhines\n```");
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
                Warframe.client.sendMessage(msg.channel, text + "```")
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
                Warframe.client.sendMessage(msg.channel, String + "```");
            }
        });
        return true;
    }

    else if ((command.commandnos === 'armorstat' || command.commandnos === 'armor' ||
        command.commandnos === 'armourstat' || command.commandnos === 'armour') && perms.check(msg, "warframe.armor")) {
        (function () {
            if (command.arguments.length < 1 || command.arguments.length == 2 || command.arguments.length > 3) {
                Warframe.client.sendMessage(msg.channel, "```xl\npossible uses include:\n" +
                    command.prefix + "armor (Base Armor) (Base Level) (Current Level) calculate armor and stats.\n" +
                    command.prefix + "armor (Current Armor)\n```");
                return true;
            }
            var text = "```xl\n";
            if (command.arguments.length == 3) {
                if ((parseInt(command.arguments[2]) - parseInt(command.arguments[1])) < 0) {
                    Warframe.client.sendMessage(msg.channel, "```xl\nPlease check your input values\n```");
                    return true;
                }
                var armor = parseInt(command.arguments[0]) * (1 + (Math.pow((parseInt(command.arguments[2]) - parseInt(command.arguments[1])), 1.75) / 200));
                text += "at level " + command.arguments[2] + " your enemy would have " + armor + " Armor\n";
            }
            else {
                var armor = parseInt(command.arguments[0]);
            }
            text += armor / (armor + 300) * 100 + "% damage reduction\n";
            Warframe.client.sendMessage(msg.channel, text + "```");
        })();
        return true;
    }
    return false;
};

module.exports = Warframe;