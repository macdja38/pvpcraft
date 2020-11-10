import BaseDB from "./BaseDB";
import { ModuleOptions } from "../types/lib";
import * as Eris from "eris";
import * as Sentry from "@sentry/node";
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

const TASK_QUEUE_TABLE_NAME = "taskQueue"

class TaskQueue {
  private client: Eris.Client;
  private restClient: Eris.Client;
  private db: BaseDB;

  constructor({ r, client, restClient }: { r: any, client: Eris.Client; restClient: Eris.Client }) {
    this.client = client;
    this.restClient = restClient;
    this.db = new BaseDB(r, TASK_QUEUE_TABLE_NAME);
    this.db.ensureTable(TASK_QUEUE_TABLE_NAME);
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
    // @ts-ignore
    this.db.r.table(TASK_QUEUE_TABLE_NAME).filter((r: any) => r("expireTime").le(this.db.r.now())).run().then(this.processQueue);
  }

  processQueue(queue: Task[]) {
    queue.forEach(this.processTask);
  }

  processTask(task: Task): Promise<void> {
    return this.executeTask(task).then(() => this.removeQueueEntry(task)).catch(async (error) => {
      await this.incrementRetries(task, error)
      return;
    });
  }

  incrementRetries(task: Task, error?: Error) {
    if (error) {
      Sentry.captureException(error, { extra: { task: task } });
    }
    let retries = task.retries || 0;
    if (retries > maxRetries) {
      return this.removeQueueEntry(task);
    } else {
      return this.db.r.table(TASK_QUEUE_TABLE_NAME).get(task.id).update({ retries: retries + 1 }).run();
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
    this.db.r.table(TASK_QUEUE_TABLE_NAME).get(id).delete().run();
  }

  estimateEndDateFromString(string: string) {
    const date = chrono.parseDate(`in ${string}`, new Date(), { forwardDate: true });
    if (date) {
      return date;
    } else {
      throw new Error(`Cannot parse time of ${string}`)
    }
  }

  schedule(task: Task, timeInput: string | Date | number) {
    let time: number;
    if (typeof timeInput === "string") {
      time = this.estimateEndDateFromString(timeInput).getTime() / 1000;
    } else if (timeInput instanceof Date) {
      time = timeInput.getTime() / 1000;
    } else if (typeof timeInput === "number") {
      time = timeInput;
    } else {
      throw new Error("Invalid type of time.");
    }
    let datedTask = Object.assign({ expireTime: this.db.r.epochTime(time) }, task);
    this.db.r.table(TASK_QUEUE_TABLE_NAME).insert(datedTask).run();
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

export default TaskQueue;
