/**
 * Created by macdja38 on 2016-04-17.
 */
"use strict";
/**"server id": {
    "global": {
        "perm": false
    },
    "channels": {
        "channel_id": {
            "perm": true
        }
    }
}
 */
/** all lower case, subnode * is a wild card.*/

var path = require("path");

var util = require('util');

var colors = require('colors');

module.exports = class permissions {
  constructor(permsDB, analytics) {
    this.perms = permsDB;
    this._analytics = analytics;
  }

  getCommands() {
    return ["set", "remove", "list"];
  };

  set(node, value, options = {}) {
    if (value == "remov") value = null;
    if (value == "allow") value = true;
    if (value == "deny") value = false;
    node = node.split(".");
    var key = node.shift();
    var serverData = this.perms.get(key, {});
    var pointt = recursiveAdd(serverData, node, value);
    //console.log(util.inspect(recursiveAdd(serverData, node, value),{showHidden: false, depth: null}));
    console.log("changing perms now".red);
    return this.perms.set(null, pointt, { server: key, conflict: "replace", write: options.write });
  };

  checkManageRolesChannel(user, channel) {
    return channel.permissionsOf(user).hasPermission("manageRoles")
  };

  checkManageRolesServer(user, server) {
    if (server.owner.id === user.id) {
      return true;
    }
    for (let role of server.rolesOf(user)) {
      if (role.hasPermission("manageRoles")) {
        return true;
      }
    }
    return false;
  };

  getAutoDeny(msg, node) {
    return (error) => {
      if (error.message === "Forbidden") {
        this.set(`${msg.server.id}.${msg.channel.id}`, "remov", {write: false});
        this.set(`${msg.server.id}.${msg.channel.id}.*`, "deny", {write: true});
        msg.server.owner.send(`Hello, I've removed and denied the permissions configuration for channel ` +
          `${msg.channel} on ${msg.server.name} as I didn't have permissions to send messages in that channel. ` +
          `Please use /perms list on that server to see the new configuration.`);
      } else {
        return error;
      }
    }
  }

  check(msg, node, options={}) {
    this._analytics.record(msg.author, node);
    if (msg.channel.server) {
      node = [msg.channel.server.id, msg.channel.id, getOrderedGroups(msg.channel.server.rolesOf(msg.author), msg.author.id)].concat(node.split("."));
    }
    else {
      node = ["global", "global", "u" + msg.author.id].concat(node.split("."));
    }
    if (this.perms.data) {
      var i;
      if(options.hasOwnProperty("type")) {
        i = searchForNodeOfType(this.perms.data, node, options.type);
        if (i !== false && i !== null) {
          return i;
        }
      } else {
        i = searchForNode(this.perms.data, node);
        if (i === true) {
          return true;
        }
      }
    }
    return false;
  };

  checkUserChannel(user, channel, node) {
    if (channel.server) {
      node = [channel.server.id, channel.id, getOrderedGroups(channel.server.rolesOf(user), user.id)].concat(node.split("."));
    } else {
      node = ["global", "global", "u" + user.id].concat(node.split("."));
    }
    if (this.perms.data) {
      let i = searchForNode(this.perms.data, node);
      if (i === true) {
        return true;
      }
    }
    return false;
  }

  checkInfo(msg, node) {
    if (msg.channel.server) {
      node = [msg.channel.server.id, msg.channel.id, getOrderedGroups(msg.channel.server.rolesOf(msg.author), msg.author.id)].concat(node.split("."));
    }
    else {
      node = ["global", "global", "u" + msg.author.id].concat(node.split("."));
    }
    //console.log(node);
    if (this.perms.data) {
      var i = searchForNodeInfo(this.perms.data, node, 0);
      if (i.found === true) {
        return i;
      }
    }
    return { found: false }
  };
};

