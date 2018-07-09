/**
 * Created by macdja38 on 2016-04-17.
 */
"use strict";

const util = require('util');
const colors = require('colors');

/**
 * Permissions class
 * @prop {ConfigDB} permsDB
 * @type {Permissions}
 */
class Permissions {
  /**
   *
   * @param {ConfigDB} permsDB
   * @param analytics
   * @param translate
   */
  constructor(permsDB, analytics, translate) {
    this.perms = permsDB;
    this._analytics = analytics;
    this.translate = translate;
  }

  getCommands() {
    return ["set", "remove", "list"];
  };


  /**
   * Sets a permission node
   * @param {string} node
   * @param {string} mode
   * @param {Object} [options]
   * @param {boolean} [options.write]
   * @returns {*}
   */
  set(node, mode, options = {}) {
    let value;
    if (mode === "remov") value = null;
    else if (mode === "allow") value = true;
    else if (mode === "deny") value = false;
    else value = mode;
    let nodeArray = node.split(".");
    let key = nodeArray.shift();
    let serverData = this.perms.get(key, {});
    let pointt = recursiveAdd(serverData, nodeArray, value);
    //console.log(util.inspect(recursiveAdd(serverData, node, value),{showHidden: false, depth: null}));
    console.log("changing perms now".red);
    return this.perms.set(null, pointt, {server: key, conflict: "replace", write: options.write});
  };

  checkAdminServer(msg) {
    return msg.member.permission.has("administrator");
  };

