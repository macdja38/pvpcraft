/**
 * Created by macdja38 on 2017-02-21.
 */


module.exports = new class ShardManager{
  constructor(config) {
    let shards = config.get("shards", 2);
    let startShard = config.get("shardStart", 0);
    let localShards = config.get("localShards", 2);
    let lastRestart = 0;
    let restartQueue = [];
    let restartWorker = false;
    let workers = [];
    let args = ["--prof"];
    args.push(...process.argv.slice(2));
    console.log(`This is the master, starting ${shards} shards`.green);
    for (let i = startShard; i < (startShard + localShards); i++) {
      console.log(`Scheduling shard ${i}`);
      setTimeout(function () {
        console.log(`Starting worker ${i} with settings`.green, cluster.settings);
        workers.push(cluster.fork({id: i, shards: shards}));
        lastRestart = Date.now();
      }, 7500 * (i - startShard));
    }

    restartWorker = setInterval(() => {
      if ((restartQueue.length > 0) && Date.now() - lastRestart > 7500) {
        lastRestart = Date.now();
        let id;
        let target = restartQueue.shift();
        id = workers.indexOf(target);
        workers[id] = cluster.fork({id: id + startShard, shards: shards});
        console.log(`worker ${workers[id].process.pid} born with settings`, cluster.settings);
      }
    }, 1000);

    cluster.on('exit', (deadWorker, code, signal) => {
      console.log(`worker ${deadWorker.process.pid} died with code ${code} and signal ${signal}`);
      restartQueue.push(deadWorker);
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
                if (message.profile) {
                  cluster.setupMaster({args, execArgv: ["--prof"]});
                }
                workers.forEach((w, i) => {
                  setTimeout(() => {
                    console.log(`Killing worker ${w.id}`.red);
                    w.kill();
                  }, i * 10000);
                });
                if (message.profile) {
                  setTimeout(() => {
                    cluster.setupMaster({args: process.argv.slice(2), execArgv: []});
                  }, 240000);
                }
              } else {
                console.log(`Killing worker ${worker.id}`.red);
                if (message.profile) {
                  cluster.setupMaster({args, execArgv: ["--prof"]});
                }
                worker.kill();
                if (message.profile) {
                  setTimeout(() => {
                    cluster.setupMaster({args: process.argv.slice(2), execArgv: []});
                  }, 240000);
                }
              }
              break;
            case "logrestarts": {
              console.log("Workers", workers);
              console.log("Restart Queue", restartQueue);
              break;
            }
          }
          break;
      }
      console.log(message);
    });
  }
};