function recursiveAdd(data, node, value) {
  if (node.length > 0) {
    var key = node.shift();
  }
  else {
    return value;
  }
  if (data && data.hasOwnProperty(key)) {
    let mergedNodes = recursiveAdd(data[key], node, value);
    if(mergedNodes === null || (typeof(mergedNodes) === "object" && Object.keys(mergedNodes).length === 0)) {
      delete data[key];
    } else {
      data[key] = mergedNodes;
    }
    return data;
  }
  else {
    if(value !== null && data !== null) {
      if (data === true || data === false || typeof(data) === "string") {
        return {[key]: buildNode(node, value)};
      }
      data[key] = buildNode(node, value);
    }
    return data;
  }
}

function buildNode(nodes, value) {
  if (nodes.length === 0) return value;
  var key = nodes.splice(0, 1)[0];
  return { [key]: buildNode(nodes, value) };
}

function getOrderedGroups(roles, userId) {
  let array = roles.sort((r1, r2) => {
    if(r1.position != r2.position) {
      return r2.position - r1.position;
    }
    return r1.id-r2.id
  }).map(r => `g${r.id}`);
  if(userId) {
    array.unshift(`u${userId}`);
  }
  return array;
}

function searchForNode(tree, node) {
  try {
    var i;
    let nodeFirst = node[0];
    if (typeof(nodeFirst) === "object") {
      for (var role of nodeFirst) {
        let treeRole = tree[role];
        if (treeRole != null) {
          if (treeRole === true || treeRole === false) {
            return treeRole;
          }
          i = searchForNode(treeRole, node.slice(1));
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
    else if (tree.hasOwnProperty(nodeFirst)) {
      i = tree[nodeFirst];
      if (i === true || i === false) {
        return i;
      }
      if (typeof i === "object") {
        i = searchForNode(i, node.slice(1));
        if (i === true || i === false) {
          return i;
        }
      }
    }
    i = tree["*"];
    if (i === true || i === false) {
      return i;
    }
    else {
      if (i) {
        i = searchForNode(i, node.slice(1));
        if (i === true || i === false) {
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

function searchForNodeOfType(tree, node, type) {
  try {
    let i;
    let nodeFirst = node[0];
    if (typeof(nodeFirst) === "object") {
      for (let role of nodeFirst) {
        let treeRole = tree[role];
        if (treeRole != null) {
          if (typeof(treeRole) === type) {
            return treeRole;
          }
          i = searchForNodeOfType(treeRole, node.slice(1), type);
          if (typeof(i) === type) {
            return i;
          }
        }
      }
      i = tree["*"];
      if (i == true || i == false) {
        return i;
      }
    }
    else if (tree.hasOwnProperty(nodeFirst)) {
      i = tree[nodeFirst];
      if (typeof(i) === type) {
        return i;
      }
      i = searchForNodeOfType(i, node.slice(1), type);
      if (typeof(i) === type) {
        return i;
      }
    }
    i = tree["*"];
    if (typeof(i) === type) {
      return i;
    }
    else {
      if (i) {
        i = searchForNodeOfType(i, node.slice(1), type);
        if (typeof(i) === type) {
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
  if (!level) level = 0;
  try {
    var i;
    if (typeof(node[0]) === "object") {
      for (var role of node[0]) {
        if (tree[role] != null) {
          if (tree[role] === true || tree[role] === false) {
            return { found: tree[role], level: level };
          }
          i = searchForNodeInfo(tree[role], node.slice(1), level + 1);
          if (i.found === true || i.found === false) {
            return i;
          }
        }
      }
      i = tree["*"];
      if (i === true || i === false) {
        return { found: i, level: level };
      }
    }
    else if (tree.hasOwnProperty(node[0])) {
      if (tree[node[0]] === true || tree[node[0]] === false) {
        return { found: tree[node[0]], level: level };
      }
      i = searchForNodeInfo(tree[node[0]], node.slice(1), level + 1);
      if (i.found === true || i.found === false) {
        return i;
      }
    }
    i = tree["*"];
    if (i === true || i === false) {
      return { found: i, level: level };
    }
    else {
      if (tree["*"]) {
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
  return { found: null };
}