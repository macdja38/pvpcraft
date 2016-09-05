/**
 * Created by macdja38 on 2016-09-01.
 */

var merge = require('deepmerge');

var {EventEmitter} = require("events");

module.exports = class feeds extends EventEmitter {
  constructor({client, configDB}) {
    super();
    this._client = client;
    this._configDB = configDB;
  }

  set(adding, node, channelId, serverId) {
    let feedsData = this._configDB.get("feeds", {}, {server: serverId});
    let nodeParts = node.split(".");
    if (adding) {
      //let newFeedsData = addId(feedsData, nodeParts, channelId);
      let newFeedsData = merge(feedsData, buildNode(nodeParts, channelId));
      console.log(newFeedsData);
      this._configDB.set("feeds", newFeedsData, {server: serverId})
    } else {
      //let newFeedsData = addId(feedsData, nodeParts, channelId);
      let newFeedsData = removeNode(feedsData, nodeParts, channelId);
      console.log(newFeedsData);
      this._configDB.set("feeds", newFeedsData, {server: serverId, conflict: "replace"})
    }
  }

  find(node, serverId) {
    if (serverId) {
      let feedsData = this._configDB.get("feeds", {}, {server: serverId});
      console.log(findNode(feedsData, node.split(".")));
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
      console.log(array);
      return array;
    }
  }

};

function buildNode(nodes, value) {
  if (nodes.length == 0) return [value];
  var key = nodes.shift();
  return {[key]: buildNode(nodes, value)};
}

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

function findNode(data, nodes, array = []) {
  console.log(nodes.length);
  console.log(nodes);
  if (Array.isArray(data)) {
    data.forEach(id => push(array, id))
  } else if (nodes.length > 0) {
    let node = nodes.slice(0, 1);
    nodes = nodes.slice(1);
    console.log(nodes);
    if (data.hasOwnProperty(node)) {
      findNode(data[node], nodes, array);
    }
    if (data.hasOwnProperty("*")) {
      findNode(data["*"], nodes, array);
    }
  }
  return array;
}

function push(array, id) {
  if (array.indexOf(id) < 0) {
    array.push(id);
  }
}