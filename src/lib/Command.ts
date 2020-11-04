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
 * @property {Object} [embed] An embed object. See {@link https://discordapp.com/developers/docs/resources/channel#embed-object|the official Discord API documentation entry} for object structure
 */

/**
 * A file object
 * @typedef {Object} Command~MessageFile
 * @param {String} file A buffer containing file data
 * @param {String} name What to name the file
 */

import Eris, {
  Channel,
  Guild,
  GuildChannel,
  Member,
  Message,
  MessageContent,
  MessageFile,
  Role,
  TextableChannel, TextChannel,
  User,
} from "eris";
import { MessageOptions } from "child_process";
import Permissions from "./Permissions";
import { isGuildChannel } from "../types/utils";
import { ErisError } from "../types/eris";
import { translateType } from "../types/translate";
import Sentry from "@sentry/node"

/**
 * A Message Options object
 * @typedef {Object} Command~MessageOptions
 */

const utils = require('./utils');
const regargs = /^((?:.|\n)*?)(?= -\w| (?:--|—)\w|$)/;
const regAll = /(?:\s(?:--|—)(?=\S)(\w+)\s((?:.|\n)*?)|\s-(?=\w)(?!-)((?:.|\n)*?))(?= -\w| (?:--|—)\w|$)/g;

const EE = require("eris-errors");

const DEFAULTS = {
  allowMention: false,
  botName: false,
};

const mentionRegexCache: { [keyof: string]: RegExp } = {};

/**
 * Returns a regex that finds a mention with the specified id.
 * @param {string} id
 * @returns {RegExp}
 * @private
 */
function getMentionRegex(id: string) {
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
function defaultOptions<Options extends { [keyof: string]: any }>(defaults: typeof DEFAULTS, options: Options) {
  for (let [key, value] of Object.entries(defaults)) {
    if (!options.hasOwnProperty(key)) {
      // @ts-ignore
      options[key] = value;
    }
  }

  return options;
}

/**
 * If the string ends with an s return the string without the s, else return the string
 * For example alerts -> alert or alert -> alert
 * @param string
 * @returns {*}
 */
function removeTrailingS(string: string) {
  return string ? (string[string.length - 1] === "s" ? string.slice(0, -1) : string) : string;
}

/**
 * Command class
 * @class Command
 * @property {Role} [role] Role mentioned by command
 * @property {Channel} [channel] Channel mentioned by command
 * @property {Member} [user] User mentioned by command
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
 */
class Command {
  public command: string;
  public commandnos: string;
  public readonly prefix: string;
  public args: string[];
  public readonly options: { [keyof: string]: string };
  public readonly flags: string[];
  public readonly msg: Message;
  public readonly member: Member | undefined;
  public readonly author: User;
  public readonly perms: any;
  public readonly translate: translateType;
  public channel: Eris.Channel;
  public user?: User;
  public role: any;
  public targetRole?: Role;
  public targetUser?: User | Member;
  public targetChannel?: Eris.Channel;

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
   * @param {Function} translate internationalization function with bound language
   */
  constructor(command: string, commandNoS: string, prefix: string, args: string[], options: { [keyof: string]: string }, flags: string[], msg: Message, perms: any, translate: translateType) {
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
    this.perms = perms;
    this.translate = translate;

    this.autoDenyPermission = this.autoDenyPermission.bind(this)
  }

  /**
   * Returns a shallow clone of the command
   * @returns {Command}
   */
  clone() {
    let newCommand = new Command(this.command, this.commandnos, this.prefix, this.args, this.options, this.flags, this.msg, this.perms, this.translate);
    newCommand.user = this.user;
    newCommand.channel = this.channel;
    newCommand.role = this.role;
    return newCommand;
  }

  /**
   * Removes the first argument and makes it the command
   * @returns {Command}
   */
  subCommand() {
    let subCommand = this.clone();
    subCommand.command = this.args[0];
    subCommand.commandnos = removeTrailingS(this.args[0]);
    subCommand.args = this.args.slice(1);
    return subCommand;
  }

  /**
   * Checks if command is valid, returns a data object if it is, false if not.
   * @param {Array<string>} prefixes
   * @param {Message} message
   * @param {Object} options
   * @param {boolean | string | null} [options.allowMention = false] if a string is supplied will check for mentions with that id
   * @param {String} [options.botName] The bot's username / name you want in the mention as a prefix. Must be provided if allowMention is provided
   * @returns {boolean | Object<{prefix: string, content: string}>}
   * @private
   */
  static _isValidCommandType(prefixes: string[], message: Message, options: { allowMention?: false | string, botName?: string }) {
    const lowercaseMessage = message.content.trim().toLowerCase();
    for (let prefix of prefixes) {
      if (lowercaseMessage.indexOf(prefix.toLowerCase()) === 0) {
        const content = message.content.substr(prefix.length);
        return { prefix: utils.clean(prefix), content };
      }
    }
    if (options.allowMention) {
      // see if the user is mentioned
      const mentionRegex = getMentionRegex(options.allowMention);
      if (mentionRegex.test(lowercaseMessage)) {
        const content = message.content.replace(mentionRegex, "");
        return { prefix: `@${options.botName} `, content };
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
   * @param {boolean | string} [options.allowMention]
   * @param {string} [options.botName] bot's name, used as prefix if the bot is mentioned
   * @param {Function} options.i10010n internationalization function
   * @param {Function} options.getChannelLanguage function to get language of channel
   * @returns {Command | boolean}
   */
  static parse(prefix: string[], message: Message, perms: Permissions, options: { botName?: string; allowMention?: false | string; i10010n: (language: string) => translateType, getChannelLanguage: (channelID: string) => string }) {
    options = defaultOptions<typeof options>(DEFAULTS, options);

    let commandType = this._isValidCommandType(prefix, message, options);
    if (!commandType) {
      return false;
    }
    let content = commandType.content;
    let prefixUsed = commandType.prefix;

    let flags: Command["flags"] = [];
    let commandOptions: Command["options"] = {};

    // @ts-ignore
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

    const translate = options.i10010n(options.getChannelLanguage(message.channel.id));

    let command = new Command(args[0],
      removeTrailingS(args[0]),
      prefixUsed,
      args.slice(1),
      commandOptions,
      flags,
      message,
      perms,
      translate,
    );

    // @ts-ignore
    if (commandOptions.role && message.channel.guild) {
      let role;
      const roleMatch = commandOptions.role.match(/<@&(\d+)>/);
      if (roleMatch) {
        let roleId = roleMatch[1];
        // @ts-ignore
        role = message.channel.guild.roles.get(roleId);
      } else {
        // @ts-ignore
        role = message.channel.guild.roles.find(r => r.name === commandOptions.role);
      }
      if (role) {
        command.targetRole = role;
      }
    }

    const isGuildTextChannel = (channel: TextableChannel): channel is TextChannel => {
      return channel instanceof TextChannel;
    }

    if (commandOptions.channel && isGuildTextChannel(message.channel)) {
      let channel: Eris.Channel | undefined;
      if (commandOptions.channel) {
        const commandOptionsMatch = commandOptions.channel.match(/<#(\d+)>/);
        if (commandOptionsMatch) {
          let channelId = commandOptionsMatch[1];
          channel = message.channel.guild.channels.get(channelId);
        } else {
          channel = message.channel.guild.channels.find(c => c.name === commandOptions.channel);
        }
        if (channel) {
          //if we found the channel check their permissions then define the channel.
          command.channel = channel;
          command.targetChannel = channel;
        }
      }
    }

    if (commandOptions.user && isGuildChannel(message.channel)) {
      let user;
      const commandOptionsUserMatch = commandOptions.user.match(/<@!?(\d+)>/)
      if (commandOptionsUserMatch) {
        let userId = commandOptionsUserMatch[1];
        user = message.channel.guild.members.get(userId);
      } else {
        let userName = commandOptions.user.toUpperCase();
        user = message.channel.guild.members.find(a => a.username.toUpperCase() === userName);
      }
      if (user) {
        //if we found the user check their permissions then define the user.
        command.targetUser = user;
      }
    }

    return command;

  }

  /**
   * Replies to command in a text channel
   * Note: If you want to DM someone, the user ID is **not** the DM channel ID. use Client.getDMChannel() to get the DM channel ID for a user
   * Note: This function will modify a string if passed to add a mention at the start for the author that sent the command, it will not modify arguments if passed an object
   * @param {Command~MessageContent | String} content {@link #Command~MessageContent|content} object
   * @param {Command~MessageFile} [file] A {@link #Command~MessageFile|file} object
   * @returns {Promise<Message>}
   * @private
   */
  _reply(content: MessageContent, file?: Parameters<TextableChannel["createMessage"]>[1]) {
    if (typeof content === "string") {
      content = `${this.msg.author.mention} ${content}`;
    } else {
      if (typeof content.content === "string") {
        content.content = `${this.msg.author.mention} ${content.content}`;
      }
    }
    return this.msg.channel.createMessage(content, file);
  }

  /**
   * Replies to command in a text channel
   * Note: If you want to DM someone, the user ID is **not** the DM channel ID. use Client.getDMChannel() to get the DM channel ID for a user
   * Note: This function will modify a string if passed to add a mention at the start for the author that sent the command, it will not modify arguments if passed an object
   * @param {Command~MessageContent | String} content {@link #Command~MessageContent|content} object
   * @param {Command~MessageFile} [file] A {@link #Command~MessageFile|file} object
   * @param {Command~MessageOptions} [options] A {@link #Command~MessageOptions|options} object
   * @returns {Promise<Message>}
   */
  reply(content: MessageContent, file?: Parameters<TextableChannel["createMessage"]>[1]) {
    return this.capturePromiseRejection(this._reply(content, file), content);
  }

  /**
   * Replies to command in a text channel. If the bot does not have permission to send messages in the channel it will deny all permissions in the channel.
   * Note: If you want to DM someone, the user ID is **not** the DM channel ID. use Client.getDMChannel() to get the DM channel ID for a user
   * Note: This function will modify a string if passed to add a mention at the start for the author that sent the command, it will not modify arguments if passed an object
   * @param {Command~MessageContent | String} content {@link #Command~MessageContent|content} object
   * @param {Command~MessageFile} [file] A {@link #Command~MessageFile|file} object
   * @param {Command~MessageOptions} [options] A {@link #Command~MessageOptions|options} object
   * @returns {Promise<Message>}
   */
  replyAutoDeny(content: MessageContent, file?: Parameters<TextableChannel["createMessage"]>[1]) {
    return this.capturePromiseRejection(this._reply(content, file).catch(this.autoDenyPermission), content);
  }

  /**
   * Create a message in a text channel
   * Note: If you want to DM someone, the user ID is **not** the DM channel ID. use Client.getDMChannel() to get the DM channel ID for a user
   * @param {Command~MessageContent | String} content {@link #Command~MessageContent|content} object
   * @param {Command~MessageFile} [file] A {@link #Command~MessageFile|file} object
   * @param {Command~MessageOptions} [options] A {@link #Command~MessageOptions|options} object
   * @returns {Promise<Message>}
   */
  createMessage(content: MessageContent, file?: Parameters<TextableChannel["createMessage"]>[1]) {
    return this.capturePromiseRejection(this.msg.channel.createMessage(content, file), content);
  }

  /**
   * Create a message in the channel the command was sent in. If the bot does not have permission to send messages in the channel it will deny all permissions in the channel.
   * Note: If you want to DM someone, the user ID is **not** the DM channel ID. use Client.getDMChannel() to get the DM channel ID for a user
   * @param {Command~MessageContent | String} content {@link #Command~MessageContent|content} object
   * @param {Command~MessageFile} [file] A {@link #Command~MessageFile|file} object
   * @param {Command~MessageOptions} [options] A {@link #Command~MessageOptions|options} object
   * @returns {Promise<Message>}
   */
  createMessageAutoDeny(content: MessageContent, file?: Parameters<TextableChannel["createMessage"]>[1]) {
    return this.capturePromiseRejection(this.msg.channel.createMessage(content, file).catch(this.autoDenyPermission), content);
  }

  autoDenyPermission(error: ErisError): null {
    // @ts-ignore
    if (error.code == null) {
      throw error;
    } else if (error.code === EE.DISCORD_RESPONSE_MISSING_PERMISSIONS) {
      let channel = this.msg.channel;
      let guild = (channel as GuildChannel).guild;
      if (!guild) throw error;
      this.perms.set(`${guild.id}.${channel.id}`, "remov", { write: false });
      this.perms.set(`${guild.id}.${channel.id}.*`, "deny", { write: true });
      let owner = guild.members.get(guild.ownerID);
      if (owner) {
        owner.user.getDMChannel().then(channel =>
          channel.createMessage(this.translate`Hello, I've removed and denied the permissions configuration for channel ${
            this.msg.channel.mention} on ${guild.name} as I didn't have permissions to send messages in that channel. \
Please use /perms list on that server to see the new configuration.`),
        );
      }
    } else {
      throw error;
    }
    return null;
  }

  /**
   * Logs any error edited by the promise to sentry and stops unhandled promise rejections
   * @param promise
   * @param {Object} [context] Context to be added to the error rejection
   * @returns {*}
   */
  capturePromiseRejection<T>(promise: Promise<T>, context: any): Promise<T> {
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
  captureException(context: any, error: Error) {
    let extra: ReturnType<Command["toJSON"]> & { context?: any } = this.toJSON();
    if (context != null) {
      extra.context = context;
    }
    Sentry.captureException(error, {
      user: this.msg.author && this.msg.author.toJSON ? this.msg.author.toJSON() : this.msg.author,
      extra,
    })
  }
}

export interface GuildCommand extends Command {
  channel: Eris.GuildChannel;
  member: Eris.Member;
}

export default Command;
