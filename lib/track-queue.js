/**
 * Created by macdja38 on 2016-06-26.
 */
"use strict";

module.exports = class queue {
    constructor(e) {
        this.conn = e.conn;
        this.r = e.r;
        this.table = "queue"
    }

    set(playlist, info) {
        this.conn.then((conn)=> {
            this.r.table(this.table).insert({
                id: info.server.id,
                server: info.server.name,
                text: info.textChannel.name,
                text_id: info.textChannel.id,
                voice: info.voiceChannel.name,
                voice_id: info.voiceChannel.id,
                queue: playlist.map((item)=> {
                    return {
                        vid: item.vid,
                        title: item.title,
                        author: item.author,
                        length: item.prettyTime() | 0,
                        lengthSeconds: item.lengthSeconds,
                        user: {name: item.user.username, id: item.user.id}
                    }
                })
            }, {conflict: "replace"}).run(conn);
        })
    }
};