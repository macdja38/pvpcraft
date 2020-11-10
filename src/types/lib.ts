import * as Eris from "eris";
import Config from "../lib/Config";
import ConfigDB from "../lib/ConfigDB";
import Permissions from "../lib/Permissions";
import { translateType } from "./translate";
import Feeds from "../lib/feeds";
import MessageSender from "../lib/MessageSender";
import SlowSender from "../lib/SlowSender";
import PvPCraft from "../PvPCraft";

export type ModuleOptions = {
  client: Eris.Client;
  restClient: Eris.Client,
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
  i10010n: translateType;
  git: { commit: string, branch: string };
  getChannelLanguage: (channelId: string, guildId?: string) => translateType
}
