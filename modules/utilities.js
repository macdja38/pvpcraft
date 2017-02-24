/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

let utils = require('../lib/utils');

var now = require('performance-now');

const os = require('os');
const numCPUs = os.cpus().length;

var utilities = class utilities {
  constructor(e) {
    this.client = e.client;
    this.config = e.config;
  }

  getCommands() {
    return ["serverinfo", "server", "userinfo", "user", "ping", "lmgtfy", "statu"];
  }

  checkMisc() {
    return false;
  }

  onCommand(msg, command, perms) {
    if ((command.command === "serverinfo" || command.command === "server") && perms.check(msg, "utils.serverinfo")) {
      let guild = msg.channel.guild;
      let botCount = guild.members.filter(m => m.bot).length;
      let owner = guild.members.get(guild.ownerID);
      msg.channel.createMessage({
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
          msg.channel.createMessage({
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
      if (string !== "") msg.channel.createMessage(string);
      return true;
    }

    if ((command.command === 'ping') && perms.check(msg, 'utils.ping')) {
      let t1 = now();
      msg.channel.createMessage("Testing Ping").then((message) => {
        let t2 = now();
        this.client.editMessage(message.channel.id, message.id, "Ping is `" + (t2 - t1) + "`ms!");
      });
      return true;
    }

    //http://lmgtfy.com/?q=How+to+hug
    if ((command.command === 'lmgtfy') && perms.check(msg, 'utils.lmgtfy')) {
      msg.channel.createMessage(`http://lmgtfy.com/?q=${command.args.join("+")}`);
      return true;
    }

    if ((command.command === 'status') && perms.check(msg, 'utils.status')) {
      msg.channel.createMessage({
        embed: {
          title: `Status info`,
          description:
            `\`\`\`xl\nShard: ${process.env.id}/${process.env.shards}\n` +
            `CPU: ${os.loadavg()[0] / numCPUs * 100}%\n` +
            `LoadAverage ${os.loadavg()}\n` +
            `Memory usage: ${process.memoryUsage().heapTotal / 1000000}MB\n` +
            `RSS: ${process.memoryUsage().rss / 1000000}MB\n\`\`\``,
          thumbnail: {url: this.client.user.avatarURL},
        }
      });
      return true;
    }
    return false;
  }
};

module.exports = utilities;