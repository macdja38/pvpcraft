/**
 * Created by macdja38 on 2016-04-17.
 */

"use strict";

import ConfigDB from "./ConfigDB";
import Eris, {
  Channel,
  Collection,
  Guild,
  GuildChannel,
  Member,
  Message,
  Role,
  Textable,
  TextableChannel,
  TextChannel,
  User,
} from "eris";
import { ErisError } from "../types/eris";
import Command from "./Command/Command";
import { isGuildChannel } from "../types/utils";
import chalk from "chalk";
import { translateType } from "../types/translate";
import { PvPInteractiveCommand } from "./Command/PvPCraftCommandHelper";

const util = require('util');
const colors = require('colors');
const Analytics = require('./Analytics')

type explodedNode = (string | string[])[];

/**
 * Permissions class
 * @prop {ConfigDB} permsDB
 * @type {Permissions}
 */
class Permissions {
  private _analytics: typeof Analytics;
  private perms: ConfigDB;
  private translate: (channelID: string, guildId?: string) => translateType;

  /**
   *
   * @param {ConfigDB} permsDB
   * @param analytics
   * @param translate
   */
  constructor(permsDB: ConfigDB, analytics: typeof Analytics, translate: Permissions["translate"]) {
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
  set(node: string, mode: "remov" | "allow" | "deny", options: { write: boolean } = { write: true }) {
    let value: null | boolean;
    if (mode === "remov") value = null;
    else if (mode === "allow") value = true;
    else if (mode === "deny") value = false;
    else throw new Error("Invalid Mode");
    let nodeArray = node.split(".");
    let key = nodeArray.shift() as string;
    let serverData = this.perms.get(key, {});
    let pointt = recursiveAdd(serverData, nodeArray, value);
    //console.log(util.inspect(recursiveAdd(serverData, node, value),{showHidden: false, depth: null}));
    console.log(chalk.red("changing perms now"));
    return this.perms.set(null, pointt, { server: key, conflict: "replace", write: options.write });
  };

  checkAdminServer(msg: Message) {
    return msg?.member?.permission.has("administrator") || false;
  };

  /**
   *
   * @param {Message} msg
   * @returns {function(*)}
   */
  getAutoDeny(msg: Message) {
    return (error: ErisError) => {
      if (error.code === 50013) {
        let channel = msg.channel;
        if (!isGuildChannel(channel)) throw error;
        let guild = channel.guild;
        this.set(`${guild.id}.${channel.id}`, "remov", { write: false });
        this.set(`${guild.id}.${channel.id}.*`, "deny", { write: true });
        let owner = guild.members.get(guild.ownerID);
        if (owner) {
          owner.user.getDMChannel().then((channel: TextableChannel) =>
            channel.createMessage(this.translate(channel.id)`Hello, I've removed and denied the permissions configuration for channel ${
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
  genCheckCommand(node: string, options?: object) {
    return (command: Command) => this.check(command, node, options);
  }

  /**
   * Checks for user permissions based on a message
   * @param {Message|Command} msg Eris Message to check
   * @param {string} node permission node to check, for example `"music.*"`
   * @param {Object} [options] Check options, all options are optional.
   * @param {string} [options.type="boolean"] the type of value to look for, this defaults to boolean but any result of `typeof variable` should be valid
   * @returns {boolean|*} returns boolean by default, if options.type is specified it will return false if not found, or a value with the type specified.
   */
  check(msg: Message | Command | PvPInteractiveCommand, node: string, options: { type?: string } = {}) {
    let author: Eris.User | Eris.Member;

    if ("respond" in msg) {
      author = msg.member;
    } else {
      author = msg.author;
    }

    this._analytics.record(author, node);
    let nodeArray;
    if (isGuildChannel(msg.channel) && msg.member) {
      nodeArray = [msg.channel.guild.id, msg.channel.id, getOrderedGroups(msg.channel.guild.roles, msg.member.roles, author.id)].concat(node.split("."));
    } else {
      nodeArray = ["global", "global", "u" + author.id].concat(node.split("."));
    }
    if (this.perms.data) {
      let i;
      if (options.hasOwnProperty("type") && options.type !== undefined) {
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
  checkUserChannel(user: { id: string }, channel: GuildChannel, node: string): boolean {
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
  checkUserGuild(user: User | Member, guild: Guild, node: string) {
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
  checkChannel(channel: Channel | GuildChannel, node: string) {
    let nodeArray;
    if (isGuildChannel(channel)) {
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
  checkInfo(msg: Message, node: string) {
    let nodeArray;
    if (isGuildChannel(msg.channel)) {
      const guild = msg.channel.guild;

      nodeArray = [guild.id, msg.channel.id, getOrderedGroups(guild.roles, msg.member ? msg.member.roles : [], msg.author.id)].concat(node.split("."));
    } else {
      nodeArray = ["global", "global", "u" + msg.author.id].concat(node.split("."));
    }
    //console.log(node);
    if (this.perms.data) {
      let i = searchForNodeInfo(this.perms.data, nodeArray, 0);
      if (i.found === true) {
        return i;
      }
    }
    return { found: false }
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
function recursiveAdd(data: PermissionsTree | PermissionsTreeValue, node: string[], value: PermissionsTreeValue | null): PermissionsTree | PermissionsTreeValue | null {
  let key: string;
  if (node.length > 0) {
    key = node.slice(0, 1)[0];
    node = node.slice(1);
  } else {
    return value;
  }
  if (data && typeof data === "object" && data.hasOwnProperty(key)) {
    let mergedNodes = recursiveAdd(data[key], node, value);
    if (mergedNodes === null || (typeof (mergedNodes) === "object" && Object.keys(mergedNodes).length === 0)) {
      let result = Object.assign({}, data);
      delete result[key];
      return result;
    } else {
      return Object.assign(data, { [key]: mergedNodes });
    }
  } else {
    if (value !== null && data !== null) {
      if (data === true || data === false || typeof (data) === "string") {
        return { [key]: buildNode(node, value) };
      }
      return Object.assign(data, { [key]: buildNode(node, value) });
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
function buildNode(nodes: string[], value: PermissionsTreeValue): PermissionsTree | PermissionsTreeValue {
  if (nodes.length === 0) return value;
  let key = nodes.splice(0, 1)[0];
  return { [key]: buildNode(nodes, value) };
}

/**
 * Get ordered role ID list
 * @param {Role[]} roles eris role objects for the guild
 * @param {string[]} roleIDs reagent role ids
 * @param {string} userId of user to add to role array
 * @private
 * @returns {string[]} ordered list of userId / role Ids
 */
function getOrderedGroups(roles: Collection<Role>, roleIDs: string[], userId: string) {
  const filteredRoles = roles.filter(r => roleIDs.includes(r.id));
  let array = filteredRoles.sort((r1, r2) => {
    if (r1.position !== r2.position) {
      return r2.position - r1.position;
    }
    // @ts-ignore
    return r1.id - r2.id
  }).map(r => `g${r.id}`);
  if (userId) {
    array.unshift(`u${userId}`);
  }
  return array;
}

type PermissionsTreeValue = boolean | number | string;

type PermissionsTree = {
  [keyof: string]: PermissionsTree | PermissionsTreeValue;
}

type PermissionsTreeRoot = {
  id: string;
  [keyof: string]: PermissionsTree | PermissionsTreeValue;
}


/**
 * Finds a node
 * @param {Object} tree data to search
 * @param {string[]} node
 * @private
 * @returns {*}
 */
function searchForNode(tree: PermissionsTree, node: explodedNode): boolean | null {
  try {
    let i;
    let nodeFirst = node[0];
    if (Array.isArray(nodeFirst)) {
      for (let role of nodeFirst) {
        let treeRole = tree[role];
        if (treeRole != null) {
          if (treeRole === true || treeRole === false) {
            return treeRole;
          }
          // @ts-ignore
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
    } else if (tree.hasOwnProperty(nodeFirst)) {
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
    } else {
      if (i) {
        // @ts-ignore
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
function searchForNodeOfType(tree: any, node: explodedNode, type: string): boolean | null | any {
  try {
    let i;
    let nodeFirst = node[0];
    if (typeof (nodeFirst) === "object") {
      for (let role of nodeFirst) {
        let treeRole = tree[role];
        if (treeRole != null) {
          if (typeof (treeRole) === type) {
            return treeRole;
          }
          i = searchForNodeOfType(treeRole, node.slice(1), type);
          if (typeof (i) === type) {
            return i;
          }
        }
      }
      i = tree["*"];
      if (i === true || i === false) {
        return i;
      }
    } else if (tree.hasOwnProperty(nodeFirst)) {
      i = tree[nodeFirst];
      if (typeof (i) === type) {
        return i;
      }
      i = searchForNodeOfType(i, node.slice(1), type);
      if (typeof (i) === type) {
        return i;
      }
    }
    i = tree["*"];
    if (typeof (i) === type) {
      return i;
    } else {
      if (i) {
        i = searchForNodeOfType(i, node.slice(1), type);
        if (typeof (i) === type) {
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
function searchForNodeInfo(tree: any, node: explodedNode, level: number): { found: any, level?: number } {
  if (!level) level = 0;
  try {
    let i;
    if (typeof (node[0]) === "object") {
      for (let role of node[0]) {
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
    } else if (tree.hasOwnProperty(node[0])) {
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
    } else {
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
    // TODO: Handle Error
    return { found: false };
  }
  return { found: null };
}

/* test-code */
export const testExports = {
  _searchForNode: searchForNode,
  _searchForNodeInfo: searchForNodeInfo,
  _searchForNodeOfType: searchForNodeOfType,
  _getOrderedGroups: getOrderedGroups,
  _buildNode: buildNode,
  _recursiveAdd: recursiveAdd,
}
/* end-test-code */

export default Permissions;
