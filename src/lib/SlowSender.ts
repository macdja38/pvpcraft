/**
 * Created by macdja38 on 2016-07-12.
 */
"use strict";

import Config from "./Config";
import Eris from "eris";
import MessageSender from "./MessageSender";

class SlowSender {
  private msgChannels: { [key: string]: string[] };
  private client: Eris.Client;
  private interval: number;
  private batchSend?: NodeJS.Timeout;

  /**
   * Slow sender, combines messages before sending, used within the giveaways module
   * @param {Object} e
   * @param {Eris} e.client
   * @param {Config} e.config
   */
  constructor(e: { client: Eris.Client, config: Config }) {
    this.msgChannels = {};
    this.client = e.client;
    this.interval = e.config.get("logInterval", 5000)
  }

  onReady() {
    this.batchSend = setInterval(() => {
      try {
        for (let channel of Object.keys(this.msgChannels)) {
          if (this.msgChannels.hasOwnProperty(channel)) {
            if (this.msgChannels[channel].length > 0) {
              let string = "";
              while (this.msgChannels[channel].length > 0 && string.length + this.msgChannels[channel][0].length + (string.length === 0 ? 0 : 2) <= 2000) {
                string += (string.length === 0 ? "" : "\n") + this.msgChannels[channel].shift();
              }
              if (this.msgChannels[channel].length < 1) {
                delete this.msgChannels[channel];
              }
              if (string.length > 0) {
                this.client.createMessage(channel, string).catch(console.error);
              } else {
                console.error("Tried to long string with length less than 1");
              }
            } else {
              delete this.msgChannels[channel];
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, this.interval);
  }

  onDisconnect() {
    if (this.batchSend) {
      clearInterval(this.batchSend);
    }
    this.msgChannels = {};
  }

  /**
   * Sends a grouped message
   * @param {Channel} channel
   * @param {string} text
   */
  sendMessage(channel: Eris.TextChannel | string, text: string) {
    const channelID = typeof(channel) === "object" ? channel.id : channel;
    if (!this.msgChannels.hasOwnProperty(channelID)) {
      this.msgChannels[channelID] = [];
    }
    let texts = text.match(/[^]{1,2000}/g);
    if (!texts) {
      throw new Error("Unable to send empty message");
    }
    texts.forEach((string) => {
      this.msgChannels[channelID].push(string);
    });
  }
}

export default SlowSender;
