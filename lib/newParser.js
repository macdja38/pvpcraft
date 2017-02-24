/**
 * Created by macdja38 on 2016-04-21.
 */
"use strict";

const regargs = /^((?:.|\n)*?)(?= -|$)/;
const regAll = /(?:(?:\s--)(\w+).(\n|.*?)(?= -|\n|$)|(?:\s-)([^-]*?)(?= -|\n|$))/g;

function DefaultOptions(defaults, options) {

  if (!options) {
    options = {};
  }

  for (let key in defaults) {
    //noinspection JSUnfilteredForInLoop
    if (!options.hasOwnProperty(key)) {
      //noinspection JSUnfilteredForInLoop
      options[key] = defaults[key];
    }
  }

  return options;
}

let defaults = {
  allowMention: false,
  botName: false
};

exports.command = function (prefix, message, options) {

  options = DefaultOptions(defaults, options);

  /*
   >>help command subcommand --arg1 bop --arg2 bop bop -fl --verbose

   should ideally output:
   {
   command : "help",
   args : ["command", "subcommand"],
   options : {
   arg1 : "bop",
   arg2 : "bop bop"
   verbose : true
   },
   flags : ["f", "l"]
   }
   */
  function isValidCommandType() {
    let insen = message.content.trim().toLowerCase();
    let m = message.content;
    for (let i in prefix) {
      if (insen.indexOf(prefix[i].toLowerCase()) === 0) {
        m = m.substr(prefix[i].length);
        return {prefix: clean(prefix[i]), content: m};
      }
    }
    if (options.allowMention) {
      // see if the user is mentioned
      let mentionRegex = new RegExp(`^<@!?${options.allowMention}>`);
      if (mentionRegex.test(insen)) {
        m = m.replace(mentionRegex, "");
        return {prefix: "@" + options.botName + " ", content: m};
      }
    }
    return false;
  }

  let prefixUsed = isValidCommandType();
  if (!prefixUsed) {
    return false;
  }
  let content = prefixUsed.content;
  prefixUsed = prefixUsed.prefix;

  let args, flags = [];
  options = {};

  args = regargs.exec(content)[1].trim().split(" ");
  for (let i in args) {
    if (args[i] === "") {
      args.splice(i, 1);
    }
  }
  let reg = regAll;
  let myArray;
  while ((myArray = reg.exec(content)) !== null) {
    if (myArray[1] && myArray[2]) {
      options[myArray[1]] = myArray[2];
    }
    if (myArray[3]) {
      flags = flags.concat(myArray[3].split(""));
    }
  }

  if (args[0]) {
    args[0] = args[0].toLowerCase();
  }

  let command = {
    command: args[0],
    commandnos: args[0] ? (args[0][args[0].length - 1] === "s" ? args[0].slice(0, -1) : args[0]) : args[0],
    prefix: prefixUsed,
    args: args.slice(1),
    options: options,
    flags: flags
  };

  if (options.role && message.channel.guild) {
    let role;
    if (/<@&\d+>/.test(options.role)) {
      let roleId = options.role.match(/<@&(\d+)>/)[1];
      role = message.channel.guild.roles.get(roleId);
    }
    else {
      role = message.channel.guild.get(options.role);
    }
    if (role) {
      command.role = role;
    }
  }

  if (options.channel && message.channel.guild) {
    let channel;
    if (options.channel) {
      if (/<#\d+>/.test(options.channel)) {
        let channelId = options.channel.match(/<#(\d+)>/)[1];
        channel = message.channel.guild.channels.get(channelId);
      }
      else {
        channel = message.channel.guild.channels.find(c => c.name === options.channel);
      }
      if (channel) {
        //if we found the channel check their permissions then define the channel.
        command.channel = channel;
      }
    }
  }

  if (options.user && message.channel.guild) {
    let user;
    if (/<(?:@!|!)\d+>/.test(options.user)) {
      let userId = options.user.match(/<(?:@!|@)(\d+)>/)[1];
      user = message.channel.guild.members.get(userId);
    }
    else {
      let userName = options.user.toUpperCase();
      user = message.channel.guild.members.find(a => a.username.toUpperCase() == userName);
    }
    if (user) {
      //if we found the user check their permissions then define the user.
      command.user = user;
    }
  }

  return command;
};

function clean(text) {
  if (typeof(text) === "string") {
    return text.replace("``", "`" + String.fromCharCode(8203) + "`").replace("//", "/" + String.fromCharCode(8203) + "/");
  }
  else {
    return text;
  }
}
