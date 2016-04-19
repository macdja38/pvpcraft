/**
 * Created by macdja38 on 2016-04-17.
 */
"use strict";
/**"server id": {
    "global": {
        "perm": {"allow": true}
    },
    "channels": {
        "channel_id": {
            "perm": {"deny": true}
        }
    }
}
 */
/** all lower case, subnode * is a wild card.*/

var path = require("path");

var Config = require("./config.js");

var colors = require('colors');

var Permissions = function (config) {
    this.perms = new Config(config.get("permissions").filename);
    console.log(this.perms);
};

Permissions.prototype.getCommands = function getCommands() {
    return ["set","remove","list"];
};

Permissions.prototype.set = function set(target, node, value) {
    if(!this.perms.data["*"]) {}
};

Permissions.prototype.check = function check(msg, node) {
    if (!msg.channel.server) {
        return false;
        //TODO: return global permissions.
    }
    var perms = this.perms.data;
    node = [msg.channel.server.id,msg.channel.id,getOrderedGroups(msg)].concat(node.split("."));
    console.log(node);
    if (perms) {
        var i = searchForNode(perms, node);
        if (i === true) {
            return true;
        }
    }
    return false;
};

Permissions.prototype.addServer = function addServer(server) {
    console.log(this.perms.data);
    this.perms.set(server.id, {"everyone": {"global": {}, "channels": {}}});
};

function getOrderedGroups(msg) {
    var arr = [];
    msg.channel.server.rolesOf(msg.author).forEach((role)=>{arr[role.position+1] = "g" + role.id});
    arr.push("u" + msg.author.id);
    return arr.filter(Boolean).reverse();
}

function searchForNode(tree, node) {
    try {
        var i;
        if(typeof(node[0]) === "object") {
            for(var role of node[0]) {
                if (tree[role] != null) {
                    if (tree[role] === true || tree[role] === false) {
                        return tree[role];
                    }
                    i = searchForNode(tree[role], node.slice(1));
                    if (i === true || i === false) {
                        return i;
                    }
                }
            }
            i = tree["*"];
            if (i == true || i == false) {
                return i;
            }
        }
        else if (tree.hasOwnProperty(node[0])) {
            if (tree[node[0]] === true || tree[node[0]] === false) {
                return tree[node[0]];
            }
            i = searchForNode(tree[node[0]], node.slice(1));
            if (i === true || i === false) {
                return i;
            }
        }
        i = tree["*"];
        if (i == true || i == false) {
            return i;
        }
        else {
            if(tree["*"]) {
                i = searchForNode(tree["*"], node.slice(1));
            }
            if (i == true || i == false) {
                return i;
            }
        }
    } catch (e) {
        console.error(e);
        console.error(e.stack);
        return false;
    }
    return null;
}

module.exports = Permissions;