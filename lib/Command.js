/**
 * Created by macdja38 on 2017-02-27.
 */
"use strict";

/**
 * The object that describes the content of the message that will be sent to discord.
 * @typedef {String | Object} Command~MessageContent A string or object. If an object is passed:
 * @property {String} [content] A content string
 * @property {Boolean} [tts] Set the message TTS flag
 * @property {Boolean} [disableEveryone] Whether to filter @everyone/@here or not (overrides default)
 * @property {Object} [embed] An embed object. See [the official Discord API documentation entry](https://discordapp.com/developers/docs/resources/channel#embed-object) for object structure
 */

/**
 * A file object
 * @typedef {Object} Command~MessageFile
 * @param {String} file A buffer containing file data
 * @param {String} name What to name the file
 */

/**
 * A Message Options object
 * @typedef {Object} Command~MessageOptions
 */

const utils = require('./utils');
const regargs = /^((?:.|\n)*?)(?= -\w| --\w|$)/;
const regAll = /(?:\s--(?=\S)(\w+)\s((?:.|\n)*?)|\s-(?=\w)(?!-)((?:.|\n)*?))(?= -\w| --\w|$)/g;

const defaults = {
  allowMention: false,
  botName: false,
};

const mentionRegexCache = {};

/**
 * Returns a regex that finds a mention with the specified id.
 * @param {string} id
 * @returns {RegExp}
 * @private
 */
function getMentionRegex(id) {
  if (!mentionRegexCache.hasOwnProperty(id)) {
    mentionRegexCache[id] = new RegExp(`^<@!?${id}>`);
  }
  return mentionRegexCache[id];
}

/**
 * Apply default options
 * @param {Object} defaults
 * @param {Object} options
 * @returns {Object}
 * @private
 */
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

/**
 * Command class
 * @typedef Command
 * @class
 * @property {Role} [role] Role mentioned by command
 * @property {Channel} [channel] Channel mentioned by command
 * @property {User} [user] User mentioned by command
 * @property {string} command command text
 * @property {string} commandNoS command text without trailing s
 * @property {string} prefix prefix used to trigger the command
 * @property {string[]} args arguments imputed with command
 * @property {Object} options options run with command, eg `--user Mario`
 * @property {string[]} flags flags run with command eg `-f`
 * @property {Message} msg message that triggered the command object's creation
 * @property {Channel} channel channel message that triggered command was sent in
 * @property {User} author user that sent the message that triggered the command
 * @property {Member} member member that sent the message that triggered the command
 * @property {Permissions} perms Permission object
 * @property {Raven} [raven] Raven Sentry library
 */
class Command {
  /**
   *
   * @param {string} command command text
   * @param {string} commandNoS command text without trailing s
   * @param {string} prefix prefix used to trigger the command
   * @param {string[]} args arguments imputed with command
   * @param {Object} options options run with command, eg `--user Mario`
   * @param {string[]} flags flags run with command eg `-f`
   * @param {Message} msg message that triggered the command object's creation
   * @param {Permissions} perms Permission object
   * @param {Raven} [raven] Raven Sentry library
   */
  constructor(command, commandNoS, prefix, args, options, flags, msg, perms, raven) {
    this.command = command;
    this.commandnos = commandNoS;
    this.prefix = prefix;
    this.args = args;
    this.options = options;
    this.flags = flags;
    this.msg = msg;
    this.channel = msg.channel;
    this.member = msg.member;
    this.author = msg.author;
    this.raven = raven;
    this.perms = perms;

    this.autoDenyPermission = this.autoDenyPermission.bind(this)
  }

  /**
   * Checks if command is valid, returns a data object if it is, false if not.
   * @param {Array<string>} prefixes
   * @param {Message} message
   * @param {Object} options
   * @param {boolean | string | null} [options.allowMention = false] if a string is supplied will check for mentions with that id
   * @returns {boolean | Object<{prefix: string, content: string}>}
   * @private
   */
  static _isValidCommandType(prefixes, message, options) {
    const lowercaseMessage = message.content.trim().toLowerCase();
    for (let prefix of prefixes) {
      if (lowercaseMessage.indexOf(prefix.toLowerCase()) === 0) {
        const content = message.content.substr(prefix.length);
        return {prefix: utils.clean(prefix), content};
      }
    }
    if (options.allowMention) {
      // see if the user is mentioned
      const mentionRegex = getMentionRegex(options.allowMention);
      if (mentionRegex.test(lowercaseMessage)) {
        const content = message.content.replace(mentionRegex, "");
        return {prefix: `@${options.botName} `, content};
      }
    }
    return false;
  }

