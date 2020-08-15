import { Channel, GuildChannel } from "eris";

export function isGuildChannel(channel: Channel): channel is GuildChannel {
  return channel.hasOwnProperty("guild");
}
