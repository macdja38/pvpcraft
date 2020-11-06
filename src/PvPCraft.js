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
require("util").inspect.defaultOptions.depth = 2;
const cluster = require("cluster");
const blocked = require("blocked");
const git = require("git-rev");
const Sentry = require("@sentry/node");
const PvPClient = require("pvpclient");
import ConfigsDB from "./lib/ConfigDB";

const Eris = require("eris");
for (let thing in Eris) {
  if (Eris.hasOwnProperty(thing) && typeof Eris[thing] === "function") {
    Eris[thing].prototype.toJSON = function toJSON() {
      let copy = {};
      keyLoop: for (let key in this) {
        if (this.hasOwnProperty(key) && !key.startsWith("_")) {
          for (let erisProp in Eris) {
            if (Eris.hasOwnProperty(erisProp)) {
              if (typeof Eris[erisProp] === "function" && this[key] instanceof Eris[erisProp]) {
                copy[key] = `[ Eris ${erisProp} ]`;
                continue keyLoop;
              }
            }
          }
          if (!this[key]) {
            copy[key] = this[key];
          } else if (this[key] instanceof Set) {
            copy[key] = "[ Set ]"
          } else if (this[key] instanceof Map) {
            copy[key] = "[ Map ]"
          } else {
            copy[key] = this[key];
          }
        }
      }
      return copy;
    }
  }
}
const i10010n = require("i10010n");
import TaskQueue from "./lib/TaskQueue";

const MessageSender = require("./lib/MessageSender");
import Permissions from "./lib/Permissions";

const Analytics = require("./lib/Analytics");
const now = require("performance-now");
import Command from "./lib/Command";
import utils from "./lib/utils";

const chalk = require("chalk");
const SlowSender = require("./lib/SlowSender");
const Feeds = require("./lib/feeds");
const R = require("rethinkdbdash");
if (process.env.dev === "true") {
  require("longjohn");
}

let lastMessage = Date.now();


process.on('SIGINT', (...args) => {
  console.error(`SIGTERM ${process.env.id}`, ...args);
  process.exit(128 + 2)
});
process.on('SIGTERM', (...args) => {
  console.error(`SIGTERM ${process.env.id}`, ...args);
  process.exit(128 + 15)
});
process.on('SIGABRT', (...args) => {
  console.error(`SIGABRT ${process.env.id}`, ...args);
  process.exit(128 + 6);
});

/**
 * @prop {Config} fileConfig
 * @prop {Eris} client
 */
class PvPCraft {
  /**
   * Instantiates a new instance of PvPCraft
   * @param {Config} fileConfig
   * @param {Config} fileAuth
   */
  constructor(fileConfig, fileAuth) {
    this.waitBeforeRestart = fileConfig.get("waitBeforeRestart", 30) * 1000;
    this.fileConfig = fileConfig;
    this.fileAuth = fileAuth;
    this.prefix = [];
    this.moduleList = [];
    this.middlewareList = [];
    this.shardId = parseInt(process.env.id || "0", 10);
    this.shardCount = parseInt(process.env.shards || "1", 10);
    this.readyPromise = new Promise((resolve /*, reject */) => {
      this.resolveReadyPromise = resolve;
      // this.rejectReadyPromise = reject;
    });

    this.captureMissingTranslation = this.captureMissingTranslation.bind(this);
    this.getChannelLanguage = this.getChannelLanguage.bind(this);
    this.translate = (channelID, guildID) =>
      this.i10010n(this.getChannelLanguage(channelID, guildID));

    Promise.resolve()
      .then(this.loadAnalytics.bind(this))
      .then(this.readyI10010n.bind(this))
      .then(this.readyRaven.bind(this))
      .then(this.registerProcessListeners.bind(this))
      .then(this.readyRethinkDB.bind(this))
      .then(this.createClient.bind(this))
      .then(this.readyTaskQueue.bind(this))
      .then(this.registerPreReadyClientListeners.bind(this))
      .then(this.registerReadyListener.bind(this))
      .then(this.readyIdleRestart.bind(this))
      .then(this.login.bind(this))
      .then(this.readyMessageSender.bind(this))
      .then(this.readySlowSender.bind(this))
      .then(this.resolveWhenReady.bind(this))
      .then(this.loadDBConfigs.bind(this))
      .then(this.readyFeeds.bind(this))
      .then(this.readyPvPClient.bind(this))
      .then(this.readyApi.bind(this))
      .then(this.reload.bind(this))
      .then(this.registerPostReadyClientListeners.bind(this))
      .then(this.announceReady.bind(this))
      .then(this.uploadSettingsIfChanged.bind(this))
      .catch(console.error)
  }

