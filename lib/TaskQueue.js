const BaseDB = require("./BaseDB");
const chrono = require("chrono-node");
const utils = require("./utils");

const maxRetries = 3;

class taskQueue {
  constructor({ r, client, restClient }) {
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
    this.db.r.table("taskQueue").filter(r => r("expireTime").le(this.db.r.now())).then(this.processQueue);
  }

  processQueue(queue) {
    console.log(queue);
    queue.forEach(this.processTask);
  }

  processTask(task) {
    return this.executeTask(task).then(() => this.removeQueueEntry(task)).catch(() => this.incrementRetries(task));
  }

  incrementRetries(task) {
    if (task.retries > maxRetries) {
      return this.removeQueueEntry(task.id);
    } else {
      return this.db.r.table("taskQueue").get(task.id).update({retries: task.retries + 1}).run();
    }
  }

  executeTask(task) {
    switch (task.action) {
      case "unmute":
        return this.unmute(task.meta);
    }
  }

  removeQueueEntry({ id }) {
    this.db.r.table("taskQueue").get(id).delete().run();
  }

  schedule(task, time) {
    let datedTask = Object.assign({expireTime: this.db.r.epochTime(chrono.parseDate(time, Date.now()).getTime() / 1000)}, task);
    this.db.r.table("taskQueue").insert(datedTask).run();
  }

  async unmute(meta) {
    let options = { mute: false };
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

module.exports = taskQueue;