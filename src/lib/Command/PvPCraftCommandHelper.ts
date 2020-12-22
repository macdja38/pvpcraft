import { Module, ModuleCommand } from "../../types/moduleDefinition";
import Command from "./Command";

import * as Sentry from "@sentry/node";

import {
  APPLICATION_COMMAND_TYPES, ApplicationCommandInteractionDataOption,
  CommandOption,
  CommandOptionParameter,
  CommandOptionSubcommand,
  CommandOptionSubcommandGroup, CommandRoot, Interaction, InteractionCommand, Optionify,
} from "./CommandTypes";
import equal from "deep-equal";
import Eris, { MessageFile } from "eris";
import fetch, { Headers } from "node-fetch";
import { translateType } from "../../types/translate";
import ConfigDB from "../ConfigDB";

export const MESSAGE_FLAGS = {
  CROSSPOSTED: 1 << 0,
  IS_CROSSPOST: 1 << 1,
  SUPPRESS_EMBEDS: 1 << 2,
  SOURCE_MESSAGE_DELETED: 1 << 3,
  URGENT: 1 << 4,
  EPHEMERAL: 1 << 6,
};

export const INTERACTION_RESPONSE_TYPE = {
  PONG: 1 as 1,                 //	ACK a Ping
  EAT_INPUT_ACK: 2 as 2,        //	ACK a command without sending a message, eating the user's input
  EAT_INPUT_WITH_REPLY: 3 as 3, //	respond with a message, eating the user's input
  REPLY: 4 as 4,                // 	respond with a message, showing the user's input
  ACK: 5 as 5,                  // 	ACK a command without sending a message, showing the user's input
}

export type SlashCommandBase = {
  name: string;
  description: string;
  usage?: string;
  permissionCheck?: (command: PvPInteractiveCommand) => boolean;
  permission?: string;
  channels: "guild";
}

export type SlashCommandCommand = SlashCommandBase & {
  options: readonly CommandOptionParameter[];
  execute: (command: PvPInteractiveCommandWithOpts<any>) => Promise<any> | boolean;
}

export type SlashCommandSubcommandGroup = SlashCommandBase & {
  subCommands: SlashCommandCommand[];
}

export type SlashCommandSubcommandRoot = SlashCommandBase & {
  subCommands: SlashCommandCommand[] | SlashCommandSubcommandGroup[];
}

export type SlashCommand = SlashCommandCommand | SlashCommandSubcommandRoot;

type ACL = typeof APPLICATION_COMMAND_TYPES;

type CommandTypeToCommandOption<T extends ACL["SUB_COMMAND_GROUP"] | ACL["SUB_COMMAND"]> = T extends ACL["SUB_COMMAND_GROUP"] ? CommandOptionSubcommandGroup : CommandOptionSubcommand;

function nestedCommandToDiscordCommand<T extends ACL["SUB_COMMAND_GROUP"] | ACL["SUB_COMMAND"]>(command: SlashCommandCommand, type: T): CommandTypeToCommandOption<T> {
  return {
    name: command.name,
    description: command.description,
    type: type,
    options: command.options,
  } as any;
}

export type RespondWithInteractionResponseType = (typeOrResponse: 2 | 3 | 4 | 5 | Eris.WebhookPayload | string, response?: Eris.WebhookPayload | string) => Promise<any>;

export class PvPInteractiveCommand {
  public id: string;
  public name: string;
  guild: Eris.Guild;
  channel: Eris.Channel;
  member: Eris.Member;
  data: any
  token: string;
  translate: translateType;
  opts: {};
  i1001n: (language: string) => translateType;
  getChannelLanguage: (channelID: string) => string;
  private configDB: ConfigDB;
  private client: Eris.Client;


