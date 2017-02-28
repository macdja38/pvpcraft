/**
 * Created by macdja38 on 2016-06-26.
 */
"use strict";

class Queue {
  /**
   * Music Queue, currently used for saving queue to database
   * @constructor
   * @param {Object} e
   * @param {R} e.r
   */
  constructor(e) {
    this.r = e.r;
    this.table = "queue"
  }

  /**
   * Sets a playlist
   * @param {Object[]} playlist
   * @param {Object} info
   */
  set(playlist, info) {
    this.r.table(this.table).insert({
      id: info.server.id,
      server: info.server.name,
      text: info.textChannel.name,
      text_id: info.textChannel.id,
      voice: info.voiceChannel.name,
      voice_id: info.voiceChannel.id,
      queue: playlist.map((item) => {
        let author = item.author || item.containedVideo.uploader;
        if (typeof author === "object" && author !== null) {
          author = author.name;
        }
        return {
          vid: item.vid,
          title: item.title,
          author,
          length: item.prettyTime() | 0,
          lengthSeconds: item.lengthSeconds,
          user: {name: item.user.username || "", id: item.user.id}
        }
      })
    }, {conflict: "replace"}).run();
  }

  get(server_Id) {

  }
}

module.exports = Queue;