import Eris from "eris";

const APPLICATIONS = `/applications`
const APPLICATION = (clientID: string) => `${APPLICATIONS}/${clientID}`;
const APPLICATION_COMMANDS = (clientID: string) => `${APPLICATION(clientID)}/commands`;
const APPLICATION_COMMAND = (clientID: string, commandID: string) => `${APPLICATION_COMMANDS(clientID)}/${commandID}`;
const APPLICATION_GUILD = (clientID: string, guildID: string) => `${APPLICATION(clientID)}/guilds/${guildID}`;
const APPLICATION_GUILD_COMMANDS = (clientID: string, guildID: string) => `${APPLICATION_GUILD(clientID, guildID)}/commands`;
const APPLICATION_GUILD_COMMAND = (clientID: string, guildID: string, commandID: string) => `${APPLICATION_GUILD_COMMANDS(clientID, guildID)}/${commandID}`;

export class DiscordCommandHelper {
  private readonly clientID: string;
  private readonly client: Eris.Client;

  constructor(client: Eris.Client, clientID: string) {
    this.clientID = clientID;
    this.client = client;
  }

  fetchGuildCommands(guildID: string) {
    // @ts-ignore
    return this.client.requestHandler.request("GET", APPLICATION_GUILD_COMMANDS(this.clientID, guildID), true);
  }

  fetchCommands() {
    // @ts-ignore
    return this.client.requestHandler.request("GET", APPLICATION_COMMANDS(this.clientID), true);
  }

  createGuildCommand(guildID: string, commandData: Record<string, unknown>) {
    // @ts-ignore
    return this.client.requestHandler.request("POST", APPLICATION_GUILD_COMMANDS(this.clientID, guildID), true, commandData);
  }

  createCommand(guildID: string, commandData: Record<string, unknown>) {
    // @ts-ignore
    return this.client.requestHandler.request("POST", APPLICATION_COMMANDS(this.clientID), true, commandData);
  }

  deleteGuildCommand(guildID: string, commandID: string) {
    // @ts-ignore
    return this.client.requestHandler.request("DELETE", APPLICATION_GUILD_COMMAND(this.clientID, guildID, commandID), true);
  }

  deleteCommand(guildID: string, commandID: string) {
    // @ts-ignore
    return this.client.requestHandler.request("DELETE", APPLICATION_COMMAND(this.clientID, commandID), true);
  }
}
