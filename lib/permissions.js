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
    if (msg.channel.server) {
        node = [msg.channel.server.id, msg.channel.id, getOrderedGroups(msg)].concat(node.split("."));
    }
    else {
        node = ["global","global","u" + msg.author.id].concat(node.split("."));
    }
    //console.log(node);
    if (this.perms.data) {
        var i = searchForNode(this.perms.data, node);
        if (i === true) {
            return true;
        }
    }
    return false;
};

Permissions.prototype.checkInfo = function check(msg, node) {
    if (msg.channel.server) {
        node = [msg.channel.server.id, msg.channel.id, getOrderedGroups(msg)].concat(node.split("."));
    }
    else {
        node = ["global","global","u" + msg.author.id].concat(node.split("."));
    }
    //console.log(node);
    if (this.perms.data) {
        var i = searchForNodeInfo(this.perms.data, node, 0);
        if (i.found === true) {
            return i;
        }
    }
    return {found: false}
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
                if (i == true || i == false) {
                    return i;
                }
            }
        }
    } catch (e) {
        console.error(e);
        console.error(e.stack);
        return false;
    }
    return null;
}

function searchForNodeInfo(tree, node, level) {
    if(!level) level = 0;
    try {
        var i;
        if(typeof(node[0]) === "object") {
            for(var role of node[0]) {
                if (tree[role] != null) {
                    if (tree[role] === true || tree[role] === false) {
                        return {found: tree[role], level: level};
                    }
                    i = searchForNodeInfo(tree[role], node.slice(1), level+1);
                    if (i.found === true || i.found === false) {
                        return i;
                    }
                }
            }
            i = tree["*"];
            if (i === true || i === false) {
                return {found: i, level: level};
            }
        }
        else if (tree.hasOwnProperty(node[0])) {
            if (tree[node[0]] === true || tree[node[0]] === false) {
                return {found: tree[node[0]], level: level};
            }
            i = searchForNodeInfo(tree[node[0]], node.slice(1), level+1);
            if (i.found === true || i.found === false) {
                return i;
            }
        }
        i = tree["*"];
        if (i === true || i === false) {
            return {found: i, level: level};
        }
        else {
            if(tree["*"]) {
                i = searchForNodeInfo(tree["*"], node.slice(1), level);
                if (i.found === true || i.found === false) {
                    return i;
                }
            }
        }
    } catch (e) {
        console.error(e);
        console.error(e.stack);
        return false;
    }
    return {found: null};
}

module.exports = Permissions;