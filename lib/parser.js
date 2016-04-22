"use strict";

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
    allowMention: false
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

    console.log(prefix);
    function isValidCommandType() {
        var insen = message.content.trim().toLowerCase();
        for(var i in prefix) {
            if (insen.indexOf(prefix[i].toLowerCase()) === 0) {
                message.content = message.content.substr(prefix[i].length);
                return true;
            }
        }
        if (options.allowMention) {
            // see if the user is mentioned
            if (insen.indexOf(options.allowMention) === 0) {
                message.content = message.content.replace(options.allowMention, "");
                return true;
            }

        }
        return false;
    }

    if (!isValidCommandType()) {
        return false;
    }

    var args = [], flags = [], onEscape = false, buffer = "", inQuotes = false;
    options = {};

    for (var char of message.content) {
        if (char === " " && !inQuotes) {
            args.push(buffer);
            buffer = "";
            continue;
        }
        if (char === "\"") {
            if (inQuotes) {
                if (!onEscape) {
                    //the end of that quote
                    args.push(buffer);
                    inQuotes = false;
                    onEscape = false;
                    buffer = "";
                    continue;
                } else {
                    //continue adding
                    buffer += char;
                    onEscape = false;
                    continue;
                }
            } else {
                if (!onEscape)
                    inQuotes = true;
                else
                    onEscape = false;
                continue;
            }
        }
        if (char === "\\") {
            if (!onEscape) {
                onEscape = true;
                continue;
            } else {
                onEscape = false;
                buffer += char;
                continue;
            }
        }
        if (onEscape) {
            onEscape = false;
        }
        buffer += char;
    }

    if (buffer.length > 0) {
        args.push(buffer);
        buffer = "";
    }

    var i = args.length;
    while (i--) {
        if (args[i].length === 0) {
            args.splice(i, 1);
        }
    }

    i = args.length;
    while (i--) {
        if (args[i].charAt(0) === "-") {
            //maybe a flag or a boolean option?
            if (args[i].charAt(1) === "-") {
                //a boolean option
                options[args[i].split("").slice(2).join("")] = true;
                args.splice(i, 1);
            } else {
                //flags
                var mflags = args[i].split("").slice(1);
                flags = flags.concat(mflags);
                args.splice(i, 1);
            }
        }
    }

    i = args.length;
    while (i--) {
        if (~args[i].indexOf("=")) {
            if (~args[i].substring(0, args[i].indexOf("=")).indexOf(" ")) {
                //an argument
            } else {
                //an option
                var splitUp = args[i].split("=");
                var label = splitUp[0];
                options[label] = splitUp.slice(1).join("=");
                args.splice(i, 1);
            }
        } else {
            // an argument
        }
    }

    return {
        command: args[0],
        commandnos: args[0][args[0].length-1] === "s" ? args[0].slice(0,-1) : args[0],
        arguments: args.slice(1),
        options: options,
        flags: flags
    };
};