  startEventLoopMonitoring() {
    setTimeout(() => {
      blocked(ms => {
        const text = `C${process.env.id}/${process.env.shards} blocked for ${ms}ms\nup-time ${process.uptime()}`;
        let attachment = { text, ts: Date.now() / 1000 };
        attachment.title = "Event loop blocked";
        attachment.color = "#ff0000";
        let hookOptions = {
          username: this.client.user.username,
          text: "",
          icon_url: this.client.user.avatarURL,
          slack: true,
        };
        hookOptions.attachments = [attachment];
        let hooks = this.fileConfig.get("blockHooks");
        if (hooks) {
          hooks.forEach(hook => this.client.executeSlackWebhook(hook.id, hook.token, hookOptions)
            .catch((error) => {
              console.error(error);
            })
          );
        }
      }, { threshold: 500 });
    }, 30000);
  }

  static moduleToConfigMap(acc, module) {
    if (!module.module.getContent) return acc;
    const content = module.module.getContent();

    const result = {
      description: content.description,
      key: content.key,
      name: content.name,
      permNode: content.permNode,
      type: "commands",
    };

    result.children = module.commands.reduce(PvPCraft.commandToConfigMap, {});

    acc[result.key] = result;
    return acc;
  }

  static commandToConfigMap(acc, command) {
    if (!command.triggers || command.triggers.length < 1) return acc;
    const result = {
      children: {},
      description: command.description || command.triggers[0],
      key: command.triggers[0],
      name: command.name || command.triggers[0],
      permNode: command.permNode || "",
      type: "commands",
    };

    if (command.subCommands) {
      result.children = command.subCommands.reduce(PvPCraft.commandToConfigMap, {});
    }

    acc[command.triggers[0]] = result;

    return acc;
  }

  uploadSettingsIfChanged() {
    setTimeout(async () => {
      if (!this.pvpClient) return;
      const config = await this.pvpClient.getConfigMap();
      if (!config || this.git && this.git.commit !== config.version) {
        return this.uploadSettings(this.git.commit, config)
      }
    }, 5000);
  }

  uploadSettings(version, config) {
    if (config.version && config.version === version) return;
    config.version = version;
    config.layout = Object.assign({}, {
      default: "commands",
      key: "pageSelector",
      type: "pageSelector",
      children: {},
    }, config.layout || {});
    config.layout.children.commands = this.genCommandChildren();
    this.pvpClient.replaceConfigMap("*", config);
  }

  genCommandChildren() {
    let commandChildren = {
      description: "bot commands",
      key: "commands",
      name: "commands",
      permNode: "",
      type: "commands",
      children: {},
    };

    commandChildren.children = this.moduleList.reduce(PvPCraft.moduleToConfigMap, {});

    return commandChildren;
  }

  readyIdleRestart() {
    setInterval(() => {
      if (Date.now() - lastMessage > this.waitBeforeRestart) {
        if (this.raven) {
          this.raven.captureMessage("Did not receive messages in " + this.waitBeforeRestart);
        }
        setTimeout(() => process.exit(45), 3000); //allow time to report sentry exception before exiting
      }
    }, 10000)
  }

  readyMessageSender() {
    this.messageSender = new MessageSender({ client: this.client, translate: this.translate });
  }

  readySlowSender() {
    this.slowSender = new SlowSender({ client: this.client, config: this.fileConfig });
  }

  readyRethinkDB() {
    this.r = R(this.fileAuth.get("reThinkDB", {}));
  }

  readyTaskQueue() {
    this.taskQueue = new TaskQueue({ r: this.r, client: this.client, restClient: this.restClient, raven: this.raven });
  }

  resolveWhenReady() {
    return this.readyPromise;
  }

  readyI10010n() {
    this.i10010n = i10010n.init({
      db: require("./translations/translations.db"),
      logger: this.captureMissingTranslation,
      defaultLocale: "en",
      addTemplateData: () => {
      },
    });
  }

  readyApi() {
    // const api = require("./lib/api");

    // api.ready(this.client, 3100 + this.shardId);
  }

