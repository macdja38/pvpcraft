import BaseDB from "./BaseDB";
import { ModuleOptions } from "../types/lib";
import * as Eris from "eris";
import Sentry from "@sentry/node";
import chrono from "chrono-node";
import utils from "./utils";

console.log(chrono);

const maxRetries = 3;

interface Task {
  id: string;
  retries?: number;
  action: string;
  meta: any;
}

class taskQueue {
  private client: Eris.Client;
  private restClient: Eris.Client;
  private db: BaseDB;

  constructor({ r, client, restClient }: { r: any, client: Eris.Client; restClient: Eris.Client }) {
    this.client = client;
    this.restClient = restClient;
    this.db = new BaseDB(r);
    this.db.ensureTable("taskQueue");
    this.processQueue = this.processQueue.bind(this);
    this.runExpiredTasks = this.runExpiredTasks.bind(this);
    this.removeQueueEntry = this.removeQueueEntry.bind(this);
    this.processTask = this.processTask.bind(this);
    this.incrementRetries = this.incrementRetries.bind(this);
    if (!process.env.id || process.env.id === "0") {
      setInterval(this.runExpiredTasks, 1000);
    }
  }

  runExpiredTasks() {
    this.db.r.table("taskQueue").filter((r: any) => r("expireTime").le(this.db.r.now())).then(this.processQueue);
  }

  processQueue(queue: Task[]) {
    queue.forEach(this.processTask);
  }

  processTask(task: Task) {
    return this.executeTask(task).then(() => this.removeQueueEntry(task)).catch((error: Error) => this.incrementRetries(task, error));
  }

  incrementRetries(task: Task, error?: Error) {
    if (error) {
      Sentry.captureException(error, { extra: { task: task } });
    }
    let retries = task.retries || 0;
    if (retries > maxRetries) {
      return this.removeQueueEntry(task);
    } else {
      return this.db.r.table("taskQueue").get(task.id).update({ retries: retries + 1 }).run();
    }
  }

  executeTask(task: Task) {
    switch (task.action) {
      case "unmute":
        return this.unmute(task.meta);
    }
    return Promise.reject("Unknown Task")
  }

  removeQueueEntry({ id }: Task) {
    this.db.r.table("taskQueue").get(id).delete().run();
  }

  estimateEndDateFromString(string: string) {
    const date = chrono.parseDate(`in ${string}`, Date.now(), { forwardDate: true });
    if (date) {
      return date;
    } else {
      throw new Error(`Cannot parse time of ${string}`)
    }
  }

  schedule(task: Task, time: string | Date | number) {
    if (typeof time === "string") {
      time = this.estimateEndDateFromString(time);
    } else if (time instanceof Date) {
      time = time.getTime() / 1000;
    }
    let datedTask = Object.assign({ expireTime: this.db.r.epochTime(time) }, task);
    this.db.r.table("taskQueue").insert(datedTask).run();
  }

  async unmute(meta: any) {
    let options: { roles?: string[], mute: boolean } = { mute: false };
    if (meta.roleIDs) {
      let member;
      try {
        member = await this.restClient.getRESTGuildMember(meta.guildID, meta.userID);
      } catch (error) {
        console.error("From this place", error);
        throw error;
      }
      options.roles = member.roles.filter(rID => !meta.roleIDs.includes(rID));
    }
    return this.client.editGuildMember(meta.guildID, meta.userID, options, `Mute expired, mute reason: ${utils.clean(meta.reason)}`);
  }
}

export default taskQueue;
