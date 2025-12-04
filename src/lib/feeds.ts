/**
 * Created by macdja38 on 2016-09-01.
 */
"use strict";

import ConfigDB from "./ConfigDB";
import Eris from "eris";

import merge from "deepmerge";

import { EventEmitter } from "events";

/**
 * Manages feeds including storing / retrieving feed data
 * @class Feeds
 * @extends EventEmitter
 */
class Feeds extends EventEmitter {
  private _client: Eris.Client;
  private _configDB: ConfigDB;

  /**
   * Feeds database, uses a configDB as a base and has helped methods for manipulating it as a feed
   * @constructor
   * @param {Eris} client Eris Client
   * @param {ConfigDB} configDB ConfigDB Instance setup with guild configs for the servers feeds operate on.
   */
  constructor({ client, configDB }: { client: Eris.Client, configDB: ConfigDB }) {
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
  set(adding: boolean, node: string, channelId: string, serverId: string) {
    let feedsData = this._configDB.get("feeds", {}, { server: serverId });
    let nodeParts = node.split(".");
    if (adding) {
      //let newFeedsData = addId(feedsData, nodeParts, channelId);
      let node = buildNode(nodeParts, channelId);
      console.log(feedsData);
      console.log(node);
      let newFeedsData = merge(feedsData, node);
      this._configDB.set("feeds", newFeedsData, { server: serverId })
    } else {
      //let newFeedsData = addId(feedsData, nodeParts, channelId);
      let newFeedsData = removeNode(feedsData, nodeParts, channelId);
      this._configDB.set("feeds", newFeedsData, { server: serverId, conflict: "replace" })
    }
  }

  /**
   * Finds a feed
   * @param {string} node Feed node to check
   * @param {string} serverId Id of the Guild to check for.
   * @returns {Array<string>} returns an array of channel IDs containing that feed node.
   */
  find(node: string, serverId: string): string[] {
    if (serverId) {
      const feedsData = this._configDB.get("feeds", {}, { server: serverId });
      return findNode(feedsData, node.split("."))
    } else {
      const array: string[] = [];
      for (const serverIdentifier in this._configDB.data) {
        if (this._configDB.data.hasOwnProperty(serverIdentifier)) {
          const server = this._configDB.data[serverIdentifier];
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
  list(guildID: string) {
    return this._configDB.get(guildID)
  }

}

type Node = {
  [key: string]: Node;
} | [string]

/**
 * Recursively builds a single feed node
 * @param {Array<string>} nodes Nodes that comprise the tree to the Array
 * @param {string} value Value to place at the end of the tree
 * @returns {Object | Array<string>}
 * @private
 */
function buildNode(nodes: string[], value: string): Node {
  if (nodes.length === 0) return [value];
  let key = nodes.shift() as string;
  return { [key]: buildNode(nodes, value) };
}

/**
 * Recursively remove a node from a tree and remove all empty trees leading to it.
 * @param {Object} data Raw feed Tree
 * @param {Array<string>} nodes Nodes leading up to location to remove value from
 * @param {string} value Value to remove from the node
 * @returns {*}
 * @private
 */
function removeNode(data: any, nodes: string[], value: string) {
  if (nodes.length > 0) {
    let node = nodes.shift() as string;
    if (data.hasOwnProperty(node)) {
      data[node] = removeNode(data[node], nodes, value);
      if (Object.keys(data[node]).length < 1) {
        delete data[node];
      }
    }
  } else if (Array.isArray(data)) {
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
 * @private
 */
function findNode(data: any, nodes: string[], array: string[] = []) {
  if (Array.isArray(data)) {
    data.forEach(id => push(array, id))
  } else if (nodes.length > 0) {
    let node = nodes.slice(0, 1)[0];
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
function push(array: string[], id: string) {
  if (array.indexOf(id) < 0) {
    array.push(id);
  }
}

export default Feeds;
