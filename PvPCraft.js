/**
 * Created by macdja38 on 2017-02-21.
 */
/**
 * Created by macdja38 on 2016-04-17.
 */
/* var module = require("module");
 module.wrapper[0] += ""use strict";";
 Object.freeze(module.wrap);
 */
"use strict";
const cluster = require("cluster");
const Configs = require("./lib/config.js");
const blocked = require("blocked");
const git = require("git-rev");
const ravenClient = require("raven");
const PvPClient = require("pvpclient");
const ConfigsDB = require("./lib/configDB.js");
const Eris = require("eris");
for(let thing in Eris) {
  console.log(thing);
  if (Eris.hasOwnProperty(thing) && typeof Eris[thing] === "object" && Eris[thing].hasOwnProperty("prototype")) delete Eris[thing].prototype.toJSON; // remove broken eris toJSON methods
}
const MessageSender = require("./lib/messageSender");
const Permissions = require("./lib/permissions.js");
const Analytics = require("./lib/analytics");
const now = require("performance-now");
const Parse = require("./lib/newParser.js");
const colors = require("colors");
const request = require("request");
const SlowSender = require("./lib/slowSender");
const Feeds = require("./lib/feeds");
const R = require("rethinkdbdash");

let lastMessage = Date.now();

let waitBeforeRestart = 30000;

/**
 * log blocking events
 setTimeout(() => {
  blocked(ms => {
    const text = `C${process.env.id}/${process.env.shards} blocked for ${ms}ms\nup-time ${process.uptime()}`;
    let attachment = {text, ts: Date.now() / 1000};
    attachment.title = "Event loop blocked";
    attachment.color = "#ff0000";
    let hookOptions = {
      username: client.user.username,
      text: "",
      icon_url: client.user.avatarURL,
      slack: true,
    };
    hookOptions.attachments = [attachment];
    let hooks = config.get("blockHooks");
    if (hooks) {
      hooks.forEach(hook => client.sendWebhookMessage(hook, "", hookOptions)
        .catch(() => {
        })
      );
    }
  }, {threshold: 500});
}, 30000);
 */


