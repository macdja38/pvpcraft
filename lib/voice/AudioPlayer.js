/**
 * Created by macdja38 on 2016-11-04.
 */
"use strict";

const EventEmitter = require("events").EventEmitter;

const VoiceSocket = require("./networking/ws/VoiceSocket");
const IVoiceConnection = require("./IVoiceConnection");

const https = require('https');

/**
 * Manages the voice connection and playing audio
 * @class Player
 * @extends EventEmitter
 * @param {String} endpoint gateway endpoint
 * @param {String} guildId The guild id of the connection
 * @param {String} channelId The channel id for this connection
 * @param {String} userId The user id of the client
 * @param {String} sessionId The session id for this connection
 * @param {String} token The voice connection token
 * @prop {Player} player The player for this connection
 * @prop {VoiceSocket} voiceSocket The VoiceSocket of the player
 * @prop {VoiceConnection} voiceConnection The VoiceConnection of the player
 * @prop {Boolean} playing Whether the player is currently playing
 */
class Player extends EventEmitter {

  constructor(endpoint, guildId, channelId, userId, sessionId, token, clientDiscordjs) {
    super();

    this.endpoint = endpoint;
    this.guildId = guildId;
    this.channelId = channelId;
    this.userId = userId;
    this.sessionId = sessionId;
    this.token = token;
    this.clientDiscordjs = clientDiscordjs;

    this.voiceSocket = null;
    this.voiceConnection = null;
    this.playing = false;
  }


  /**
   * Create the VoiceSocket
   * @param {String} endpoint The endpoint of the VoiceSocket
   * @param {Number} guildId The guild id of the VoiceSocket
   * @param {Number} channelId The channel id of the VoiceSocket
   * @param {Number} userId The user id of the VoiceSocket
   * @param {Number} sessionId The session id of the VoiceSocket
   * @param {String} token The token of the bot
   * @returns VoiceSocket
   * @private
   */
  createVoiceSocket(callback) {
    var canReconnect = this.endpoint ? true : false;
    if (!canReconnect) return;

    let voiceSocket = new VoiceSocket(this.guildId);
    this.voiceSocket = voiceSocket;

    const serverId = this.guildId || this.channelId;
    voiceSocket.connect(
      this.endpoint.split(":")[0],
      serverId, this.userId, this.sessionId, this.token,
      () => {
        callback(voiceSocket);

        this.emit("ready");
      }
    );
  }

  /**
   * Create the VoiceConnection
   * @param {String} endpoint The endpoint of the VoiceSocket
   * @param {Number} guildId The guild id of the VoiceSocket
   * @param {Number} channelId The channel id of the VoiceSocket
   * @param {Number} userId The user id of the VoiceSocket
   * @param {Number} sessionId The session id of the VoiceSocket
   * @param {String} token The token of the bot
   * @param {Function} callback Called when the VoiceSocket successfully connects
   * @returns IVoiceConnection
   * @private
   */
  createVoiceConnection(callback) {
    if (this.voiceConnection) {
      return callback(this.voiceConnection);
    }

    console.log("Creating VS");
    this.createVoiceSocket((voiceSocket) => {
      console.log("Got VS");
      this.voiceConnection = new IVoiceConnection(voiceSocket);
        console.log("Created Voice Connection");

      callback(this.voiceConnection);
    });
  }


  /**
   * Get or create the VoiceConnection if it doesn't exist
   * @param {String} endpoint The endpoint of the VoiceSocket
   * @param {Number} channelId The channel id of the VoiceSocket
   * @param {Number} userId The user id of the VoiceSocket
   * @param {Number} sessionId The session id of the VoiceSocket
   * @returns Promise
   * @private
   */
  getVoiceConnection() {
    return new Promise((resolve) => {
      if (this.voiceConnection) {
        return resolve(this.voiceConnection);
      }

      this.createVoiceConnection((voiceConnection) => {
        resolve(voiceConnection);
      });
    });
  }

  /**
   * Start playing audio from a URL
   * @param {Object} data The URL source of the audio to play as well as the encoding
   * @private
   */
  play(data) {
    return new Promise((resolve, reject)=> {
      if (this.playing) {
        this.stop();
      }

      this.getVoiceConnection().then((voiceConnection) => {
        let encoder;
        if (data.container === "webm" && data.encoding === "opus") {
          let fsStream = makeStream(data.url);
          encoder = voiceConnection.createExternalEncoder({
            type: "WebmOpusPlayer",
            source: fsStream,
          });
        } else {
          encoder = voiceConnection.createExternalEncoder({
            type: "ffmpeg",
            format: "opus",
            source: data.url,
            frameDuration: 60,
            debug: true,
          });
        }

        let encoderStream = encoder.play();
        this.started();

        encoderStream.once('error', err => console.error(err));

        encoderStream.once('end', () => {
          console.log("EncoderStream ended");
        });

        encoder.once('error', err => console.error(err));

        encoder.once("end", () => {
          this.ended();
          console.log("IT ended")
        });

        resolve(encoderStream);
      });
    })
  }

  stopPlaying() {
    this.stop();
    this.ended();
  }

  /**
   * Stop playing audio
   * @private
   */
  stop() {
    if (!this.playing) return;

    if (!this.voiceSocket || !this.voiceConnection) {
      this.playing = false;
      return;
    }

    let encoderStream = this.voiceConnection.getEncoderStream();

    if (!encoderStream) {
      this.playing = false;
      return;
    }

    encoderStream.unpipeAll();

    this.playing = false;
  }

  destroy() {
    this.disconnect();
  }

  /**
   * Disconnect the VoiceConnection
   * @private
   */
  disconnect() {
    if (!this.voiceConnection) return;

    let voiceConnection = this.voiceConnection;
    let encoderStream = voiceConnection.getEncoderStream();

    this.clientDiscordjs.internal.sendWS(
      {
        op : 4,
        d : {
          guild_id : this.guildId,
          channel_id : null,
          self_mute : true,
          self_deaf : false
        }
      }
    );

    encoderStream.unpipeAll();
    voiceConnection.disconnect();
  }

  /**
   * Set the volume of the audio
   * @param {Number} volume The new volume
   * @private
   */
  setVolume(volume) {
    if (!this.voiceConnection) return;

    let encoder = this.voiceConnection.getEncoder();
    encoder.setVolume(volume);
  }

  /**
   * Pause the audio playback
   * @private
   */
  pause() {
    if (!this.voiceConnection) return;

    let encoderStream = this.voiceConnection.getEncoderStream();
    encoderStream.cork();
  }

  /**
   * Start the audio playback
   * @private
   */
  resume() {
    if (!this.voiceConnection) return;

    let encoderStream = this.voiceConnection.getEncoderStream();
    encoderStream.uncork();
  }


  /**
   * Called when audio starts
   * @private
   */
  started() {
    this.playing = true;
    this.emit("start");
  }

  /**
   * Called when audio ends
   * @private
   */
  ended() {
    this.playing = false;
    this.emit("end");
  }

}

function makeStream(url) {
  var stream = require('stream');
  var rs = new stream.PassThrough();
  var request = https.get(url, function (res) {
    res.pipe(rs)
  });
  return rs
}


module.exports = Player;