  constructor(id: string, name: string, token: string, client: Eris.Client, configDB: ConfigDB, i10010n: (language: string) => translateType, getChannelLanguage: (channelID: string) => string, guild: Eris.Guild, channel: Eris.Channel, member: Eris.Member, data: any) {
    this.id = id;
    this.name = name;
    this.token = token;
    this.client = client;
    this.configDB = configDB;
    this.i1001n = i10010n;
    this.getChannelLanguage = getChannelLanguage;
    this.translate = i10010n(getChannelLanguage(channel.id));
    this.guild = guild;
    this.channel = channel;
    this.member = member;
    this.data = data;
    this.opts = {};
  }

  clone() {
    const clone = new PvPInteractiveCommand(this.id, this.name, this.token, this.client, this.configDB, this.i1001n, this.getChannelLanguage, this.guild, this.channel, this.member, this.data);
    clone.opts = this.opts;
    return clone;
  }

  getPossibleSubcommandKey() {

  }

  toJSON() {
    return {
      id: this.id,
      data: this.data,
      opts: {},
    }
  }

  respond(typeOrResponse: 2 | 3 | 4 | 5 | WebhookPayloadWithFlags | string, responseOrFile?: WebhookPayloadWithFlags | string | Eris.MessageFile | Eris.MessageFile[], file?: Eris.MessageFile | Eris.MessageFile[]) {
    let type: number;
    let response: WebhookPayloadWithFlags | string;

    const ephemeralChannels = this.configDB.get("ephemeralChannels", {}, { server: this.guild.id });

    let ephemeral = false;
    if (ephemeralChannels.hasOwnProperty(this.channel.id)) {
      ephemeral = ephemeralChannels[this.channel.id];
    }

    let files = undefined;

    if (typeof typeOrResponse === "number") {
      type = typeOrResponse
      if (!responseOrFile) {
        throw new Error("Response is required when supplying type as a number");
      }
      response = wrapResponse(responseOrFile as string | WebhookPayloadWithFlags, ephemeral);
      if (file) {
        files = file;
      }
    } else {
      type = ephemeral ? INTERACTION_RESPONSE_TYPE.EAT_INPUT_WITH_REPLY : INTERACTION_RESPONSE_TYPE.REPLY;
      response = wrapResponse(typeOrResponse as Eris.WebhookPayload | string, ephemeral);
      files = responseOrFile as MessageFile | MessageFile[];
    }

    // @ts-ignore
    return this.client.requestHandler.request("POST", `/interactions/${this.id}/${this.token}/callback`, false, { type, data: response }, files);
  }

  static async optionsArrayToObject(command: PvPInteractiveCommand, commandHandler: SlashCommandCommand, options: ApplicationCommandInteractionDataOption<any>[]) {
    return options.reduce(async (acc: Promise<Record<string, unknown>>, option: ApplicationCommandInteractionDataOption<any>) => {
      const resolvedAcc = await acc;

      const handlerOption = commandHandler.options.find((handlerOption => handlerOption.name === option.name));

      if (!handlerOption) {
        Sentry.captureMessage(`Could not find a handler option ${option.name}`);
        return resolvedAcc;
      }
      const rawVal = option.value as unknown as string | boolean | number;

      switch (handlerOption.type) {
        case APPLICATION_COMMAND_TYPES.INTEGER:
          resolvedAcc[option.name] = rawVal;
          break;
        case APPLICATION_COMMAND_TYPES.STRING:
          resolvedAcc[option.name] = rawVal;
          break;
        case APPLICATION_COMMAND_TYPES.ROLE: {
          const role = command.guild.roles.get(rawVal as string);

          if (role) {
            resolvedAcc[option.name] = role;
          } else {
            Sentry.captureMessage("Could not find a role mentioned in a command")
          }

          break;
        }
        case APPLICATION_COMMAND_TYPES.BOOLEAN:
          resolvedAcc[option.name] = rawVal;
          break;
        case APPLICATION_COMMAND_TYPES.CHANNEL: {
          const channel = command.guild.channels.get(rawVal as string);

          if (channel) {
            resolvedAcc[option.name] = channel;
          } else {
            Sentry.captureMessage("Could not find a channel mentioned in a command")
          }

          break;
        }
        case APPLICATION_COMMAND_TYPES.USER: {
          const member = command.guild.members.get(rawVal as string);

          if (member) {
            resolvedAcc[option.name] = member;
          } else {
            const member = await command.client.getRESTGuildMember(command.guild.id, rawVal as string);
            if (member) {
              resolvedAcc[option.name] = member;
            }
            Sentry.captureMessage("Could not find a member mentioned in a command")
          }

          break;
        }
        default:
          // @ts-ignore
          Sentry.captureMessage(`Unknown argument supplied: ${handlerOption.type}`)
      }

      return resolvedAcc;
    }, Promise.resolve({}))
  }
}

