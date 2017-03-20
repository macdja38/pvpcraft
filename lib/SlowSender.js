/**
 * Created by macdja38 on 2016-07-12.
 */

let utils = require('./utils');

class SlowSender {
  /**
   * Slow sender, combines messages before sending, used within the giveaways module
   * @param {Object} e
   * @param {Eris} e.client
   * @param {MessageSender} e.messageSender instantiated MessageSender
   * @param {Config} e.config
   */
  constructor(e) {
    this.msgChannels = {};
    this.client = e.client;
    this.messageSender = e.messageSender;
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
    clearInterval(this.batchSend);
    this.msgChannels = {};
  }

  /**
   * Sends a grouped message
   * @param {Channel} channel
   * @param {string} text
   */
  sendMessage(channel, text) {
    if (typeof(channel) === "object") {
      channel = channel.id;
    }
    if (!this.msgChannels.hasOwnProperty(channel)) {
      this.msgChannels[channel] = [];
    }
    let texts = text.match(/[^]{1,2000}/g);
    texts.forEach((string) => {
      this.msgChannels[channel].push(string);
    });
  }
}

module.exports = SlowSender;