/**
 * Created by macdja38 on 2016-04-21.
 */
"use strict";

const regargs = /(.*?)(?= -|\n|$)/;
const regAll = /(?:(?:\s--)(\w+).(.*?)(?= -|\n|$)|(?:\s-)([^-]*?)(?= -|\n|$))/g;

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
     arguments : ["command", "subcommand"],
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
        for (var i in prefix) {
            if (insen.indexOf(prefix[i].toLowerCase()) === 0) {
                message.content = message.content.substr(prefix[i].length);
                return clean(prefix[i]);
            }
        }
        if (options.allowMention) {
            // see if the user is mentioned
            if (insen.indexOf(options.allowMention) === 0) {
                message.content = message.content.replace(options.allowMention + " ", "");
                return "@" + options.botName + " ";
            }

        }
        return false;
    }

    var prefixUsed = isValidCommandType();
    if (!prefixUsed) {
        return false;
    }

    var args, flags = [];
    options = {};
    
    args = regargs.exec(message.content)[1].split(" ");
    var reg = regAll;
    var myArray;
    while((myArray = reg.exec(message.content)) !== null) {
        if(myArray[1] && myArray[2]) {
            options[myArray[1]] = myArray[2];
        }
        if(myArray[3]) {
            flags = flags.concat(myArray[3].split(""));
        }
    }

    return {
        command: args[0],
        commandnos: args[0][args[0].length - 1] === "s" ? args[0].slice(0, -1) : args[0],
        prefix: prefixUsed,
        arguments: args.slice(1),
        options: options,
        flags: flags
    };
};

function clean(text) {
    if (typeof(text) === "string") {
        return text.replace("``", "`" + String.fromCharCode(8203) + "`").replace("//", "/" + String.fromCharCode(8203) + "/");
    }
    else {
        return text;
    }
}