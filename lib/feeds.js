/**
 * Created by macdja38 on 2016-09-01.
 */
"use strict";

let merge = require('deepmerge');

let {EventEmitter} = require("events");

class Feeds extends EventEmitter {
  /**
   * Feeds database, uses a configDB as a base and has helped methods for manipulating it as a feed
   * @constructor
   * @param {Client} client Eris Client
   * @param {ConfigDB} configDB ConfigDB Instance setup with guild configs for the servers feeds operate on.
   */
  constructor({client, configDB}) {
    super();
    this._client = client;
    this._configDB = configDB;
  }

  /**
   * Set's a feed node
   * @param {boolean} adding Adding or removing the node from the feed.
   * @param {string} node Feed node to add or remove
   * @param {string} channelId Channel id to apply the feed to
   * @param {string} serverId Guild it to apply the feed change to.
   */
  set(adding, node, channelId, serverId) {
    let feedsData = this._configDB.get("feeds", {}, {server: serverId});
    let nodeParts = node.split(".");
    if (adding) {
      //let newFeedsData = addId(feedsData, nodeParts, channelId);
      let node = buildNode(nodeParts, channelId);
      console.log(feedsData);
      console.log(node);
      let newFeedsData = merge(feedsData, node);
      this._configDB.set("feeds", newFeedsData, {server: serverId})
    } else {
      //let newFeedsData = addId(feedsData, nodeParts, channelId);
      let newFeedsData = removeNode(feedsData, nodeParts, channelId);
      this._configDB.set("feeds", newFeedsData, {server: serverId, conflict: "replace"})
    }
  }

  /**
   * Finds a feed
   * @param {string} node Feed node to check
   * @param {string} serverId Id of the Guild to check for.
   * @returns {Array<string>} returns an array of channel IDs containing that feed node.
   */
  find(node, serverId) {
    if (serverId) {
      let feedsData = this._configDB.get("feeds", {}, {server: serverId});
      return findNode(feedsData, node.split("."))
    } else {
      let array = [];
      for (let serverIdentifier in this._configDB.data) {
        if (this._configDB.data.hasOwnProperty(serverIdentifier)) {
          let server = this._configDB.data[serverIdentifier];
          if (server.hasOwnProperty("feeds")) {
            findNode(server["feeds"], node.split("."), array);
          }
        }
      }
      return array;
    }
  }

  /**
   * Fetches a list for a specific guild
   * @param {string} guildID Id of the guild to check for.
   * @returns {Object|Array|null}
   */
  list(guildID) {
    return this._configDB.get(guildID)
  }

}

/**
 * Recursively builds a single feed node
 * @param {Array<string>} nodes Nodes that comprise the tree to the Array
 * @param {Array<string>} value Value to place at the end of the tree
 * @private
 * @returns {Object | Array<string>}
 */
function buildNode(nodes, value) {
  if (nodes.length == 0) return [value];
  let key = nodes.shift();
  return {[key]: buildNode(nodes, value)};
}

/**
 * Recursively remove a node from a tree and remove all empty trees leading to it.
 * @param {Object} data Raw feed Tree
 * @param {Array<string>} nodes Nodes leading up to location to remove value from
 * @param {string} value Value to remove from the node
 * @private
 * @returns {*}
 */
function removeNode(data, nodes, value) {
  if (nodes.length > 0) {
    let node = nodes.shift();
    if (data.hasOwnProperty(node)) {
      data[node] = removeNode(data[node], nodes, value);
      if (Object.keys(data[node]).length < 1) {
        delete data[node];
      }
    }
  }
  else if (Array.isArray(data)) {
    let index = data.indexOf(value);
    if (index > -1) {
      data.splice(index, 1);
    }
  }
  return data;
}

/**
 * Locates all channel ids that a feed points to
 * @param {Object} data raw feed data
 * @param {Array<string>} nodes Nodes to search
 * @param {Array<string>} array Array to add ids to
 * @returns {Array<string>} Array of channel ids feed node points to
 */
function findNode(data, nodes, array = []) {
  if (Array.isArray(data)) {
    data.forEach(id => push(array, id))
  } else if (nodes.length > 0) {
    let node = nodes.slice(0, 1);
    nodes = nodes.slice(1);
    if (data.hasOwnProperty(node)) {
      findNode(data[node], nodes, array);
    }
    if (data.hasOwnProperty("*")) {
      findNode(data["*"], nodes, array);
    }
  }
  return array;
}

/**
 * Adds an id to an array only if the id is not already present in the array
 * @param {Array<string>} array Array to modify
 * @param {string} id Id to append to array
 * @private
 */
function push(array, id) {
  if (array.indexOf(id) < 0) {
    array.push(id);
  }
}

module.exports = Feeds;