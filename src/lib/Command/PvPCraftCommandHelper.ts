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
import Eris from "eris";
import fetch, { Headers } from "node-fetch";
import { translateType } from "../../types/translate";

export type SlashCommandBase = {
  name: string;
  description: string;
  usage?: string;
  permissionCheck?: (command: PvPInteractiveCommand) => boolean;
  permission?: string;
  channels: "guild";
}

export type SlashCommandCommand = SlashCommandBase & {
  options: CommandOptionParameter[];
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


  constructor(id: string, name: string, token: string, i10010n: (language: string) => translateType, getChannelLanguage: (channelID: string) => string, guild: Eris.Guild, channel: Eris.Channel, member: Eris.Member, data: any) {
    this.id = id;
    this.name = name;
    this.token = token;
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
    const clone = new PvPInteractiveCommand(this.id, this.name, this.token, this.i1001n, this.getChannelLanguage, this.guild, this.channel, this.member, this.data);
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

  respond(typeOrResponse: 2 | 3 | 4 | 5 | Eris.WebhookPayload | string, responseOrOptional?: Eris.WebhookPayload | string) {
    let type: number;
    let response: Eris.WebhookPayload | string;

    if (typeof typeOrResponse === "number") {
      type = typeOrResponse
      if (!responseOrOptional) {
        throw new Error("Response is required when supplying type as a number");
      }
      response = wrapResponse(responseOrOptional);
    } else {
      type = 4;
      response = wrapResponse(typeOrResponse as Eris.WebhookPayload | string);
    }

    console.log("responding with", JSON.stringify({ type, data: response }))

    return fetch(`https://discord.com/api/v8/interactions/${this.id}/${this.token}/callback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body:
        JSON.stringify({ type, data: response }),
    })
  }

  static optionsArrayToObject(command: PvPInteractiveCommand, commandHandler: SlashCommandCommand, options: ApplicationCommandInteractionDataOption<any>[]) {
    return options.reduce((acc: Record<string, unknown>, option: ApplicationCommandInteractionDataOption<any>) => {
      const handlerOption = commandHandler.options.find((handlerOption => handlerOption.name === option.name));

      if (!handlerOption) {
        Sentry.captureMessage(`Could not find a handler option ${option.name}`);
        return acc;
      }
      const rawVal = option.value as unknown as string | boolean | number;

      switch (handlerOption.type) {
        case APPLICATION_COMMAND_TYPES.INTEGER:
          acc[option.name] = rawVal;
          break;
        case APPLICATION_COMMAND_TYPES.STRING:
          acc[option.name] = rawVal;
          break;
        case APPLICATION_COMMAND_TYPES.ROLE: {
          const role = command.guild.roles.get(rawVal as string);

          if (role) {
            acc[option.name] = role;
          } else {
            Sentry.captureMessage("Could not find a role mentioned in a command")
          }

          break;
        }
        case APPLICATION_COMMAND_TYPES.BOOLEAN:
          acc[option.name] = rawVal;
          break;
        case APPLICATION_COMMAND_TYPES.CHANNEL: {
          const channel = command.guild.channels.get(rawVal as string);

          if (channel) {
            acc[option.name] = channel;
          } else {
            Sentry.captureMessage("Could not find a channel mentioned in a command")
          }

          break;
        }
        case APPLICATION_COMMAND_TYPES.USER: {
          const member = command.guild.members.get(rawVal as string);

          if (member) {
            acc[option.name] = member;
          } else {
            Sentry.captureMessage("Could not find a member mentioned in a command")
          }

          break;
        }
        default:
          // @ts-ignore
          Sentry.captureMessage(`Unknown argument supplied: ${handlerOption.type}`)
      }
      option.value

      return acc;
    }, {})
  }
}

export type PvPInteractiveCommandWithOpts<T extends CommandOption[]> = PvPInteractiveCommand & {
  opts: Optionify<T>
}

function wrapResponse(response: Eris.WebhookPayload | string): Eris.WebhookPayload {
  if (typeof response === "string") {
    return { content: response }
  }
  return response;
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

  static interactionCommandFromDiscordInteraction(client: Eris.Client, interaction: InteractionCommand, i10010n: (language: string) => translateType, getChannelLanguage: (channelID: string) => string): PvPInteractiveCommand | void {
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

    return new PvPInteractiveCommand(interaction.id, interaction.data.name, interaction.token, i10010n, getChannelLanguage, guild, channel, member, interaction.data);
  }
}
