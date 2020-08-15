import * as Eris from "eris";
import Config from "../lib/Config";
import ConfigDB from "../lib/ConfigDB";
import Permissions from "../lib/Permissions";
import { translateType } from "./translate";

export type ModuleOptions = {
  client: Eris.Client;
  restClient: Eris.Client,
  auth: Config;
  config: Config;
  configDB: ConfigDB;
  r: any;
  perms: Permissions;
  feeds: any;
  messageSender: any;
  slowSender: any;
  pvpClient: any;
  pvpcraft: any;
  i10010n: any;
  getChannelLanguage: (channelId: string, guildId?: string) => translateType
}