export type PvPInteractiveCommandWithOpts<T extends readonly CommandOption[]> = PvPInteractiveCommand & {
  opts: Optionify<T>
}

export type WebhookPayloadWithFlags = Eris.WebhookPayload & { flags?: number }

function wrapResponse(response: WebhookPayloadWithFlags | string, ephemeralDefault: boolean = false): WebhookPayloadWithFlags {
  if (typeof response === "string") {
    const wrappedResponse: WebhookPayloadWithFlags = { content: response }
    if (ephemeralDefault) {
      wrappedResponse.flags = 1 << 6;
    }
    return wrappedResponse
  }
  if (response.hasOwnProperty("flags")) {
    return response;
  }
  const responseClone = JSON.parse(JSON.stringify(response)) as WebhookPayloadWithFlags;
  if (ephemeralDefault) {
    responseClone.flags = 1 << 6;
  }
  return responseClone;
}

export class PvPCraftCommandHelper {
  static commandToDiscordCommands(command: SlashCommand): CommandRoot {
    let options: CommandRoot["options"] = [];

    if ("subCommands" in command) {
      options = command.subCommands
        // @ts-ignore
        .map(
          (subCommand: SlashCommandCommand | SlashCommandSubcommandGroup): CommandOption => {
            if ("execute" in subCommand) {
              return nestedCommandToDiscordCommand(subCommand, APPLICATION_COMMAND_TYPES.SUB_COMMAND);
            }
            if ("subCommands" in subCommand) {
              return {
                name: subCommand.name,
                description: subCommand.description,
                type: APPLICATION_COMMAND_TYPES.SUB_COMMAND_GROUP,
                options: subCommand.subCommands.map((subCommand: SlashCommandCommand) => {
                  return nestedCommandToDiscordCommand(subCommand, APPLICATION_COMMAND_TYPES.SUB_COMMAND);
                }),
              }
            }
            throw new Error("invalid type")
          })
    } else {
      options = command.options;
    }

    return {
      name: command.name,
      description: command.description,
      options: options,
    }
  }

  // equal check broken cause optional params are not sent by discord.
  static equal(command1: CommandRoot, command2: CommandRoot) {
    const { id: _id1, application_id: _aid1, ...clone1 } = command1;
    const { id: _id2, application_id: _aid2, ...clone2 } = command2;

    return equal(clone1, clone2, { strict: true })
  }

  static interactionCommandFromDiscordInteraction(client: Eris.Client, interaction: InteractionCommand, configDB: ConfigDB, i10010n: (language: string) => translateType, getChannelLanguage: (channelID: string) => string): PvPInteractiveCommand | void {
    const guild = client.guilds.get(interaction.guild_id);

    if (!guild) {
      console.log("WARN NO GUILD ON COMMAND");
      return;
    }

    interaction.member.id = interaction.member.user.id;

    const member = guild.members.update(interaction.member as unknown as Eris.Member, guild);

    const channel = guild.channels.get(interaction.channel_id);

    if (!channel) {
      console.log("WARN NO CHANNEL IN GUILD CACHE FOR COMMAND");
      return;
    }

    return new PvPInteractiveCommand(interaction.id, interaction.data.name, interaction.token, client, configDB, i10010n, getChannelLanguage, guild, channel, member, interaction.data);
  }
}