  /**
   * Parses a message and returns a command if it is a command and false if not.
   * @param {Array<string>} prefix
   * @param {Message} message
   * @param {Permissions} perms
   * @param {Object} [options]
   * @param {Raven} [options.raven]
   * @param {boolean} [options.allowMention]
   * @param {string} [options.botName] bot's name, used as prefix if the bot is mentioned
   * @returns {Command | boolean}
   */
  static parse(prefix, message, perms, options = {}) {
    options = DefaultOptions(defaults, options);

    let commandType = this._isValidCommandType(prefix, message, options);
    if (!commandType) {
      return false;
    }
    let content = commandType.content;
    let prefixUsed = commandType.prefix;

    let flags = [];
    let commandOptions = {};

    let args = regargs.exec(content)[1].trim().split(" ");
    for (let i in args) {
      if (args.hasOwnProperty(i) && args[i] === "") {
        args.splice(parseInt(i), 1);
      }
    }
    let myArray;
    while ((myArray = regAll.exec(content)) !== null) {
      if (myArray[1] && myArray[2]) {
        commandOptions[myArray[1]] = myArray[2];
      }
      if (myArray[3]) {
        flags = flags.concat(myArray[3].split(""));
      }
    }

    if (args[0]) {
      args[0] = args[0].toLowerCase();
    }

    let command = new Command(args[0],
      args[0] ? (args[0][args[0].length - 1] === "s" ? args[0].slice(0, -1) : args[0]) : args[0],
      prefixUsed,
      args.slice(1),
      commandOptions,
      flags,
      message,
      perms,
      options.raven,
    );

    if (commandOptions.role && message.channel.guild) {
      let role;
      if (/<@&\d+>/.test(commandOptions.role)) {
        let roleId = commandOptions.role.match(/<@&(\d+)>/)[1];
        role = message.channel.guild.roles.get(roleId);
      }
      else {
        role = message.channel.guild.roles.find(r => r.name === commandOptions.role);
      }
      if (role) {
        command.role = role;
      }
    }

    if (commandOptions.channel && message.channel.guild) {
      let channel;
      if (commandOptions.channel) {
        if (/<#\d+>/.test(commandOptions.channel)) {
          let channelId = commandOptions.channel.match(/<#(\d+)>/)[1];
          channel = message.channel.guild.channels.get(channelId);
        }
        else {
          channel = message.channel.guild.channels.find(c => c.name === commandOptions.channel);
        }
        if (channel) {
          //if we found the channel check their permissions then define the channel.
          command.channel = channel;
        }
      }
    }

    if (commandOptions.user && message.channel.guild) {
      let user;
      if (/<(?:@!|!)\d+>/.test(commandOptions.user)) {
        let userId = commandOptions.user.match(/<(?:@!|@)(\d+)>/)[1];
        user = message.channel.guild.members.get(userId);
      }
      else {
        let userName = commandOptions.user.toUpperCase();
        user = message.channel.guild.members.find(a => a.username.toUpperCase() === userName);
      }
      if (user) {
        //if we found the user check their permissions then define the user.
        command.user = user;
      }
    }

    return command;

  }

  /**
   * Replies to command in a text channel
   * Note: If you want to DM someone, the user ID is **not** the DM channel ID. use Client.getDMChannel() to get the DM channel ID for a user
   * Note: This function will modify a string if passed to add a mention at the start for the author that sent the command, it will not modify arguments if passed an object
   * @param {MessageContent | String} content {@link #Command~MessageContent|content} object
   * @param {MessageFile} [file] A {@link #Command~MessageFile|file} object
   * @param {MessageOptions} [options] A {@link #Command~MessageOptions|options} object
   * @returns {Promise<Message>}
   * @private
   */
  _reply(content, file, options) {
    if (typeof content === "string") {
      content = `${this.msg.author.mention} ${content}`;
    } else {
      if (typeof content.content === "string") {
        content.content = `${this.msg.author.mention} ${content.content}`;
      }
    }
    return this.msg.channel.createMessage(content, file, options);
  }

  /**
   * Replies to command in a text channel
   * Note: If you want to DM someone, the user ID is **not** the DM channel ID. use Client.getDMChannel() to get the DM channel ID for a user
   * Note: This function will modify a string if passed to add a mention at the start for the author that sent the command, it will not modify arguments if passed an object
   * @param {MessageContent | String} content {@link #Command~MessageContent|content} object
   * @param {MessageFile} [file] A {@link #Command~MessageFile|file} object
   * @param {MessageOptions} [options] A {@link #Command~MessageOptions|options} object
   * @returns {Promise<Message>}
   */
  reply(content, file, options) {
    return this.capturePromiseRejection(this._reply(content, file, options), content);
  }

  /**
   * Replies to command in a text channel. If the bot does not have permission to send messages it the channel it will deny all permissions in the channel.
   * Note: If you want to DM someone, the user ID is **not** the DM channel ID. use Client.getDMChannel() to get the DM channel ID for a user
   * Note: This function will modify a string if passed to add a mention at the start for the author that sent the command, it will not modify arguments if passed an object
   * @param {MessageContent | String} content {@link #Command~MessageContent|content} object
   * @param {MessageFile} [file] A {@link #Command~MessageFile|file} object
   * @param {MessageOptions} [options] A {@link #Command~MessageOptions|options} object
   * @returns {Promise<Message>}
   */
  replyAutoDeny(content, file, options) {
    return this.capturePromiseRejection(this._reply(content, file, options).catch(this.autoDenyPermission), content);
  }

  /**
   * Create a message in a text channel
   * Note: If you want to DM someone, the user ID is **not** the DM channel ID. use Client.getDMChannel() to get the DM channel ID for a user
   * @param {MessageContent | String} content {@link #Command~MessageContent|content} object
   * @param {MessageFile} [file] A {@link #Command~MessageFile|file} object
   * @param {MessageOptions} [options] A {@link #Command~MessageOptions|options} object
   * @returns {Promise<Message>}
   */
  createMessage(content, file, options) {
    return this.capturePromiseRejection(this.msg.channel.createMessage(content, file, options), content);
  }

  /**
   * Create a message in the channel the command was sent in. If the bot does not have permission to send messages it the channel it will deny all permissions in the channel.
   * Note: If you want to DM someone, the user ID is **not** the DM channel ID. use Client.getDMChannel() to get the DM channel ID for a user
   * @param {MessageContent | String} content {@link #Command~MessageContent|content} object
   * @param {MessageFile} [file] A {@link #Command~MessageFile|file} object
   * @param {MessageOptions} [options] A {@link #Command~MessageOptions|options} object
   * @returns {Promise<Message>}
   */
  createMessageAutoDeny(content, file, options) {
    return this.capturePromiseRejection(this.msg.channel.createMessage(content, file, options).catch(this.autoDenyPermission), content);
  }

  autoDenyPermission(error) {
    //noinspection EqualityComparisonWithCoercionJS we want it to have coercion to check for undefined and similar
    if (error.response == null) {
      throw error;
    } else if (JSON.parse(error.response).code === 50013) {
      let channel = this.msg.channel;
      let guild = channel.guild;
      if (!guild) throw error;
      this.perms.set(`${guild.id}.${channel.id}`, "remov", {write: false});
      this.perms.set(`${guild.id}.${channel.id}.*`, "deny", {write: true});
      let owner = guild.members.get(guild.ownerID);
      if (owner) {
        owner.user.getDMChannel().then(channel =>
          channel.createMessage(`Hello, I've removed and denied the permissions configuration for channel ` +
            `${this.msg.channel.mention} on ${guild.name} as I didn't have permissions to send messages in ` +
            `that channel. Please use /perms list on that server to see the new configuration.`),
        );
      }
    } else {
      throw error;
    }
  }

  /**
   * Logs any error edited by the promise to sentry and stops unhandled promise rejections
   * @param promise
   * @param {Object} [context] Context to be added to the error rejection
   * @returns {*}
   */
  capturePromiseRejection(promise, context) {
    promise.catch(this.captureException.bind(this, context));
    return promise;
  }

  /**
   * @returns {Object}
   */
  toJSON() {
    return {
      command: this.command,
      commandNoS: this.commandnos,
      prefix: this.prefix,
      args: this.args,
      options: this.options,
      flags: this.flags,
      msg: this.msg,
    };
  }

  /**
   * Captures an exception and provides the Command object as context.
   * @param {Object} context
   * @param {Error} error
   */
  captureException(context, error) {
    if (this.raven) {
      let extra = this.toJSON();
      if (context != null) {
        extra.context = context;
      }
      this.raven.captureException(error, {
        user: this.msg.author && this.msg.author.toJSON ? this.msg.author.toJSON() : this.msg.author,
        extra,
      })
    } else {
      console.error(error, context);
    }
  }
}

module.exports = Command;