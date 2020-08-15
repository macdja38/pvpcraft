/**
 * Created by macdja38 on 2016-11-16.
 */

"use strict";

import { Member, User } from "eris";

const ua = require('universal-analytics');

/**
 * @class Analytics
 * Google analytics tracking class
 */
class Analytics {
  private _trackingId: string;
  private _userMap: WeakMap<User | Member, any>;

  /**
   *
   * @param {string} trackingId Google tracking id
   */
  constructor(trackingId: string) {
    this._trackingId = trackingId;
    this._userMap = new WeakMap([]);
  }

  /**
   * Records a node to google analytics
   * @param {User|Member} user
   * @param {string} node
   * @param {...*} args arguments that will be passed to the pageview after the node
   */
  record(user: User | Member, node: string, ...args: any[]) {
    if (!this._trackingId) return;
    let visitor;
    if (!this._userMap.has(user)) {
      visitor = ua(this._trackingId, user.id, { strictCidFormat: false });
      this._userMap.set(user, visitor);
    } else {
      visitor = this._userMap.get(user);
    }
    visitor.pageview(node.replace(/\./g, "/"), ...args).send();
  }
}

module.exports = Analytics;
