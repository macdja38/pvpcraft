/**
 * Created by macdja38 on 2016-04-22.
 */
/**
 * Created by macdja38 on 2016-04-17.
 */
"use strict";

/**
 * nodes include
 * pex.set.global
 * pex.set.server
 * pex.set.channel
 * pex.set.* should not be allowed.
 */


var Perms = function (cl) {
    Perms.client = cl;
};

/** Command handler
 * @param msg
 * @param command
 * @param perms
 * @param l
 * @returns {boolean}
 */

Perms.prototype.onCommand = function (msg, command, perms, l) {
    console.log("PEX initiated");
    //console.log(command);

    if (command.command === "pex") {
        if (command.arguments.length === 0) {
            msg.reply("You need help! visit \<https://pvpcraft.ca/pvpbot\> for more info");
            return true;
        }
        else if (perms.check(msg, "pex")) {
            if (command.arguments[0] === "set") {
                msg.reply("set what? ");
                console.log(perms.check(msg, "pex"));
                console.log(perms.checkInfo(msg, "pex"));
                return true;
            }
        }
        else {
            msg.reply("sorry, no perms.")
        }

    }
    return false;
};

Perms.prototype.getCommands = function () {
    return ["pex"];
};

module.exports = Perms;