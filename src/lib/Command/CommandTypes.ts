import Eris from "eris";
import { GuildCommand } from "./Command";

export const APPLICATION_COMMAND_TYPES = {
  SUB_COMMAND: 1,
  SUB_COMMAND_GROUP: 2,
  STRING: 3,
  INTEGER: 4,
  BOOLEAN: 5,
  USER: 6,
  CHANNEL: 7,
  ROLE: 8,
} as const;

type ACT = typeof APPLICATION_COMMAND_TYPES;

export type CommandOptionBase = {
  name: string;
  description: string;
}

export type CommandOptionWithoutChoice = CommandOptionBase & {
  type: ACT["BOOLEAN"] | ACT["USER"] | ACT["CHANNEL"] | ACT["ROLE"];
  default?: boolean;
  required?: boolean;
}

export type CommandOptionWithChoice = CommandOptionBase & {
  type: ACT["INTEGER"] | ACT["STRING"]
  choices?: {
    name: string;
    value: string | number;
  }
}

export type CommandOptionParameter = CommandOptionWithChoice | CommandOptionWithoutChoice;

export type CommandOptionSubcommand = CommandOptionBase & {
  type: typeof APPLICATION_COMMAND_TYPES.SUB_COMMAND;
  options?: CommandOptionParameter[];
}

export type CommandOptionSubcommandGroup = CommandOptionBase & {
  type: typeof APPLICATION_COMMAND_TYPES.SUB_COMMAND_GROUP;
  options: CommandOptionSubcommand[] | CommandOptionParameter[];
}


export type CommandOption = CommandOptionParameter | CommandOptionSubcommandGroup | CommandOptionSubcommand;

export type CommandRoot = CommandOptionBase & {
  id?: string;
  application_id?: string;
  options: (CommandOptionSubcommandGroup | CommandOptionSubcommand)[] | readonly CommandOptionParameter[]
}

export type Pull<T extends readonly CommandOption[], K extends string> = Extract<T[number], { name: K; type: any }>["type"]
export type IsRequired<T extends readonly CommandOption[], K extends string> = Extract<T[number], { name: K; required: any}>["required"]
export type PossiblyOptional<T extends readonly CommandOption[], K extends string, V extends any> = IsRequired<T, K> extends true ? V : V | undefined

export type Optionify<T extends readonly CommandOption[]> = {
  [K in T[number]["name"]]: Pull<T, K> extends ACT["ROLE"] ? PossiblyOptional<T, K, Eris.Role> :
    Pull<T, K> extends ACT["CHANNEL"] ? PossiblyOptional<T, K, Eris.Channel> :
      Pull<T, K> extends ACT["USER"] ? PossiblyOptional<T, K, Eris.Member> :
        Pull<T, K> extends ACT["STRING"] ? PossiblyOptional<T, K, string> :
          Pull<T, K> extends ACT["INTEGER"] ? PossiblyOptional<T, K, number> :
            Pull<T, K> extends ACT["BOOLEAN"] ? PossiblyOptional<T, K, boolean> : undefined
}

export type ModuleCommandGuild = {
  name?: string;
  triggers: string[];
  permissionCheck: (any: any) => any;
  permNode?: string[];
  channels: "guild" | ["guild"];
  usage?: string;
  description?: string;
  execute: (command: GuildCommand) => Promise<any> | boolean
  subCommands?: ModuleCommandGuild[]
}

export const InteractionType = {
  PING: 1 as 1,
  APPLICATION_COMMAND: 2 as 2,
}

export type InteractionBase = {
  id: string;
  data?: ApplicationCommandInteractionData;
}

export type InteractionPing = InteractionBase & {
  type: typeof InteractionType.PING;
}

export type InteractionCommand = {
  id: string;
  type: typeof InteractionType.APPLICATION_COMMAND;
  data: ApplicationCommandInteractionData;
  guild_id: string;
  channel_id: string;
  member: Record<string, unknown> & { user: Record<string, unknown> }
  token: string;
  version: 1;
}

export type Interaction = InteractionPing | InteractionCommand;

export type ApplicationCommandInteractionData = {
  id: string,
  name: string;
  options: ApplicationCommandInteractionDataOption<any>[]
}

export type ApplicationCommandInteractionDataOption<T extends typeof APPLICATION_COMMAND_TYPES> = {
  name: string;
  value?: Record<string, unknown>,
  options: T extends ACT["SUB_COMMAND_GROUP"] ? Record<string, unknown> : T extends ACT["SUB_COMMAND"] ? Record<string, unknown> : undefined;
}
