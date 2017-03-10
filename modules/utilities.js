/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

let utils = require('../lib/utils');

let now = require('performance-now');

const os = require('os');
const numCPUs = os.cpus().length;

class utilities {
  /**
   * Instantiates the module
   * @constructor
   * @param {Object} e
   * @param {Client} e.client Eris client
   * @param {Config} e.config File based config
   * @param {Raven?} e.raven Raven error logging system
   * @param {Config} e.auth File based config for keys and tokens and authorisation data
   * @param {ConfigDB} e.configDB database based config system, specifically for per guild settings
   * @param {R} e.r Rethinkdb r
   * @param {Permissions} e.perms Permissions Object
   * @param {Feeds} e.feeds Feeds Object
   * @param {MessageSender} e.messageSender Instantiated message sender
   * @param {SlowSender} e.slowSender Instantiated slow sender
   * @param {PvPClient} e.pvpClient PvPCraft client library instance
   */
  constructor(e) {
    this.git = e.git;
    this.client = e.client;
    this.config = e.config;
  }

  static getCommands() {
    return ["serverinfo", "server", "userinfo", "user", "ping", "lmgtfy", "statu"];
  }

  /**
   * Called with a command, returns true or a promise if it is handling the command, returns false if it should be passed on.
   * @param {Message} msg
   * @param {Command} command
   * @param {Permissions} perms
   * @returns {boolean | Promise}
   */
  onCommand(msg, command, perms) {
    if ((command.command === "serverinfo" || command.command === "server") && perms.check(msg, "utils.serverinfo")) {
      let guild = msg.channel.guild;
      let botCount = guild.members.filter(m => m.bot).length;
      let owner = guild.members.get(guild.ownerID);
      command.createMessageAutoDeny({
        embed: {
          title: `Server Info for ${utils.clean(msg.channel.guild.name)}`,
          description: `Id: ${guild.id}\n` +
          `Created: ${new Date(guild.createdAt).toUTCString()}\n` +
          `Owner: ${utils.clean(owner.username)}\n` +
          `Humans: ${(guild.members.size - botCount)} Bots: ${botCount}\n` +
          `Voice Region: ${guild.region}\n` +
          `Roles: ${utils.clean(guild.roles.map(r => r.name).join(", "))}` +
          `Icon URL: ${guild.iconURL}`,
          thumbnail: {url: guild.iconURL},
        }
      });
      return true;
    }

    if ((command.command === 'userinfo' || command.command === 'user') && perms.check(msg, "utils.userinfo")) {
      let guild = msg.channel.guild;
      let string = "";
      let member;
      let targets = command.args;
      if (command.args.length === 0) {
        targets.push("<@" + msg.author.id + ">");
      }
      for (let arg of targets) {
        if (/(?:<@|<@!)\d+>/.test(arg)) {
          member = msg.channel.guild.members.get(arg.match(/(?:<@|<@!)(\d+)>/)[1]);
        } else {
          member = msg.channel.guild.members.get("name", arg)
        }
        if (member) {
          let comaUserNameCodes = [...member.username].map(char => char.charCodeAt(0)).join(", ");
          command.createMessageAutoDeny({
            embed: {
              title: `User Info for ${utils.clean(member.username)}`,
              description:
              `Char Codes: ${comaUserNameCodes}\n` +
              ((member.nick) ? `Nick: ${utils.clean(member.nick)}\n` : "") +
              `Id: ${member.id}\n` +
              `Descrim: ${member.discriminator}\n` +
              `Created: ${new Date(member.createdAt).toUTCString()}\n` +
              `Joined: ${new Date(member.joinedAt).toUTCString()}\n` +
              `Avatar URL: ${member.avatarURL}\n`,
              thumbnail: {url: member.avatarURL},
            }
          });
        }
        else {
          string += "Could not find **" + utils.clean(arg) + "**.\n";
        }
      }
      if (string !== "") command.createMessageAutoDeny(string);
      return true;
    }

    if ((command.command === 'ping') && perms.check(msg, 'utils.ping')) {
      let t1 = now();
      command.createMessageAutoDeny("Testing Ping").then((message) => {
        let t2 = now();
        this.client.editMessage(message.channel.id, message.id, "Ping is `" + (t2 - t1) + "`ms!");
      });
      return true;
    }

    //http://lmgtfy.com/?q=How+to+hug
    if ((command.command === 'lmgtfy') && perms.check(msg, 'utils.lmgtfy')) {
      command.createMessageAutoDeny(`http://lmgtfy.com/?q=${command.args.join("+")}`);
      return true;
    }

    if ((command.command === 'status') && perms.check(msg, 'utils.status')) {
      command.createMessageAutoDeny({
        embed: {
          title: `Status info`,
          description:
            `\`\`\`xl\nShard: ${process.env.id}/${process.env.shards}\n` +
            `CPU: ${os.loadavg()[0] / numCPUs * 100}%\n` +
            `LoadAverage ${os.loadavg()}\n` +
            `Memory usage: ${process.memoryUsage().heapTotal / 1000000}MB\n` +
            `RSS: ${process.memoryUsage().rss / 1000000}MB\n\`\`\`` +
            `Version: [current](https://github.com/macdja38/pvpcraft/commit/${this.git.commit}), [outdated by](https://github.com/macdja38/pvpcraft/compare/${this.git.commit}...${this.git.branch})`,
          thumbnail: {url: this.client.user.avatarURL},
        }
      });
      return true;
    }
    return false;
  }
}

module.exports = utilities;