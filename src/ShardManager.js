import chalk from "chalk";

/**
 * Created by macdja38 on 2017-02-21.
 */

const cluster = require("cluster");
const Sentry = require("@sentry/node");
const git = require("git-rev");

//noinspection JSUnusedLocalSymbols
module.exports = class ShardManager {
  /**
   * Instantiates a new shard manager
   * @param {Config} config
   * @param {Config} auth
   */
  constructor(config, auth) {
    this.fileConfig = config;
    this.fileAuth = auth;
    this.initSentry().catch(error => {
      console.log(error);
      throw error;
    }).then(this.initShardManager.bind(this))
  }

  initSentry() {
    return new Promise((resolve) => {
      let sentryEnv = this.fileConfig.get("sentryEnv", "");

      if (this.fileAuth.get("sentryURL", "") !== "") {
        console.log("SHARD MASTER: Sentry Started");
        git.long((commit) => {
          git.branch((branch) => {
            let sentryConfig = {
              release: commit + "-" + branch,
              debug: true,
              dsn: this.fileAuth.get("sentryURL", undefined),
            };
            if (sentryEnv) {
              sentryConfig.environment = sentryEnv
            }

            Sentry.init(sentryConfig);

            Sentry.configureScope(function (scope) {
              if (process.env.id) {
                scope.setTag("shardId", process.env.id);
              }
              resolve(true);
            });

            Sentry.addGlobalEventProcessor(function (event, hint) {
              console.log(chalk.green(`SHARD MASTER: Error reported to sentry!: ${event.event_id}`));
              if (process.env.dev == "true") {
                console.log(event);
              }
              return event;
            });

            resolve(true);
          })
        });
      }
    })
  }

  initShardManager() {
    this.shards = this.fileConfig.get("shards", 2);
    this.startShard = this.fileConfig.get("shardStart", 0);
    this.localShards = this.fileConfig.get("localShards", 2);
    this.lastRestart = 0;
    this.restartQueue = [];
    this.restartWorker = false;
    this.workers = [];
    this.args = [];
    this.args.push(...process.argv.slice(2));
    console.log(`SHARD MASTER: This is the master, starting ${this.shards} shards`);
    for (let i = this.startShard; i < (this.startShard + this.localShards); i++) {
      console.log(`SHARD MASTER: Scheduling shard ${i}`);
      setTimeout(() => {
        cluster.setupMaster({args: this.args});
        console.log(`SHARD_MASTER: Starting worker ${i} with settings`, cluster.settings);
        this.workers.push(cluster.fork({id: i, shards: this.shards}));
        this.lastRestart = Date.now();
      }, 7500 * (i - this.startShard));
    }

    this.restartWorker = setInterval(() => {
      if ((this.restartQueue.length > 0) && Date.now() - this.lastRestart > 7500) {
        this.lastRestart = Date.now();
        let id;
        let target = this.restartQueue.shift();
        id = this.workers.indexOf(target);
        cluster.setupMaster({args: this.args});
        this.workers[id] = cluster.fork({id: id + this.startShard, shards: this.shards});
        console.log(`SHARD MASTER: worker ${this.workers[id].process.pid} born with settings`, cluster.settings);
      }
    }, 1000);

    cluster.on('exit', (deadWorker, code, signal) => {
      const shardId = this.workers.indexOf(deadWorker)  + this.startShard;
      Sentry.captureMessage(`SHARD MASTER: worker died with code ${code} and signal ${signal}`, { extra: { shardId }});
      console.log(`SHARD MASTER: worker ${deadWorker.process.pid} died with code ${code} and signal ${signal}. Shard: ${shardId}`);
      this.restartQueue.push(deadWorker);
    });

    cluster.on('message', (worker, message) => {
      if (!message.hasOwnProperty("op")) {
        return;
      }
      switch (message.op) {
        case 1:
          switch (message.command) {
            case "restart":
              if (message.global) {
                this.workers.forEach((w, i) => {
                  setTimeout(() => {
                    console.log(`SHARD MASTER: Killing worker ${w.id}`);
                    w.kill();
                  }, i * 10000);
                });
              } else {
                console.log(`SHARD MASTER: Killing worker ${worker.id}`);
                worker.kill();
              }
              break;
            case "logrestarts": {
              console.log("SHARD MASTER: this.workers", this.workers);
              console.log("SHARD MASTER: Restart Queue", this.restartQueue);
              break;
            }
          }
          break;
      }
      console.log(message);
    });
  }
};
