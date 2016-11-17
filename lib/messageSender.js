/**
 * Created by macdja38 on 2016-10-01.
 */


module.exports = class messageSender{
  constructor(e) {
    this._client = e.client;
    this._queuedMessages = {};

    this.hookSender = setInterval(this.emptyQueue.bind(this), 2500);
  }

  emptyQueue() {
    for(let channelId in this._queuedMessages) {
      if (!this._queuedMessages.hasOwnProperty(channelId)) continue;
      let queue = this._queuedMessages[channelId];
      let first = queue.slice(0, 1)[0];
      let options = queue.slice(1).reduce((prev, cur) => {
        prev.options.attachments = prev.options.attachments.concat(...cur.options.attachments);
        return prev;
      }, first);
      this._getWebhook(first.channel).then(webhook => {
        this._client.sendWebhookMessage(webhook, first.text, options.options).catch(()=>{});
      }).catch(() => {
        let texts;
        if (queue.length > 1) {
          texts = queue.slice(1).reduce((prev, cur) => `${prev.text}\n${cur.text}`, first).match(/[^]{1,2000}/g);
        } else {
          texts = first.text.match(/[^]{1,2000}/g);
        }
        texts.forEach((string)=> {
          this._client.sendMessage(first.channel, string);
        });
      })
    }
    this._queuedMessages = {};
  }

  /**
   * Adds a message to the message sending queue possibly joining it to other messages
   * @param channel in which to send the message
   * @param text to send with the message
   * @param options including title and other content
   */
  sendQueuedMessage(channel, text, options) {
    if (!this._queuedMessages.hasOwnProperty(channel.id)) {
      this._queuedMessages[channel.id] = [];
    }
    this._queuedMessages[channel.id].push({channel, text, options});
  }

  /**
   * Sends a message in the channel through webhooks
   * @param channel to send the message in
   * @param text text to send in that channel if sending a webhook is not possible
   * @param options
   */
  sendMessage(channel, text, options) {
    this._getWebhook(channel).then(webhook => {
      return this._client.sendWebhookMessage(webhook, text, options);
    }).catch(() => {
      this._client.sendMessage(channel, text).catch(error => console.error(error));
    });

  }

  /**
   *
   * @param channel
   * @returns {*}
   * @private
   */
  _getWebhook(channel) {
    if (channel.webhooks.length > 0) {
      return Promise.resolve(channel.webhooks[0]);
    }
    return this._client.getChannelWebhooks(channel).then(hooks => {
      if (hooks.length > 0) {
        return hooks[0];
      } else {
        return this._client.createWebhook(channel, {name: this._client.user.username});
      }
    })
  }
};