  readyPvPClient() {
    const endpoint = this.fileAuth.get("pvpApiEndpoint", "api.pvpcraft.ca");
    const https = this.fileAuth.get("pvpApiHttps", true);
    const apiToken = this.fileAuth.get("pvpApiToken", "");
    if (!endpoint || !apiToken) {
      console.log("enable pvpapi integration by completing the pvpApiEndpoint, pvpApiHttps and pvpApiToken fields of the auth.json config file");
      return;
    }
    this.pvpClient = new PvPClient(endpoint, https, apiToken, this.client.user.id, this.client.guilds.map(g => g.id), this.client);
    this.pvpClient.on("error", (error) => {
      console.log(error);
      this.raven.captureException(error);
    });
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
    this.feeds = new Feeds({ client: this.client, r: this.r, configDB: this.configDB });
  }

  registerReadyListener() {
    this.client.on("ready", () => {
      this.resolveReadyPromise(true);
      console.log("Got ready");
      if (this.client.guilds.length <= this.fileConfig.get("minDiscords", 1)) {
        process.exit(56);
      }
    });
  }

  registerPreReadyClientListeners() {
    this.client.on("shardDisconnect", this.logShardUpdate.bind(this, "ShardDisconnect"));
    this.client.on("shardPreReady", this.logShardUpdate.bind(this, "preReady"));
    this.client.on("shardResume", this.logShardUpdate.bind(this, "Resume"));
    this.client.on("shardReady", this.logShardUpdate.bind(this, "Ready"));
  }

  registerPostReadyClientListeners() {
    this.client.on("guildDelete", this.onGuildDelete.bind(this));
    this.client.on("unavailableGuildCreate", this.onGuildCreate.bind(this));
    this.client.on("guildCreate", this.onGuildCreate.bind(this));
    this.client.on("messageCreate", this.onMessage.bind(this));
    this.client.on("error", this.onError.bind(this));
    this.client.on("shardDisconnect", this.onDisconnect.bind(this));
    this.client.on("shardReady", this.reload.bind(this));
    this.client.on("shardResume", this.reload.bind(this));
  }

  logShardUpdate(type, errorOrId, IDOrNull) {
    let error;
    let id;
    if (typeof errorOrId === "number") {
      id = errorOrId;
    } else {
      id = IDOrNull;
      error = errorOrId;
    }
    if (this.raven) {
      if (error) {
        this.raven.captureException(error, { extra: { type: type, id }, level: "info" });
      } else {
        this.raven.captureMessage(type + " Triggered", { level: "info" })
      }
    }
    console.log(type, errorOrId, IDOrNull);
  }

  onError(error) {
    if (this.raven) {
      this.raven.captureException(error);
    }
    console.error("Error", error);
    console.error(error.stack);
  }

  onDisconnect() {
    if (this.raven) {
      this.raven.captureMessage("Disconnected", { level: "info" })
    }
    console.log("Disconnect event called".red);
    for (let i in this.moduleList) {
      if (this.moduleList.hasOwnProperty(i)) {
        if (this.moduleList[i].module.onDisconnect) {
          this.moduleList[i].module.onDisconnect();
        }
      }
    }
  }

