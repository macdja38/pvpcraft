/**
 * Created by macdja38 on 2016-11-26.
 */

"use strict";

import chalk from "chalk";
import Eris from "eris";

import * as Sentry from "@sentry/node";

/**
 * The base of all the classes that interact with a database
 * @class BaseDB
 * @property {R} r
 */
class BaseDB {
  protected readonly table: string;
  r: any;
  /**
   * Base database constructor, includes saving r to this.r
   * @param table The table to read / write from
   * @param r rethinkdb object.
   */
  constructor(r: any, table: string) {
    this.table = table;
    this.r = r;
  }

  /**
   * Ensures a table exists in the database
   * @param {String} tableName name of the table
   * @param {Object} [tableOptions={}] options object to be passed to r.tableCreate
   * @returns {Promise} true if table exists, table if not.
   */
  ensureTable(tableName: string, tableOptions={}) {
    console.log(chalk.blue(`Ensuring the table ${tableName} exists.`));
    return this.r.tableList()
      .contains(tableName)
      .branch(true, this.r.tableCreate(tableName, tableOptions))
      .run();
  }

  keepGuildTasksUpdated(client: Eris.Client, query: (ids: string[]) => any, guildIDExtractor: (record: any) => string, update: (guild: Eris.Guild, config: any) => () => void): Promise<() => {}> {
    // TODO: Support guilds joined by manually fetching them, and then restarting the query without the includeInitial parameter.

    const cancels: { [key: string]: () => void } = {};

    return query(client.guilds.map(guild => guild.id)).changes({ squash: true, includeInitial: true, }).run().then((cursor: any) => {

      cursor.each((err: Error, state: any) => {

        if (state.new_val) {
          const newVal = state.new_val;
          if (cancels.hasOwnProperty(newVal.id)) {
            cancels[newVal.id]();
          }

          const guild = client.guilds.get(guildIDExtractor(newVal));

          if (guild) {
            try {
              cancels[newVal.id] = update(guild, newVal);
            } catch (error) {
              console.error(error);
              Sentry.captureException(error)
            }
          }
        }
      });

      return () => {
        cursor.close();
        Object.values(cancels).forEach(cancel => cancel())
      }
    }).catch((error: Error) => {
      console.error(error);
      Sentry.captureException(error);
      throw error;
    })
  }
}

export default BaseDB;
