/**
 * Created by macdja38 on 2017-02-21.
 */

const cluster = require("cluster");
const Raven = require("raven");
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
    this.initRaven().catch(error => {
      console.log(error);
      throw error;
    }).then(this.initShardManager.bind(this))
  }

  initRaven() {
    return new Promise((resolve) => {
      let sentryEnv = this.fileConfig.get("sentryEnv", "");

      if (this.fileAuth.get("sentryURL", "") !== "") {
        console.log("Sentry Started".yellow);
        git.long((commit) => {
          git.branch((branch) => {
            let ravenConfig = {
              release: commit + "-" + branch,
              transport: new Raven.transports.HTTPSTransport({rejectUnauthorized: false}),
              tags: {
                shardId: process.env.id,
              },
              autoBreadcrumbs: true,
            };
            if (sentryEnv) {
              ravenConfig.environment = sentryEnv
            }
            this.raven = new Raven.Client(this.fileAuth.data.sentryURL, ravenConfig);

            this.raven.install(() => {
              console.log("This is thy sheath; there rust, and let me die.");
              process.exit(1);
            });

            this.raven.on("logged", (e) => {
              console.log("Error reported to sentry!: ".green + e);
            });

            this.raven.on("error", (e) => {
              console.error("Could not report event to sentry:", e.reason);
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
    console.log(`This is the master, starting ${this.shards} shards`.green);
    for (let i = this.startShard; i < (this.startShard + this.localShards); i++) {
      console.log(`Scheduling shard ${i}`);
      setTimeout(() => {
        cluster.setupMaster({args: this.args});
        console.log(`Starting worker ${i} with settings`.green, cluster.settings);
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
        console.log(`worker ${this.workers[id].process.pid} born with settings`, cluster.settings);
      }
    }, 1000);

    cluster.on('exit', (deadWorker, code, signal) => {
      if (this.raven) {
        this.raven.captureMessage(`worker died with code ${code} and signal ${signal}`, { extra: { shardId: this.workers.indexOf(deadWorker + this.startShard)}});
      }
      console.log(`worker ${deadWorker.process.pid} died with code ${code} and signal ${signal}`);
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
                    console.log(`Killing worker ${w.id}`.red);
                    w.kill();
                  }, i * 10000);
                });
              } else {
                console.log(`Killing worker ${worker.id}`.red);
                worker.kill();
              }
              break;
            case "logrestarts": {
              console.log("this.workers", this.workers);
              console.log("Restart Queue", this.restartQueue);
              break;
            }
          }
          break;
      }
      console.log(message);
    });
  }
};