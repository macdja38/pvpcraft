/**
 * Created by macdja38 on 2016-04-21.
 */
"use strict";

const regargs = /^.*?(?:\s|$)((?:\n|.)*?)(?= -|$)/;
const regAll = /(?:(?:\s--)(\w+).(\n|.*?)(?= -|\n|$)|(?:\s-)([^-]*?)(?= -|\n|$))/g;

function DefaultOptions(defaults, options) {

    if (!options) {
        options = {};
    }

    for (var key in defaults) {
        if (!options.hasOwnProperty(key)) {
            options[key] = defaults[key];
        }
    }

    return options;
}

var defaults = {
    allowMention: false,
    botName: false
};

exports.command = function (prefix, message, options) {

    options = DefaultOptions(defaults, options);

    /*
     >>help command subcommand arg1=bop arg2="bop bop" -fl --verbose

     should ideally output:
     {
     command : "help",
     args : ["command", "subcommand"],
     options : {
     arg1 : "bop",
     arg2 : "bop bop"
     verbose : true
     },
     flags : ["f", "l"]
     }
     */
    function isValidCommandType() {
        var insen = message.content.trim().toLowerCase();
        var m = message.content;
        for (var i in prefix) {
            if (insen.indexOf(prefix[i].toLowerCase()) === 0) {
                m = m.substr(prefix[i].length);
                return {prefix: clean(prefix[i]), content: m};
            }
        }
        if (options.allowMention) {
            // see if the user is mentioned
            if (insen.indexOf("<@" + options.allowMention + ">") === 0) {
                m = m.replace("<@" + options.allowMention + "> ", "");
                return {prefix: "@" + options.botName + " ", content: m};
            }
            else if (insen.indexOf("<@!" + options.allowMention + ">") === 0) {
                m = m.replace("<@!" + options.allowMention + "> ", "");
                return {prefix: "@" + options.botName + " ", content: m};
            }
        }
        return false;
    }

    var prefixUsed = isValidCommandType();
    if (!prefixUsed) {
        return false;
    }
    var content = prefixUsed.content;
    prefixUsed = prefixUsed.prefix;

    var args, flags = [];
    options = {};

    args = regargs.exec(content)[1].trim().split(" ");
    for (var i in args) {
        if (args[i] === "") {
            args.splice(i, 1);
        }
    }
    var reg = regAll;
    var myArray;
    while ((myArray = reg.exec(content)) !== null) {
        if (myArray[1] && myArray[2]) {
            options[myArray[1]] = myArray[2];
        }
        if (myArray[3]) {
            flags = flags.concat(myArray[3].split(""));
        }
    }

    if(args[0]) {
        args[0] = args[0].toLowerCase();
    }

    var command = {
        command: args[0],
        commandnos: args[0] ? (args[0][args[0].length - 1] === "s" ? args[0].slice(0, -1) : args[0]) : args[0],
        prefix: prefixUsed,
        args: args.slice(1),
        options: options,
        flags: flags
    };

    if(options.role && !message.channel.isPrivate) {
        var role;
        if (/<@&\d+>/.test(options.role)) {
            let roleId = options.role.match(/<@&(\d+)>/)[1];
            role = message.server.roles.get("id", roleId);
        }
        else {
            role = message.server.roles.get("id", options.role);
        }
        if (role) {
            command.role = role;
        }
    }

    if(options.channel && !message.channel.isPrivate) {
        var channel;
        if(options.channel) {
            if (/<#\d+>/.test(options.channel)) {
                let channelId = options.channel.match(/<#(\d+)>/)[1];
                channel = message.server.channels.get("id", channelId);
            }
            else {
                channel = message.server.channels.get("name", options.channel);
            }
            if (channel) {
                //if we found the channel check their permissions then define the channel.
                command.channel = channel;
            }
        }
    }

    if(options.user && !message.channel.isPrivate) {
        var user;
        if (/<(?:@!|!)\d+>/.test(options.user)) {
            let userId = options.user.match(/<(?:@!|@)(\d+)>/)[1];
            user = message.channel.server.members.get("id", userId);
        }
        else {
            let userName = options.user.toUpperCase();
            user = message.channel.server.members.get("name", userName);
        }
        if (user) {
            //if we found the user check their permissions then define the user.
            command.user = user;
        }
    }

    return command;
};

function clean(text) {
    if (typeof(text) === "string") {
        return text.replace("``", "`" + String.fromCharCode(8203) + "`").replace("//", "/" + String.fromCharCode(8203) + "/");
    }
    else {
        return text;
    }
}