  /**
   *
   * @param {Message} msg
   * @returns {function(*)}
   */
  getAutoDeny(msg) {
    return (error) => {
      if (JSON.parse(error.response).code === 50013) {
        let channel = msg.channel;
        let guild = channel.guild;
        if (!guild) throw error;
        this.set(`${guild.id}.${channel.id}`, "remov", {write: false});
        this.set(`${guild.id}.${channel.id}.*`, "deny", {write: true});
        let owner = guild.members.get(guild.ownerID);
        if (owner) {
          owner.user.getDMChannel().then(channel =>
            channel.createMessage(this.translate(channel.id) `Hello, I've removed and denied the permissions configuration for channel ${
              msg.channel.mention} on ${guild.name} as I didn't have permissions to send messages in that channel. \
Please use /perms list on that server to see the new configuration.`),
          );
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Returns a function that when supplied with only a command object will check permissions.
   * @param node
   * @param options
   * @returns {function(*=)}
   */
  genCheckCommand(node, options) {
    return command => this.check(command, node, options);
  }

  /**
   * Checks for user permissions based on a message
   * @param {Message|Command} msg Eris Message to check
   * @param {string} node permission node to check, for example `"music.*"`
   * @param {Object} [options] Check options, all options are optional.
   * @param {string} [options.type="boolean"] the type of value to look for, this defaults to boolean but any result of `typeof variable` should be valid
   * @returns {boolean|*} returns boolean by default, if options.type is specified it will return false if not found, or a value with the type specified.
   */
  check(msg, node, options = {}) {
    this._analytics.record(msg.author, node);
    let nodeArray;
    if (msg.channel.guild && msg.member) {
      nodeArray = [msg.channel.guild.id, msg.channel.id, getOrderedGroups(msg.channel.guild.roles, msg.member.roles, msg.author.id)].concat(node.split("."));
    }
    else {
      nodeArray = ["global", "global", "u" + msg.author.id].concat(node.split("."));
    }
    if (this.perms.data) {
      let i;
      if (options.hasOwnProperty("type")) {
        i = searchForNodeOfType(this.perms.data, nodeArray, options.type);
        if (i !== false && i !== null) {
          return i;
        }
      } else {
        i = searchForNode(this.perms.data, nodeArray);
        if (i === true) {
          return true;
        }
      }
    }
    return false;
  };

  /**
   * Checks for user permissions based on a user/member and channel
   * @param {User | Member} user User object to use in permissions search.
   * @param {GuildChannel} channel Channel to check for permissions in.
   * @param {string} node permission node to check, for example `"music.*"`
   * @returns {boolean} returns True if the user has the permission, false if not.
   */
  checkUserChannel(user, channel, node) {
    let nodeArray;
    if (channel.guild) {
      let member = channel.guild.members.get(user.id);
      if (!member) return false;
      nodeArray = [channel.guild.id, channel.id, getOrderedGroups(channel.guild.roles, member.roles, user.id)].concat(node.split("."));
    } else {
      nodeArray = ["global", "global", "u" + user.id].concat(node.split("."));
    }
    if (this.perms.data) {
      let i = searchForNode(this.perms.data, nodeArray);
      if (i === true) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks for user permissions based on a user/member and guild
   * @param {User | Member} user User object to use in permissions search.
   * @param {Guild} guild Channel to check for permissions in.
   * @param {string} node permission node to check, for example `"music.*"`
   * @returns {boolean} returns True if the user has the permission, false if not.
   */
  checkUserGuild(user, guild, node) {
    const member = guild.members.get(user.id);
    if (!member) return false;
    const nodeArray = [guild.id, "*", getOrderedGroups(guild.roles, member.roles, user.id)].concat(node.split("."));
    if (this.perms.data) {
      let i = searchForNode(this.perms.data, nodeArray);
      if (i === true) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks for user permissions based on a user/member and guild
   * @param {Channel} channel Channel to check for permissions in.
   * @param {string} node permission node to check, for example `"music.*"`
   * @returns {boolean} returns True if the user has the permission, false if not.
   */
  checkChannel(channel, node) {
    let nodeArray;
    if (channel.guild) {
      nodeArray = [channel.guild.id, channel.id, "*"].concat(node.split("."));
    } else {
      nodeArray = ["global", "global", "*"].concat(node.split("."));
    }
    if (this.perms.data) {
      let i = searchForNode(this.perms.data, nodeArray);
      if (i === true) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks info pertaining to a node, not currently used
   * @param {Message} msg Eris message to check for
   * @param {string} node Permission node to check
   * @returns {*}
   */
  checkInfo(msg, node) {
    let nodeArray;
    if (msg.channel.server) {
      nodeArray = [msg.channel.server.id, msg.channel.id, getOrderedGroups(msg.channel.guild.roles, msg.member.roles, msg.author.id)].concat(node.split("."));
    }
    else {
      nodeArray = ["global", "global", "u" + msg.author.id].concat(node.split("."));
    }
    //console.log(node);
    if (this.perms.data) {
      let i = searchForNodeInfo(this.perms.data, nodeArray, 0);
      if (i.found === true) {
        return i;
      }
    }
    return {found: false}
  };
}

/**
 * Recursively adds a node to the permission tree
 * @param {Object} data data currently being processed
 * @param {string[]} node
 * @param {*} value value to place at that node
 * @private
 * @returns {*}
 */
function recursiveAdd(data, node, value) {
  let key;
  if (node.length > 0) {
    key = node.slice(0, 1);
    node = node.slice(1);
  }
  else {
    return value;
  }
  if (data && data.hasOwnProperty(key)) {
    let mergedNodes = recursiveAdd(data[key], node, value);
    if (mergedNodes === null || (typeof(mergedNodes) === "object" && Object.keys(mergedNodes).length === 0)) {
      let result = Object.assign({}, data);
      delete result[key];
      return result;
    } else {
      return Object.assign(data, {[key]: mergedNodes});
    }
  }
  else {
    if (value !== null && data !== null) {
      if (data === true || data === false || typeof(data) === "string") {
        return {[key]: buildNode(node, value)};
      }
      return Object.assign(data, {[key]: buildNode(node, value)});
    }
    return data;
  }
}

/**
 * Builds a node
 * @param {string[]} nodes
 * @param {*} value
 * @private
 * @returns {Object}
 */
function buildNode(nodes, value) {
  if (nodes.length === 0) return value;
  let key = nodes.splice(0, 1)[0];
  return {[key]: buildNode(nodes, value)};
}

/**
 * Get ordered role ID list
 * @param {Role[]} roles eris role objects for the guild
 * @param {string[]} roleIDs reagent role ids
 * @param {string} userId of user to add to role array
 * @private
 * @returns {string[]} ordered list of userId / role Ids
 */
function getOrderedGroups(roles, roleIDs, userId) {
  roles = roles.filter(r => roleIDs.includes(r.id));
  let array = roles.sort((r1, r2) => {
    if (r1.position !== r2.position) {
      return r2.position - r1.position;
    }
    return r1.id - r2.id
  }).map(r => `g${r.id}`);
  if (userId) {
    array.unshift(`u${userId}`);
  }
  return array;
}

/**
 * Finds a node
 * @param {Object} tree data to search
 * @param {string[]} node
 * @private
 * @returns {*}
 */
function searchForNode(tree, node) {
  try {
    let i;
    let nodeFirst = node[0];
    if (typeof(nodeFirst) === "object") {
      for (let role of nodeFirst) {
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
      if (i === true || i === false) {
        return i;
      }
    }
    else if (tree.hasOwnProperty(nodeFirst)) {
      i = tree[nodeFirst];
      if (i === true || i === false) {
        return i;
      }
      if (typeof i === "object" && i != null) {
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

/**
 * Searches for a node of a specific type
 * @param {Object} tree
 * @param {string[]} node
 * @param {string} type
 * @private
 * @returns {*}
 */
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
      if (i === true || i === false) {
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

/**
 * Searches for info on a node, not currently used
 * @param {Object} tree data to search
 * @param {string[]} node
 * @param {number} level
 * @private
 * @returns {*}
 */
function searchForNodeInfo(tree, node, level) {
  if (!level) level = 0;
  try {
    let i;
    if (typeof(node[0]) === "object") {
      for (let role of node[0]) {
        if (tree[role] != null) {
          if (tree[role] === true || tree[role] === false) {
            return {found: tree[role], level: level};
          }
          i = searchForNodeInfo(tree[role], node.slice(1), level + 1);
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
      i = searchForNodeInfo(tree[node[0]], node.slice(1), level + 1);
      if (i.found === true || i.found === false) {
        return i;
      }
    }
    i = tree["*"];
    if (i === true || i === false) {
      return {found: i, level: level};
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
  return {found: null};
}

/* test-code */
Permissions._searchForNode = searchForNode;
Permissions._searchForNodeInfo = searchForNodeInfo;
Permissions._searchForNodeOfType = searchForNodeOfType;
Permissions._getOrderedGroups = getOrderedGroups;
Permissions._buildNode = buildNode;
Permissions._recursiveAdd = recursiveAdd;
/* end-test-code */

module.exports = Permissions;