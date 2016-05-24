/**
 * Created by macdja38 on 2016-05-23.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

module.exports = class welcome {
    constructor(cl, config, raven) {
        //save the client as this.client for later use.
        this.client = cl;
        //save the bug reporting thing raven for later use.
        this.raven = raven;
        this.onJoin = (server, user) => {
            if (server.id == "77176186148499456") {
                this.client.sendMessage(server.channels.get("id", "171382498020950016"),
                    "Hop to it @here, " + utils.clean(user.username) + " Just joined " + utils.clean(server.name) +
                    " announce it in <#77176186148499456>\n```Welcome **" + utils.clean(user.username) + "**!```"
                );
            }
        };
        this.client.on("serverNewMember", this.onJoin);
    }

    onDisconnect() {
        this.client.removeListener("serverNewMember", this.onJoin);
    }

    getCommands() {
        return [""];
    }

    onCommand(msg, command, perms, l) {
        console.log("welcomeBot initiated");
        return false;
    }
};