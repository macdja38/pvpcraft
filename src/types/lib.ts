import * as Eris from "eris";
import Config from "../lib/Config";
import ConfigDB from "../lib/ConfigDB";
import Permissions from "../lib/Permissions";
import { translateTypeCreator } from "./translate";
import Feeds from "../lib/feeds";
import MessageSender from "../lib/MessageSender";
import SlowSender from "../lib/SlowSender";
import PvPCraft from "../PvPCraft";
import TaskQueue from "../lib/TaskQueue";
import { MiddlewareWrapper, Module, ModuleWrapper } from "./moduleDefinition";

export type ModuleOptions = {
  taskQueue: TaskQueue;
  client: Eris.Client;
  auth: Config;
  config: Config;
  configDB: ConfigDB;
  r: any;
  perms: Permissions;
  feeds: Feeds;
  messageSender: MessageSender;
  slowSender: SlowSender;
  pvpClient: any;
  pvpcraft: PvPCraft;
  i10010n: translateTypeCreator;
  git: { commit: string, branch: string };
  getChannelLanguage: (channelId: string, guildId?: string) => string
  shardCount: number;
  shardID: number;
  modules: ModuleWrapper[];
  middleWares: MiddlewareWrapper[];
}

export type MiddlewareOptions = ModuleOptions & {
}
