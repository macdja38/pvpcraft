/**
 * Created by macdja38 on 2016-10-01.
 */


module.exports = class messageSender{
  constructor(e) {
    this._client = e.client;
  }

  sendMessage(channel, text, options) {
    this._getWebhook(channel).then(webhook => {
      this._client.sendWebhookMessage(webhook, text, options).catch(()=>{});
    }).catch(() => {
      this._client.sendMessage(channel, text);
    });

  }

  _getWebhook(channel) {
    if (channel.webhooks.length > 1) {
      return Promise.resolve(channel.webhooks[0]);
    }
    return this._client.getChannelWebhooks(channel).then(hooks => {
      if (hooks.length > 0) {
        return hooks[0];
      } else {
        return this._client.createWebhook(channel, {name: "Tau"});
      }
    })
  }
};