module.exports = class PvPCraft {
  constructor(fileConfig) {
    this.fileConfig = fileConfig;
    this.prefix = [];
    this.hasBeenReady = false;
    this.moduleList = [];
    this.middlewareList = [];
    this.shardId = parseInt(process.env.id || "0");
    this.shardCount = parseInt(process.env.shards || "1");
    this.readyPromise = new Promise((resolve /*, reject */) => {
      this.resolveReadyPromise = resolve;
      // this.rejectReadyPromise = reject;
    });
    Promise.resolve()
      .then(this.loadFileConfigs.bind(this))
      .then(this.loadAnalytics.bind(this))
      .then(this.readyRaven.bind(this))
      .then(this.registerProcessListeners.bind(this))
      .then(this.readyRethinkDB.bind(this))
      .then(this.createClient.bind(this))
      .then(this.registerReadyListener.bind(this))
      .then(this.readyIdleRestart.bind(this))
      .then(this.login.bind(this))
      .then(this.readyMessageSender.bind(this))
      .then(this.readySlowSender.bind(this))
      .then(this.resolveWhenReady.bind(this))
      .then(this.loadDBConfigs.bind(this))
      .then(this.readyFeeds.bind(this))
      .then(this.readyPvPClient.bind(this))
      .then(this.reload.bind(this))
      .then(this.registerClientListeners.bind(this))
      .then(this.announceReady.bind(this))
      .catch(console.error)
  }

  readyIdleRestart() {
    setInterval(() => {
      if (Date.now() - lastMessage > waitBeforeRestart) {
        if (this.raven) {
          this.raven.captureException(new Error("Did not recieve messages in " + waitBeforeRestart));
        }
        setTimeout(() => process.exit(533), 3000); //allow time to report sentry exception before exiting
      }
    }, 10000)
  }

  readyMessageSender() {
    this.messageSender = new MessageSender({client: this.client});
  }

  readySlowSender() {
    this.slowSender = new SlowSender({client: this.client, config: this.fileConfig});
  }

  readyRethinkDB() {
    this.r = R(this.fileAuth.get("reThinkDB", {}));
  }

  resolveWhenReady() {
    return this.readyPromise;
  }

  readyPvPClient() {
    this.pvpClient = new PvPClient(this.fileAuth.get("pvpApiEndpoint"), this.fileAuth.get("pvpApiToken"), this.client.user.id, this.client.guilds.map(g => g.id));
    this.pvpClient.connect();
  }

  announceReady() {
    let id = this.client.user.id;
    let mention = "<@" + id + ">";
    let name = this.client.user.username;
    console.log(`Loading modules for Shard ${process.env.id} / ${process.env.shards}`.cyan);
    console.log(`-------------------`.magenta);
    console.log(`Ready as ${name}`.magenta);
    console.log(`Mention ${mention}`.magenta);
    console.log(`On ${this.client.guilds.size} Servers`.magenta);
    console.log(`Shard ${process.env.id} / ${process.env.shards}`.magenta);
    console.log(`-------------------`.magenta);
  }

  readyFeeds() {
    this.feeds = new Feeds({client: this.client, r: this.r, configDB: this.configDB});
  }

  registerReadyListener() {
    this.client.on("ready", () => {
      this.resolveReadyPromise(true);
      console.log("Got ready");
      if (this.client.guilds.length <= this.fileConfig.get("minDiscords", 1)) {
        process.exit(258);
      }
    });
  }

  registerClientListeners() {
    this.client.on("guildDelete", this.onGuildDelete.bind(this));
    this.client.on("unavailableGuildCreate", this.onGuildCreate.bind(this));
    this.client.on("guildCreate", this.onGuildCreate.bind(this));
    this.client.on("messageCreate", this.onMessage.bind(this));
    this.client.on("error", this.onError.bind(this));
    this.client.on("disconnect", this.onDisconnect.bind(this));
  }

  onError(error) {
    if (this.raven) {
      this.raven.captureException(error);
    }
    console.error("Error", error);
    console.error(error.stack);
  }

  onDisconnect() {
    console.log("Disconnect".red);
    for (let i in this.moduleList) {
      if (this.moduleList.hasOwnProperty(i)) {
        if (this.moduleList[i].module.onDisconnect) {
          this.moduleList[i].module.onDisconnect();
        }
      }
    }
  }

  onGuildCreate(server) {
    this.pvpClient.addGuild(server.id);
    let configs = [this.configDB.serverCreated(server), this.permsDB.serverCreated(server)];
    Promise.all(configs).then(() => {
      for (let middleware of this.middlewareList) {
        if (middleware.ware) {
          try {
            if (middleware.ware.onGuildCreate) {
              console.log("Notifying a middleware a server was created!".green);
              middleware.ware.onGuildCreate(server);
            }
          } catch (error) {
            console.error(error);
          }
        }
      }
      for (let module of this.moduleList) {
        if (module.module) {
          try {
            if (module.module.onGuildCreate) {
              console.log("Notifying a module a server was created!".green);
              module.module.onGuildCreate(server);
            }
          } catch (error) {
            console.error(error);
          }
        }

      }
    }).catch(console.error)
  }

  onGuildDelete(server) {
    for (let middleware of this.middlewareList) {
      if (middleware.ware) {
        try {
          if (middleware.ware.onGuildDelete) {
            console.log(`Notifying a middleware a server was Deleted! shard ${process.env.id}`.green);
            middleware.ware.onGuildDelete(server);
          }
        } catch (error) {
          if (this.raven) {
            this.raven.captureException(error);
          } else {
            console.log(error);
          }
        }
      }
    }
    for (let module of this.moduleList) {
      if (module.module) {
        try {
          if (module.module.onGuildDelete) {
            console.log(`Notifying a module a server was Deleted! shard ${process.env.id}`.green);
            module.module.onGuildDelete(server);
          }
        } catch (error) {
          if (this.raven) {
            this.raven.captureException(error);
          } else {
            console.log(error);
          }
        }
      }

    }
  }

  /**
   * Creates a new instance of the client used to connect to discord.
   */
  createClient() {
    let token;
    if (this.fileAuth.get("tokens", false)) {
      token = this.fileAuth.get("tokens", {})[parseInt(process.env.id)];
    } else {
      token = this.fileAuth.get("token", {});
    }
    this.client = new Eris(token, {
      forceFetchUsers: true,
      autoReconnect: true,
      compress: true,
      disableEveryone: false,
      firstShardId: this.shardId,
      lastShardId: this.shardId + 1,
      maxShards: this.shardCount
    });
  }

  /**
   * Initiates the connection to discord.
   */
  login() {
    this.client.connect();
  }

  loadFileConfigs() {
    this.fileAuth = new Configs("auth");
  }

  loadAnalytics() {
    let trackingId = this.fileAuth.get("googleAnalyticsId", "trackingId");
    if (trackingId === "trackingId") {
      trackingId = false;
    }
    this.analytics = new (Analytics)(trackingId);
    return Promise.resolve();
  }

  loadDBConfigs() {
    return new Promise((resolve) => {
      this.configDB = new ConfigsDB(this.r, "servers", this.client);
      this.permsDB = new ConfigsDB(this.r, "permissions", this.client);
      this.perms = new Permissions(this.permsDB, this.analytics);
      Promise.all([this.configDB.reload(), this.permsDB.reload()]).then(() => {
        resolve(true);
      }).catch(console.error);
    })
  }

  readyRaven() {
    return new Promise((resolve) => {
      let sentryEnv = this.fileConfig.get("sentryEnv", "");

      if (this.fileAuth.get("sentryURL", "") != "") {
        console.log("Sentry Started".yellow);
        git.long((commit) => {
          git.branch((branch) => {
            let ravenConfig = {
              release: commit + "-" + branch,
              transport: new ravenClient.transports.HTTPSTransport({rejectUnauthorized: false})
            };
            if (sentryEnv) {
              ravenConfig.environment = sentryEnv
            }
            this.raven = new ravenClient.Client(this.fileAuth.data.sentryURL, ravenConfig);
            //raven's patch global seems to have been running synchronously and delaying the execution of other code.
            this.raven.patchGlobal(function (error) {
              if (process.env.dev == "true") {
                console.error(error);
              }
              process.exit(1);
            });

            this.raven.setTagsContext({
              shardId: process.env.id,
            });

            this.raven.on("logged", function (e) {
              console.log("Error reported to sentry!: ".green + e);
            });

            this.raven.on("error", function (e) {
              console.error("Could not report event to sentry:", e.reason);
            });
            resolve(true);
          })
        });
      }
    })
  }

  static userObjectify(user) {
    return {
      id: user.id,
      status: user.status,
      username: user.username,
    };
  }

  shutDown() {
    setTimeout(() => {
      process.exit(1)
    }, 5000);
    console.log("Logging out.");
    for (let middleware of this.middlewareList) {
      if (middleware.module) {
        if (middleware.module.onDisconnect) {
          console.log("Trying to Remove Listeners!".green);
          middleware.module.onDisconnect();
        }
      }
    }
    for (let module of this.moduleList) {
      if (module.module) {
        if (module.module.onDisconnect) {
          console.log("Trying to Remove Listeners!".green);
          module.module.onDisconnect();
        }
      }
    }
    this.middlewareList = [];
    this.moduleList = [];
    this.client.disconnect({reconnect: false});
    setTimeout(() => {
      console.log("Bye");
      process.exit(0);
    }, 4000);
  }

  reload() {
    this.prefix = this.configDB.get("prefix", ["!!", "//", "/"], {server: "*"});
    this.id = this.client.user.id;
    console.log("defaults");
    console.log(this.prefix);
    this.name = this.client.user.name;
    for (let middleware in this.middlewareList) {
      if (this.middlewareList.hasOwnProperty(middleware)) {
        try {
          if (this.middlewareList[middleware].module && this.middlewareList[middleware].module.onDisconnect) {
            console.log(`Removing Listeners for middleware ${middleware}`.green);
            this.middlewareList[middleware].module.onDisconnect();
          }
          delete this.middlewareList[middleware];
        } catch (error) {
          console.error(error);
        }
      }
    }
    for (let module in this.moduleList) {
      if (this.moduleList.hasOwnProperty(module)) {
        try {
          if (this.moduleList[module].module && this.moduleList[module].module.onDisconnect) {
            console.log(`Removing Listeners for module ${module}`.green);
            this.moduleList[module].module.onDisconnect();
          }
          delete this.moduleList[module];
        } catch (error) {
          console.error(error);
        }
      }
    }
    this.middlewareList = [];
    this.moduleList = [];
    let middlewares = this.fileConfig.get("middleware");
    let modules = this.fileConfig.get("modules");
    let moduleVariables = {
      client: this.client,
      config: this.fileConfig,
      raven: this.raven,
      auth: this.fileAuth,
      configDB: this.configDB,
      r: this.r,
      perms: this.perms,
      feeds: this.feeds,
      messageSender: this.messageSender,
      slowSender: this.slowSender,
      pvpClient: this.pvpClient,
      modules: this.moduleList,
      middleWares: this.middlewareList
    };
    for (let module in modules) {
      if (modules.hasOwnProperty(module)) {
        try {
          let Module = require(modules[module]);
          let mod = new Module(moduleVariables);
          if (mod.onReady) mod.onReady();
          this.moduleList.push({"commands": mod.getCommands(), "module": mod});

        }
        catch
          (error) {
          console.error(error);
        }
      }
    }
    for (let middleware in middlewares) {
      if (middlewares.hasOwnProperty(middleware)) {
        try {
          let ware = new (require(middlewares[middleware]))(moduleVariables);
          if (ware.onReady) ware.onReady();
          this.middlewareList.push({"ware": ware});
        } catch (error) {
          console.error(error);
        }
      }
    }
  }

  reloadTarget(msg, command) {
    let channel = msg.channel;
    for (let module in this.moduleList) {
      if (this.moduleList.hasOwnProperty(module) && this.moduleList[module].module.constructor.name === command.args[0]) {
        if (this.moduleList[module].module.onDisconnect) {
          this.moduleList[module].module.onDisconnect();
        }
        let modules = this.fileConfig.get("modules");
        delete require.cache[require.resolve(modules[command.args[0]])];
        channel.createMessage("Reloading " + command.args[0]);
        console.log("Reloading ".yellow + command.args[0].yellow);
        let mod = new (require(modules[command.args[0]]))({
          client: this.client,
          config: this.fileConfig,
          raven: this.raven,
          auth: this.fileAuth,
          configDB: this.configDB,
          r: this.r,
          perms: this.perms,
          feeds: this.feeds,
          messageSender: this.messageSender,
          slowSender: this.slowSender,
          pvpClient: this.pvpClient
        });
        if (mod.onReady) mod.onReady();
        this.moduleList[module].module = mod;
        this.moduleList[module].commands = mod.getCommands();
        console.log("Reloded ".yellow + command.args[0].yellow);
        channel.createMessage("Reloded " + command.args[0]);
      }
    }
  }

  onMessage(msg) {
    if (msg.author && msg.author.id === this.id) return;
    lastMessage = Date.now();
    let l;
    let mod;
    let ware;

    // handle per server prefixes.
    if (msg.channel.guild) {
      l = this.configDB.get("prefix", this.prefix, {server: msg.channel.guild.id});
      if (l == null) {
        l = this.prefix;
      } else {
        l.push(...this.prefix.filter(p => l.indexOf(p) < 0));
      }
    } else {
      l = this.prefix;
    }
    //console.log(`Prefix ${l}`);
    //Message middleware starts here.
    for (ware in this.middlewareList) {
      if (this.middlewareList.hasOwnProperty(ware) && this.middlewareList[ware].ware.onMessage) {
        this.middlewareList[ware].ware.onMessage(msg, this.perms)
      }
    }
    let command;
    try {
      command = Parse.command(l, msg, {"allowMention": this.id, "botName": this.name});
    } catch (error) {
      if (this.raven) {
        let extra = {
          channel: msg.channel.id,
          channel_name: msg.channel.name,
          msg: msg.content
        };
        if (command) {
          extra.command = command;
        }
        if (msg.hasOwnProperty("server")) {
          extra.guild = msg.channel.guild.id;
          extra.guild_name = msg.channel.guild.name;
        }
        this.raven.captureException(error, {
          user: PvPCraft.userObjectify(msg.author),
          extra,
        });
      }
      msg.channel.createMessage(`${msg.author.mention}, Sorry about that an unknown problem occurred processing your command, an error report has been logged and we are looking into the problem.`);
    }

    if (command) {
      //Reload command starts here.
      if (command.command === "reload" && msg.author.id === "85257659694993408") {
        if (command.flags.indexOf("a") > -1) {
          this.reload();
        } else {
          this.reloadTarget(msg, command, this.perms, l)
        }
        return;
      }
    }

    //Command middleware starts here.
    if (command) {
      for (ware in this.middlewareList) {
        if (this.middlewareList.hasOwnProperty(ware) && this.middlewareList[ware].ware.onCommand) {
          this._commandWrapper(ware, command, msg, () => {
            this.middlewareList[ware].ware.onCommand(msg, command, this.perms, l)
          })
        }
      }
    }
    for (ware in this.middlewareList) {
      if (this.middlewareList.hasOwnProperty(ware) && this.middlewareList[ware].ware.changeMessage) {
        this._commandWrapper(ware, command, msg, () => {
          msg = this.middlewareList[ware].ware.changeMessage(msg, this.perms);
        });
      }
    }
    if (command) {
      for (ware in this.middlewareList) {
        if (this.middlewareList.hasOwnProperty(ware) && this.middlewareList[ware].ware.changeCommand) {
          this._commandWrapper(ware, command, msg, () => {
            command = this.middlewareList[ware].ware.changeCommand(msg, command, this.perms, l);
          });
        }
      }
    }
    if (command) {
      for (mod in this.moduleList) {
        if (this.moduleList.hasOwnProperty(mod) && this.moduleList[mod].commands.indexOf(command.commandnos) > -1) {
          let shouldReturn;
          this._commandWrapper(mod, command, msg, () => {
            shouldReturn = this.moduleList[mod].module.onCommand(msg, command, this.perms, this.moduleList, mod);
            return shouldReturn;
          });
          if (shouldReturn) return;
        }
      }
    }
    //apply misc responses.
    for (mod in this.moduleList) {
      if (this.moduleList.hasOwnProperty(mod) && this.moduleList[mod].module.checkMisc) {
        let shouldReturn;
        this._commandWrapper(mod, command, msg, () => {
          shouldReturn = this.moduleList[mod].module.checkMisc(msg, this.perms, l);
          return shouldReturn;
        });
        if (shouldReturn) return;
      }
    }
  }

  registerProcessListeners() {
    process.on("unhandledRejection", this.captureError.bind(this));
    if (process.env.dev == "true") {
      process.on("uncaughtException", (error) => {
        console.error(error);
      });
    }
    this.raven.install(function () {
      console.log("This is thy sheath; there rust, and let me die.");
      process.exit(1);
    });
    process.on("MaxListenersExceededWarning", this.captureError.bind(this));
    process.on("SIGINT", this.shutDown.bind(this));
  }

  /**
   * Wraps the command to capture any exceptions thrown asynchronously or synchronously with sentry
   * @param mod error is originating from
   * @param command that triggered the error
   * @param msg containing offending command
   * @param callCommandFunction function to call and capture errors from
   */
  _commandWrapper(mod, command, msg, callCommandFunction) {
    let returnValue = false;
    try {
      returnValue = callCommandFunction();
      if (returnValue === true) {
        return;
      }
    } catch (error) {
      returnValue = Promise.reject(error);
    }
    if (returnValue && returnValue.catch) {
      returnValue.catch((error) => {
        if (this.raven) {
          let extra = {
            mod: mod,
            channel: msg.channel.id,
            channel_name: msg.channel.name,
            command: command,
            msg: msg.content
          };
          if (msg.hasOwnProperty("server")) {
            extra.guild = msg.guild.id;
            extra.guild_name = msg.guild.name;
          }
          if (process.env.dev == "true") {
            console.error(error);
          }
          this.raven.captureException(error, {
            user: PvPCraft.userObjectify(msg.author),
            extra,
          }, (id) => {
            if (error) console.error(error);
            else {
              msg.channel.createMessage("Sorry their was an error processing your command. The error is ```" + error +
                "``` reference code `" + id + "`");
            }
          });
        } else {
          console.error(error);
        }
      })
    }
  }

  captureError(error) {
    if (this.raven) {
      this.raven.captureException(error, (sendError, resultId) => {
        if (sendError) {
          console.error("Failed to report", error)
        }
        console.log(`Logged error ID:${resultId} to sentry`);
        if (process.env.dev == "true") {
          console.error(error);
        }
      });
    } else {
      console.error(error);
    }
  }
};
