/**
 * Created by macdja38 on 2016-10-01.
 */
"use strict";

let Eris = require("eris");

class MessageSender {
  /**
   * Webhook sender which can be used to bulk together messages, designed for use with Webhooks but sends text as a fallback
   * @constructor
   * @param {Object} e
   * @param {Eris} e.client
   * @param {Function} e.i10010n
   * @param {Function} e.getChannelLanguage
   */
  constructor(e) {
    this._client = e.client;
    this._queuedMessages = {};
    this.i10010n = e.i10010n;
    this.getChannelLanguage = e.getChannelLanguage;

    //noinspection JSUnusedGlobalSymbols
    this.hookSender = setInterval(this.emptyQueue.bind(this), 2500);
  }

  /**
   * empties the current queue
   */
  emptyQueue() {
    for (let channelId in this._queuedMessages) {
      if (!this._queuedMessages.hasOwnProperty(channelId)) continue;
      let queue = this._queuedMessages[channelId];
      let first = queue[0];

      let webhookOptions = Object.assign({}, first.options);
      let calledOptions = Object.assign({}, first);
      calledOptions.options = webhookOptions;
      calledOptions.options.attachments = queue.map(i => i.options.attachments[0]);

      this._getWebhook(calledOptions.channel).then(webhook => {
        return this._client.executeSlackWebhook(webhook.id, webhook.token, calledOptions.options);
      }).catch((e) => {
        console.log(e);
        if (!(calledOptions.channel instanceof Eris.GuildChannel)) return;
        let texts;
        if (queue.length > 1) {
          texts = queue.slice(1).reduce((prev, cur) => `${prev.text}\n${cur.text}`, calledOptions).match(/^.{1,1900}/g);
        } else {
          texts = calledOptions.text.match(/^.{1,1900}/g);
        }
        texts.forEach((string) => {
          calledOptions.channel.createMessage(this.i10010n(this.getChannelLanguage(calledOptions.channel.id)) `${string}\nPlease give the bot \"Manage Webhooks\" to enable non fallback functionality`).catch(() => {});
        });
      })
    }
    this._queuedMessages = {};
  }

  /**
   * Adds a message to the message sending queue possibly joining it to other messages
   * @param {Channel | string} channel in which to send the message or webhook in URL form
   * @param {string} text to send with the message
   * @param {Object} options including title and other content
   */
  sendQueuedMessage(channel, text, options) {
    if (!this._queuedMessages.hasOwnProperty(channel.id || channel)) {
      this._queuedMessages[channel.id || channel] = [];
    }
    this._queuedMessages[channel.id || channel].push({channel, text, options});
  }

  /**
   * Sends a message in the channel through webhooks
   * @param {GuildChannel | String} channel to send the message in
   * @param {string} text text to send in that channel if sending a webhook is not possible
   * @param {Object} options
   */
  sendMessage(channel, text, options) {
    this._getWebhook(channel).then(webhook => {
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
  async _getWebhook(channel) {
    if (/https:\/\/(?:ptb.|canary\.)?discordapp\.com\/api\/webhooks\/(\d+)\/(.+)/.test(channel)) {
      let matches = channel.match(/https:\/\/(?:ptb.|canary\.)?discordapp\.com\/api\/webhooks\/(\d+)\/(.+)/i);
      return {id: matches[1], token: matches[2]};
    }
    if (!channel.permissionsOf(this._client.user.id).has("manageWebhooks")) {
      throw "Insufficient permissions to create a webhook";
    }
    let existingHooks = await channel.getWebhooks();
    if (existingHooks && existingHooks.length > 0) {
      return existingHooks[0];
    }
    return channel.createWebhook({name: this._client.user.username, avatar: this._client.user.avatar});
  }
}

module.exports = MessageSender;