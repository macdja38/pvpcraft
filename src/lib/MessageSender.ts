/**
 * Created by macdja38 on 2016-10-01.
 */
"use strict";

import Eris from "eris";
import * as Sentry from "@sentry/node";

class MessageSender {
  private _client: Eris.Client;
  private translate: any;
  private hookSender: NodeJS.Timeout;
  private _queuedMessages: Map<string | Eris.TextChannel, { channel: Eris.TextChannel, text: string, options: { attachments: any[]}, }[]>;

  /**
   * Webhook sender which can be used to bulk together messages, designed for use with Webhooks but sends text as a fallback
   * @constructor
   * @param {Object} e
   * @param {Eris} e.client
   * @param {Function} e.translate
   */
  constructor(e: { client: Eris.Client, translate: any }) {
    this._client = e.client;
    this._queuedMessages = new Map();
    this.translate = e.translate;

    //noinspection JSUnusedGlobalSymbols
    this.hookSender = setInterval(this.emptyQueue.bind(this), 2500);
  }

  /**
   * empties the current queue
   */
  emptyQueue() {
    const queuedMessages = this._queuedMessages;
    this._queuedMessages = new Map();

    for (let [channelId, queue] of queuedMessages) {
      let first = queue[0];

      let webhookOptions = Object.assign({}, first.options);
      let calledOptions = Object.assign({}, first);
      calledOptions.options = webhookOptions;
      calledOptions.options.attachments = queue.map(i => i.options.attachments[0]);

      this._getWebhook(calledOptions.channel).then(webhook => {
        // @ts-ignore
        return this._client.executeSlackWebhook(webhook.id, webhook.token, calledOptions.options);
      }).catch((e) => {
        console.log(e);
        if (!(calledOptions.channel instanceof Eris.GuildChannel)) return;
        let texts = queue.map(option => option.text).join("\n").match(/(?:.|\n){1,1900}/g);
        if (!texts) {
          Sentry.captureMessage("Unable to fallback to text for message sending");
          return;
        }
        texts.forEach((string) => {
          calledOptions.channel.createMessage(this.translate(calledOptions.channel.id)`${string}\nPlease give the bot \"Manage Webhooks\" to enable non fallback functionality`).catch(() => {
          });
        });
      })
    }
  }

  /**
   * Adds a message to the message sending queue possibly joining it to other messages
   * @param {Channel | string} channel in which to send the message or webhook in URL form
   * @param {string} text to send with the message
   * @param {Object} options including title and other content
   */
  sendQueuedMessage(channel: Eris.TextChannel, text: string, options: any) {
    const queue = this._queuedMessages.get(channel.id || channel) || []
    queue.push({channel, text, options})
    this._queuedMessages.set(channel.id || channel, queue);
  }

  /**
   * Sends a message in the channel through webhooks
   * @param {GuildChannel | String} channel to send the message in
   * @param {string} text text to send in that channel if sending a webhook is not possible
   * @param {Object} options
   */
  sendMessage(channel: Eris.TextChannel, text: string, options: any) {
    this._getWebhook(channel).then(webhook => {
      // @ts-ignore
      return this._client.sendWebhookMessage(webhook, text, options);
    }).catch(() => {
      this._client.createMessage(channel.id, text).catch(error => console.error(error));
    });

  }

  /**
   * Fetches a webhook for a channel
   * @param {GuildChannel | string} channel Channel or webhook to fetch webhook for, in the case of a string
   * webhook being passed it it will return an object with that webhooks id and token as properties.
   * If a channel is passed it in will create or find a webhook, or reject with "Insufficient permissions to create a webhook" if that's  the case.
   * @returns {Promise<Object<{id: string, token: string}>>}
   * @fails {Promise<"Insufficient permissions to create a webhook">}
   * @private
   */
  async _getWebhook(channel: Eris.TextChannel | string) {
    if (typeof channel === "string") {
      let matches = channel.match(/https:\/\/(?:ptb.|canary\.)?discordapp\.com\/api\/webhooks\/(\d+)\/(.+)/i);
      if (!matches) {
        throw new Error("Invalid Webhook");
      }
      return {id: matches[1], token: matches[2]};
    }
    if (!channel.permissionsOf(this._client.user.id).has("manageWebhooks")) {
      throw "Insufficient permissions to create a webhook";
    }
    let existingHooks = await channel.getWebhooks();
    if (existingHooks && existingHooks.length > 0) {
      return existingHooks[0];
    }
    return channel.createWebhook({name: this._client.user.username, avatar: this._client.user.avatarURL});
  }
}

export default MessageSender;
