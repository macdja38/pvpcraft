/**
 * Created by macdja38 on 2016-11-16.
 */

let ua = require('universal-analytics');

module.exports = class analytics {
  constructor(trackingId) {
    this._trackingId = trackingId;
    this._userMap = new WeakMap([]);
  }

  addClient(client) {
    let firstInit = false;
    if (!this._client) {
      firstInit = true;
    }
    this._client = client;
    if (firstInit) {
      firstInit(this._client);
    }
  }

  record(user, node, ...args) {
    if (!this._trackingId) return;
    let visitor;
    if (typeof user === "object" && user.hasOwnProperty("id")) {
      if (!this._userMap.has(user)) {
        visitor = ua(this._trackingId, user.id);
        this._userMap.set(user, visitor);
      } else {
        visitor = this._userMap.get(user);
      }
    } else {
      visitor = ua(this._trackingId, user.id);
    }
    visitor.pageview(node.replace(/\./g, "/"), ...args).send();
  }
};