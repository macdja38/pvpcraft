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

var Warframe = function (cl) {
    Warframe.client = cl;
};

Warframe.prototype.onMessage = function(msg, command, perms) {
    console.log("WARFRAME initiated");
    console.log(perms.check(msg, "warframe.deal"));
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

    else if ((command.commandnos ==='trader' || command.commandnos ==='voidtrader' || command.commandnos ==='baro') && perms.check(msg, "warframe.trader")) {
        worldState.get(function (state) {
            if (state.VoidTraders[0].Manifest) {
                var rep = "```xl\nBaro leaving " + state.VoidTraders[0].Node + " in " +
                   utils.secondsToTime(state.VoidTraders[0].Expiry.sec - state.Time) + "\n";
                for (var item of state.VoidTraders[0].Manifest) {
                    rep += "item: " + parseState.getName(itemsg.ItemType) + " - price:" + itemsg.PrimePrice + " ducats " + itemsg.RegularPrice + "cr\n";
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

    else if ((command.commandnos ==='trial' || command.commandnos ==='raid' || command.commandnos ==='trialstat') && perms.check(msg, "warframe.trial")) {
        Warframe.client.sendMessage(msg.channel,
            "Hek: \<http://tinyurl.com/qb752oj\> Nightmare: \<http://tinyurl.com/p8og6xf\> Jordas: \<http://tinyurl.com/prpebzh\>");
        return true;
    }

    else if (command.command ==='wiki' && args.length > 1 && perms.check(msg, "warframe.wiki")) {
        // check if page exists, kinda
        var url = 'https://warframe.wikia.com/wiki/';
        url += _.map(args.slice(1), function (n) {
            return n[0].toUpperCase() + n.substring(1);
        }).join('_');
        request.head(url, function (error, response) {
            if (error || response.statusCode !== 200) {
                Warframe.client.sendMessage(msg.channel, "could not find **" + args[1] + "**.");
                return true;
            }
            Warframe.client.sendMessage(msg.channel, url);
        });
        return true;
    }

    else if (command.commandnos ==='sortie' && perms.check(msg, "warframe.sortie")) {
        worldState.get(function (state) {
            var boss = parseState.getBoss(state.Sorties[0].Variants[0].bossIndex);
            var text = "```xl\n" +utils.secondsToTime(state.Sorties[0].Expiry.sec - state.Time) + " left to defeat " +
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

    else if ((command.commandnos === 'damage' || command.command === '!!element') && perms.check(msg, "warframe.trader")) {
        Warframe.client.sendMessage(msg.channel, "```xl\nDamage 2.0: https://pvpcraft.ca/wfd2.png Thanks for image Telkhines\n```");
        return true;
    }

    else if ((command.command === 'primeaccess' || command.command === 'access')  && perms.check(msg, "warframe.access")) {
        worldState.get(function (state) {
            var text = "```xl\n";
            for (var event of state.Events) {
                if (event.Messages[0].Message.toLowerCase().indexOf("access") > -1) {
                    text += event.Messages[0].Message.toUpperCase()
                        + " since " +utils.secondsToTime(state.Time - event.Date.sec) + " ago\n";
                }
            }
            if (text != "```xl\n") {
                Warframe.client.sendMessage(msg.channel, text + "```")
            }
        });
        return true;
    }

    else if ((command.commandnos === 'update') && perms.check(msg, "warframe.trader")) {
        worldState.get(function (state) {
            console.log(state.Events);
            var String = "```xl\n";
            var checks = ["update", "hotfix"];
            for (var event of state.Events) {
                for(var l of checks) {
                    if (event.Messages[0].Message.toLowerCase().indexOf(l) > -1) {
                        String += event.Messages[0].Message.toUpperCase() + " since " +
                           utils.secondsToTime(state.Time - event.Date.sec) + " ago \n learn more here: " + event.Prop + "\n";
                        checks.slice(l);
                    }
                }
            }
            if(String !== "```xl\n") {
                Warframe.client.sendMessage(msg.channel, String + "```");
            }
        });
        return true;
    }

    else if ((command.commandnos === 'armorstat' || command.commandnos === 'armor' ||
             command.commandnos === 'armourstat' || command.commandnos === 'armour')  && perms.check(msg, "warframe.armor")) {
        (function() {
            console.log(args.length);
            console.log(args);
            if(args.length < 2 || args.length == 3 || args.length > 4) {
                Warframe.client.sendMessage(msg.channel, "```xl\npossible uses include:\n" +
                    "!!armor (Base Armor) (Base Level) (Current Level) calculate armor and stats.\n" +
                    "!!armor (Current Armor)\n```");
                return true;
            }
            var text = "```xl\n";
            if(args.length == 4) {
                console.log(typeof(parseInt(args[1])));
                console.log(parseInt(args[1]));
                console.log(Math.pow((parseInt(args[3]) - parseInt(args[2])),1.75));
                if((parseInt(args[3]) - parseInt(args[2])) <= 0) {
                    Warframe.client.sendMessage(msg.channel, "```xl\nPlease check your input values\n```");
                    return true;
                }
                var armor = parseInt(args[1]) * (1 + (Math.pow((parseInt(args[3]) - parseInt(args[2])),1.75) / 200));
                text += "at level " + args[3] + " your enemy would have " + armor + " Armor\n";
            }
            else{
                var armor = parseInt(args[1]);
            }
            text += armor / (armor + 300) * 100 + "% damage reduction\n";
            Warframe.client.sendMessage(msg.channel, text + "```");
        })();
        return true;
    }
    return false;
};

Warframe.prototype.getCommands = function() {
    return ["deal", "darvo", "trader", "voidtrader", "baro", "trial", "raid", "trialstat", "wiki", "sortie", "farm", "damage", "priceacces", "acces", "update", "update", "armorstat", "armourstat", "armor", "armour"];
};

module.exports = Warframe;