  onGuildCreate(server) {
    if (this.pvpClient) {
      this.pvpClient.addGuild(server.id);
    }
    let configs = [this.configDB.serverCreated(server), this.permsDB.serverCreated(server)];
    Promise.all(configs).then(() => {
      for (let middleware of this.middlewareList) {
        if (middleware.ware) {
          try {
            if (middleware.ware.onGuildCreate) {
              console.log(chalk.green("Notifying a middleware a server was created!"));
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
              console.log(chalk.green("Notifying a module a server was created!"));
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
    if (this.pvpClient) {
      this.pvpClient.removeGuild(server.id);
    }
    for (let middleware of this.middlewareList) {
      if (middleware.ware) {
        try {
          if (middleware.ware.onGuildDelete) {
            console.log(chalk.green(`Notifying a middleware a server was Deleted! shard ${process.env.id}`));
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
            console.log(chalk.green(`Notifying a module a server was Deleted! shard ${process.env.id}`));
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
      firstShardID: this.shardId,
      lastShardID: this.shardId,
      maxShards: this.shardCount,
      defaultImageFormat: "png",
    });
    this.restClient = new Eris(`Bot ${token}`, {
      autoReconnect: true,
      compress: true,
      disableEveryone: false,
      restMode: true,
      defaultImageFormat: "png",
    });
  }

  /**
   * Initiates the connection to discord.
   */
  login() {
    this.client.connect();
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
      this.perms = new Permissions(this.permsDB, this.analytics, this.translate);
      Promise.all([this.configDB.reload(), this.permsDB.reload()]).then(() => {
        resolve(true);
      }).catch(console.error);
    })
  }

  readyRaven() {
    return new Promise((resolve) => {
      let sentryEnv = this.fileConfig.get("sentryEnv", "");

      if (this.fileAuth.get("sentryURL", "") !== "") {
        console.log("Sentry Started".yellow);
        git.long((commit) => {
          git.branch((branch) => {
            this.git = { commit, branch };
            let sentryConfig = {
              release: commit + "-" + branch,
              debug: true,
              dsn: this.fileAuth.data.sentryURL,
            };
            if (sentryEnv) {
              sentryConfig.environment = sentryEnv
            }
            Sentry.init(sentryConfig);
            this.raven = Sentry

            Sentry.configureScope(function (scope) {
              scope.setTag("shardId", process.env.id);
              resolve(true);
            });

            this.raven.addGlobalEventProcessor(function (event, eventHint, eventId) {
              console.log(chalk.green(`Error reported to sentry!: ${event.event_id}`));
              if (process.env.dev == "true") {
                console.log(event);
              }
              return event;
            });

            /* this.raven.on("logged", function (e) {
              console.log(chalk.green("Error reported to sentry!: ") + e);
            });

            this.raven.on("error", function (e) {
              if (process.env.dev == "true") {
                console.error("Could not report an event to sentry:", e);
              } else {
                console.error("Could not report an event to sentry");
              }
            }); */
          })
        });
      } else {
        resolve(true);
      }
    })
  }

  captureMissingTranslation(errorType, data, message) {
    const errTypes = i10010n.ErrorTypes;
    let level;

    switch (errorType) {
      case errTypes.MISSING_TEMPLATE_DATA:
        level = "warning";
        break;
      case errTypes.MISSING_LOCALE_DATA:
        level = "info";
        break;
      case errTypes.USER_FUNCTION_FAILED:
      case errTypes.MISSING_DB:
      case errTypes.MISSING_LOCALE:
      default:
        level = "error";
        break;
    }

    this.raven.captureMessage(
      errorType,
      {
        level,
        tags: {
          locale: data.locale,
          user_function: data.user_function,
          template: (data.template || []).join(",").replace(/\s/g, "-"),
        },
        extra: Object.assign({ message }, data)
      }
    );
  }

  shutDown() {
    setTimeout(() => {
      process.exit(1)
    }, 5000);
    console.log("Logging out.");
    for (let middleware of this.middlewareList) {
      if (middleware.module) {
        if (middleware.module.onDisconnect) {
          console.log(chalk.green("Trying to Remove Listeners!"));
          middleware.module.onDisconnect();
        }
      }
    }
    for (let module of this.moduleList) {
      if (module.module) {
        if (module.module.onDisconnect) {
          console.log(chalk.green("Trying to Remove Listeners!"));
          module.module.onDisconnect();
        }
      }
    }
    this.middlewareList = [];
    this.moduleList = [];
    this.r.getPoolMaster().drain();
    this.client.on("disconnect", () => {
      console.log("Eris Logged out");
      process.exit(0);
    });
    this.client.disconnect({ reconnect: false });
    setTimeout(() => {
      console.log("Bye");
      process.exit(0);
    }, 2000);
  }

  reload() {
    this.prefix = this.configDB.get("prefix", ["!!", "//", "/"], { server: "*" });
    this.id = this.client.user.id;
    console.log("Default prefix", this.prefix);
    this.name = this.client.user.username;

    let oldModuleAndWareList = this.middlewareList.slice(0);
    oldModuleAndWareList.push(...this.moduleList);

    for (let module in oldModuleAndWareList) {
      if (oldModuleAndWareList.hasOwnProperty(module)) {
        try {
          if (oldModuleAndWareList[module].module && oldModuleAndWareList[module].module.onDisconnect) {
            console.log(chalk.green(`Removing Listeners for ${module}`));
            oldModuleAndWareList[module].module.onDisconnect();
          }
          delete oldModuleAndWareList[module];
        } catch (error) {
          console.error(error);
        }
      }
    }

    this.middlewareList = [];
    this.moduleList = [];

    let middlewares = this.fileConfig.get("middleware");
    let modules = this.fileConfig.get("modules");

    let moduleVariables = this.getModuleVariables();

    function verifyTriggers(commands) {
      for (let command of commands) {
        for (let trigger of command.triggers) {
          if (trigger.toLowerCase() !== trigger) {
            throw new Error(`Trigger \`${trigger}\` must be entirely lowercase.`)
          }
        }
      }
    }

    for (let module in modules) {
      if (modules.hasOwnProperty(module)) {
        try {
          let mod = new (require(modules[module]))(moduleVariables);
          if (mod.onReady) mod.onReady();
          const commands = mod.getCommands ? mod.getCommands() : [];
          verifyTriggers(commands);
          this.moduleList.push({ commands, "module": mod });
        } catch (error) {
          console.error(error);
        }
      }
    }
    for (let middleware in middlewares) {
      if (middlewares.hasOwnProperty(middleware)) {
        try {
          let ware = new (require(middlewares[middleware]))(moduleVariables);
          if (ware.onReady) ware.onReady();
          const commands = ware.getCommands ? ware.getCommands() : [];
          verifyTriggers(commands);
          this.middlewareList.push({ commands, "ware": ware });
        } catch (error) {
          console.error(error);
        }
      }
    }
  }

  getModuleVariables() {
    return {
      client: this.client,
      restClient: this.restClient,
      config: this.fileConfig,
      raven: this.raven,
      git: this.git,
      auth: this.fileAuth,
      configDB: this.configDB,
      r: this.r,
      perms: this.perms,
      feeds: this.feeds,
      messageSender: this.messageSender,
      slowSender: this.slowSender,
      pvpClient: this.pvpClient,
      pvpcraft: this,
      modules: this.moduleList,
      middleWares: this.middlewareList,
      taskQueue: this.taskQueue,
      i10010n: this.i10010n,
      getChannelLanguage: this.getChannelLanguage,
    };
  }

  reloadTarget(command) {
    for (let module in this.moduleList) {
      if (this.moduleList.hasOwnProperty(module) && this.moduleList[module].module.constructor.name === command.args[0]) {
        if (this.moduleList[module].module.onDisconnect) {
          this.moduleList[module].module.onDisconnect();
        }
        let modules = this.fileConfig.get("modules");
        delete require.cache[require.resolve(modules[command.args[0]])];
        utils.handleErisRejection(command.reply(command.translate`Reloading ${command.args[0]}`));
        console.log("Reloading ".yellow + command.args[0].yellow);
        let Mod = require(modules[command.args[0]]);
        let mod = new Mod(this.getModuleVariables());
        if (mod.onReady) mod.onReady();
        this.moduleList[module].module = mod;
        this.moduleList[module].commands = Mod.getCommands();
        console.log("Reloded ".yellow + command.args[0].yellow);
        utils.handleErisRejection(command.reply(command.translate`Reloded ${command.args[0]}`));
      }
    }
  }

  // eslint-disable-next-line complexity
  async onMessage(msg) {
    if (msg.author && msg.author.id === this.id) return;
    lastMessage = Date.now();
    let prefixes;

    // handle per server prefixes.
    if (msg.channel.guild) {
      prefixes = this.configDB.get("prefix", this.prefix, { server: msg.channel.guild.id });
    } else {
      prefixes = this.prefix;
    }
    //console.log(`Prefix ${l}`);
    //Message middleware starts here.
    for (let ware in this.middlewareList) {
      if (this.middlewareList.hasOwnProperty(ware) && this.middlewareList[ware].ware.onMessage) {
        this.middlewareList[ware].ware.onMessage(msg, this.perms)
      }
    }
    let command;
    try {
      command = Command.parse(prefixes, msg, this.perms, {
        allowMention: this.id,
        botName: this.name,
        i10010n: this.i10010n,
        getChannelLanguage: this.getChannelLanguage,
      });
    } catch (error) {
      if (this.raven) {
        let extra = {
          channel: msg.channel.id,
          channel_name: msg.channel.name,
          msg: msg.content,
        };
        if (command) {
          extra.command = command;
        }
        if (msg.hasOwnProperty("server")) {
          extra.guild = msg.channel.guild.id;
          extra.guild_name = msg.channel.guild.name;
        }
        this.raven.captureException(error, {
          user: msg.author,
          extra,
        });
      }
      utils.handleErisRejection(msg.channel.createMessage(this.translate(msg.channel.id)`${msg.author.mention}, Sorry about that an unknown problem occurred processing your command, an error report has been logged and we are looking into the problem.`));
    }

    for (let ware in this.middlewareList) {
      if (this.middlewareList.hasOwnProperty(ware) && this.middlewareList[ware].ware.changeMessage) {
        this._commandWrapper(ware, command, msg, () => {
          msg = this.middlewareList[ware].ware.changeMessage(msg);
        });
      }
    }
    if (command) {
      for (let ware in this.middlewareList) {
        if (this.middlewareList.hasOwnProperty(ware) && this.middlewareList[ware].ware.changeCommand) {
          this._commandWrapper(ware, command, msg, () => {
            command = this.middlewareList[ware].ware.changeCommand(msg, command, this.perms);
          });
        }
      }

      let result = await this.handleCommand(msg, command, this.moduleList, this.middlewareList);
      if (result) return result;
    }
    //apply misc responses.
    for (let mod in this.moduleList) {
      if (this.moduleList.hasOwnProperty(mod) && this.moduleList[mod].module.checkMisc) {
        let shouldReturn;
        this._commandWrapper(mod, command, msg, () => {
          shouldReturn = this.moduleList[mod].module.checkMisc(msg, this.perms, prefixes);
          return shouldReturn;
        });
        if (shouldReturn) return;
      }
    }
  }

  /**
   * Checks if a command is set to be usable with in a list of allowed types
   * @param {Channel|GuildChannel} channel
   * @param {Array<string>} allowed
   * @returns {boolean}
   */
  checkChannelAllowed(channel, allowed) {
    if (allowed.includes("*")) return true;
    if (channel instanceof Eris.GuildChannel && allowed.includes("guild")) return true;
    if (channel instanceof Eris.PrivateChannel && allowed.includes("dm")) return true;
    return false
  }

  /**
   * Handles executing a command
   * @param {Message} msg
   * @param {Command} userCommand
   * @param {Module || Array} modules
   * @param {Middleware || Array} middleware
   * @returns {Promise<boolean>}
   */
  async handleCommand(msg, userCommand, modules, middleware) {
    const modulesAndMiddleware = middleware.slice(0);
    modulesAndMiddleware.push(...modules);

    for (let module of modulesAndMiddleware) {
      for (let command of module.commands || module) {
        if (!command.triggers.includes(userCommand.command)) continue;
        if (command.subCommands && userCommand.args.length > 0) {
          if (this.handleCommand(msg, userCommand.subCommand(), [command.subCommands], [])) {
            return true;
          }
        }
        if (!command.permissionCheck(userCommand)) continue;
        if (!this.checkChannelAllowed(userCommand.channel, command.channels)) continue;
        const result = await this._commandWrapper(command, userCommand, msg, () => {
          return command.execute(userCommand)
        });
        if (result) return true;
      }
    }
  }

  registerProcessListeners() {
    process.on("unhandledRejection", this.captureError.bind(this));
    if (process.env.dev === "true") {
      process.on("uncaughtException", (error) => {
        console.error(error);
      });
    }
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
  async _commandWrapper(mod, command, msg, callCommandFunction) {
    let returnValue;
    try {
      returnValue = await callCommandFunction();
    } catch (error) {
      if (this.raven) {
        let extra = {
          mod: mod,
          channel: msg.channel,
          command: command && command.toJSON ? command.toJSON() : command,
        };
        if (msg.channel.hasOwnProperty("guild")) {
          extra.guild = msg.channel.guild;
        }
        if (process.env.dev === "true") {
          console.error(error);
        }
        const id = this.raven.captureException(error, {
          user: (msg.hasOwnProperty("author") && msg.author.toJSON) ? msg.author.toJSON() : msg.author,
          extra,
        });
        utils.handleErisRejection(msg.channel.createMessage(this.translate(msg.channel.id)`Sorry, there was an error processing your command. The error is \`\`\`${error
        }\`\`\` reference code \`${id}\``));
        if (process.env.dev === "true") {
          console.error(error);
        }
      } else {
        console.error(error);
      }
      return true;
    }
    return returnValue;
  }

  captureError(error) {
    if (this.raven) {
      this.raven.captureException(error, (sendError, resultId) => {
        if (sendError) {
          console.error("Failed to report", error)
        } else {
          console.log(`Logged error ID:${resultId} to sentry`);
        }
        if (process.env.dev === "true") {
          console.error(error);
        }
      });
    } else {
      console.error(error);
    }
  }

  getChannelLanguage(channelID, guildID) {
    if (!guildID) {
      guildID = this.client.channelGuildMap[channelID];
    }
    const languages = this.configDB.get("languages", null, { server: guildID });
    if (languages && Object.prototype.hasOwnProperty.call(languages, channelID)) {
      return languages[channelID];
    }
    if (languages && Object.prototype.hasOwnProperty.call(languages, "*")) {
      return languages["*"];
    }
    return "en";
  }
}

module.exports = PvPCraft;
