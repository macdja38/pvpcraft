import BaseDB from "./BaseDB";
import { ModuleOptions } from "../types/lib";
import * as Eris from "eris";
import * as Sentry from "@sentry/node";
import * as chrono from "chrono-node";
import utils from "./utils";

const maxRetries = 3;

interface RawTask {
  id?: string;
  retries?: number;
  action: string;
  guildID: string;
  meta: any;
}

interface TaskWithID extends RawTask {
  id: string;
}

interface ExtendedTask extends RawTask {
  shardCount: number;
  botID: string;
  expireTime: ReturnType<BaseDB["r"]["epochTime"]>;
  shiftedGuildID: number;
}

const TASK_QUEUE_TABLE_NAME = "taskQueue"

const BOT_GUILD_EXPIRY_INDEX = "botID_shard_expireTime";

class TaskQueue {
  private client: Eris.Client;
  private db: BaseDB;
  private shardCount: number;
  private shardID: number;
  private interval?: NodeJS.Timeout;

  constructor({ r, client, shardID, shardCount }: { r: any, client: Eris.Client; shardCount: number, shardID: number }) {
    this.client = client;
    this.shardCount = shardCount;
    this.shardID = shardID;
    this.db = new BaseDB(r, TASK_QUEUE_TABLE_NAME);
    this.db.ensureTable(TASK_QUEUE_TABLE_NAME);
    this.db.ensureComplexIndex(BOT_GUILD_EXPIRY_INDEX, table => table.indexCreate(BOT_GUILD_EXPIRY_INDEX, doc => [doc("botID"), doc("shiftedGuildID").mod(doc("shardCount")), doc("expireTime")]))
    this.processQueue = this.processQueue.bind(this);
    this.runExpiredTasks = this.runExpiredTasks.bind(this);
    this.removeQueueEntry = this.removeQueueEntry.bind(this);
    this.processTask = this.processTask.bind(this);
    this.incrementRetries = this.incrementRetries.bind(this);
  }

  onReady() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.interval = setInterval(this.runExpiredTasks, 1000);
  }

  onDisconnect() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  runExpiredTasks() {
    const botID = this.client.user.id;

    this.db.r.table(TASK_QUEUE_TABLE_NAME).between([botID, this.shardID, this.db.r.minval], [botID, this.shardID, this.db.r.now()], { index: BOT_GUILD_EXPIRY_INDEX }).run().then(result => this.processQueue(result as unknown as TaskWithID[]));
  }

  processQueue(queue: TaskWithID[]) {
    queue.forEach(this.processTask);
  }

  processTask(task: TaskWithID): Promise<void> {
    return this.executeTask(task).then(() => this.removeQueueEntry(task)).catch(async (error) => {
      await this.incrementRetries(task, error)
      return;
    });
  }

  incrementRetries(task: TaskWithID, error?: Error) {
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

  executeTask(task: TaskWithID) {
    switch (task.action) {
      case "unmute":
        return this.unmute(task);
    }
    return Promise.reject("Unknown Task")
  }

  removeQueueEntry({ id }: TaskWithID) {
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

  schedule(task: RawTask, timeInput: string | Date | number) {
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
    let datedTask = Object.assign({
      expireTime: this.db.r.epochTime(time),
      botID: this.client.user.id,
      shardCount: this.shardCount,
      shiftedGuildID: Number(BigInt(task.guildID) >> 22n),
    }, task);
    this.db.r.table(TASK_QUEUE_TABLE_NAME).insert(datedTask as ExtendedTask).run();
  }

  async unmute(task: TaskWithID) {
    let options: { roles?: string[], mute?: boolean } = {};

    const meta = task.meta;

    if (!this.client.guilds.has(task.guildID)) {
      console.error("Task scheduled on incorrect worker!!!!")
    }

    if (meta.roleIDs) {
      let member;
      try {
        member = await this.client.getRESTGuildMember(meta.guildID, meta.userID);
      } catch (error) {
        Sentry.captureException(error);
        console.error("From this place", error);
        throw error;
      }
      options.roles = member.roles.filter(rID => !meta.roleIDs.includes(rID));
    }
    return this.client.editGuildMember(meta.guildID, meta.userID, options, `Mute expired, mute reason: ${utils.clean(meta.reason)}`);
  }
}

export default TaskQueue;
