/**
 * Created by macdja38 on 2016-04-25.
 */
"use strict";

var Utils = require('../lib/utils');
var utils = new Utils();

var color = require('colors');

var Player = require('../lib/player.js');

var key = require('../config/auth.json').youtubeApiKey || null;
if (key == "key") {
    key = null;
}

var text;

module.exports = class music {
    constructor(e) {
        this.client = e.client;
        this.config = e.configDB;
        this.raven = e.raven;
        this.r = e.r;
        this.conn = e.conn;
        /**
         * holds array of servers channels and their bound instances.
         * @type {Array}
         */
        this.boundChannels = [];
    }

    getCommands() {
        return ["init", "play", "skip", "list", "time", "pause", "resume", "volume", "shuffle", "next", "destroy", "logchannel"];
    }

    onDisconnect() {
        for (var i in this.boundChannels) {
            if (this.boundChannels.hasOwnProperty(i))
                this.boundChannels[i].destroy();
        }
    }

    onCommand(msg, command, perms) {
        if (!msg.channel.server) return; //this is a pm... we can't do music stuff here.
        var id = msg.channel.server.id;


        if (command.command === "init" && perms.check(msg, "music.init")) {
            if (this.boundChannels.hasOwnProperty(id)) {
                msg.reply(`Sorry already in use in this server. Use ${command.prefix}destroy to erase that connection.`);
                return true;
            }
            if (msg.author.voiceChannel) {
                if (msg.author.voiceChannel.server.id === msg.channel.server.id) {
                    this.boundChannels[id] = new Player({
                        client: this.client,
                        voiceChannel: msg.author.voiceChannel,
                        textChannel: msg.channel,
                        apiKey: key,
                        raven: this.raven,
                        r: this.r,
                        conn: this.conn,
                        config: this.config
                    });
                    msg.reply("Binding to **" + msg.author.voiceChannel.name + "** and **" + msg.channel.name + "**");
                    this.boundChannels[id].init(msg);/*.catch((e)=>{
                        console.log("Bound thing finished maybe");
                        if (e) {
                            console.log(e);
                            msg.reply(e);
                            delete this.boundChannels[id];
                        }
                    });*/
                }
                else {
                    msg.reply("You must be in a voice channel in this server to use this command here. If you are currently in a voice channel please rejoin it.")
                }
            }
            else {
                msg.reply("You must be in a voice channel this command. If you are currently in a voice channel please rejoin it.")
            }
            return true;
        }

        if (command.command === "destroy" && perms.check(msg, "music.destroy")) {
            if (this.boundChannels.hasOwnProperty(id)) {
                this.boundChannels[id].destroy();
                msg.reply("Disconnecting from voice chat and unbinding from text chat.");
                delete this.boundChannels[id];
            }
            return true;
        }

        if (command.command === "play" && perms.check(msg, "music.play")) {
            if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].ready) {
                if (!msg.author.voiceChannel) {
                    msg.reply("You must be in the current voice channel to queue a song. If you are already in the voice channel please leave and rejoin or toggle your mute.");
                    return true;
                }
                if (command.args.length > 0) {
                    this.boundChannels[id].enqueue(msg, command.args)
                }
                else {
                    msg.reply("Please specify a youtube video!")
                }
            } else {
                msg.reply("Please bind a channel first using " + command.prefix + "init")
            }
            return true;
        }


        if ((command.command === "next" || command.command === "skip") && (perms.check(msg, "music.voteskip") || perms.check(msg, "music.forceskip"))) {
            if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].ready) {
                if (this.boundChannels[id].currentVideo) {
                    var index = command.args[0] ? parseInt(command.args[0]) - 1 : -1;
                    var isForced = !!(perms.check(msg, "music.forceskip") && command.flags.indexOf('f') > -1);
                    var video;
                    if (index === -1) {
                        video = this.boundChannels[id].currentVideo;
                    }
                    else if (this.boundChannels[id].queue.hasOwnProperty(index)) {
                        video = this.boundChannels[id].queue[index];
                    }
                    else {
                        msg.reply("Could not find the song");
                        return true;
                    }
                    if (video.votes.indexOf(msg.author.id) < 0 || isForced) {
                        video.votes.push(msg.author.id);
                        if (video.votes.length > (this.boundChannels[id].connection.voiceChannel.members.length / 3) || isForced) {
                            msg.reply("Removing " + video.prettyPrint() + " From the queue");
                            if (index === -1) {
                                this.boundChannels[id].skipSong();
                            }
                            else {
                                this.boundChannels[id].queue.splice(index, 1);
                            }
                        }
                        else {
                            msg.reply(video.votes.length + " / " + (Math.floor(this.boundChannels[id].connection.voiceChannel.members.length / 3) + 1) + " votes needed to skip " +
                                video.prettyPrint());
                        }
                    }
                    else {
                        msg.reply("Sorry, you may only vote to skip once per song.");
                        return true;
                    }
                }
                else {
                    msg.reply("No song's to skip, queue a song using //play <youtube url of video or playlist>");
                    return true;
                }
            } else {
                msg.reply("Please bind a channel first using " + command.prefix + "init");
                return true;
            }
            return true;
        }


        if (command.command === "pause" && perms.check(msg, "music.pause")) {
            if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection")) {
                if (this.boundChannels[id].connection.playing) {
                    this.boundChannels[id].pause();
                    msg.reply(`Paused Playback use ${command.prefix}resume to resume it.`)
                } else {
                    msg.reply(`Cannot pause unless something is being played`)
                }
            } else {
                msg.channel.sendMessage("Sorry, Bot is not currently in a voice channel use " + command.prefix + "init while in a voice channel to bind it.")
            }
            return true;
        }


        if (command.command === "resume" && perms.check(msg, "music.resume")) {
            if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection")) {
                if (this.boundChannels[id].connection.paused && this.boundChannels[id].connection.playingIntent) {
                    this.boundChannels[id].resume(msg);
                    msg.reply("Playback resumed.")
                } else {
                    msg.reply(`Cannot resume unless something is paused.`)
                }
            } else {
                msg.channel.sendMessage("Sorry, Bot is not currently in a voice channel use " + command.prefix + "init while in a voice channel to bind it.")
            }
            return true;
        }


        if (command.commandnos === "list" && perms.check(msg, "music.list")) {
            if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection")) {
                if (this.boundChannels[id].currentVideo) {
                    msg.channel.sendMessage("```xl\n" + this.boundChannels[id].prettyList()
                        + "```\n" + this.config.get("website", {musicUrl: "https://pvpcraft.ca/pvpbotmusic/?server="}).musicUrl + msg.server.id, (error)=> {
                        if (error) {
                            console.log(error)
                        }
                    });
                } else {
                    msg.channel.sendMessage("Sorry, no song's found in playlist. use " + command.prefix + "play <youtube vid or playlist> to add one.")
                }
            } else {
                msg.channel.sendMessage("Sorry, Bot is not currently in a voice channel use " + command.prefix + "init while in a voice channel to bind it.")
            }
            return true;
        }


        if (command.commandnos === "time" && perms.check(msg, "music.time")) {
            if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection")) {
                if (this.boundChannels[id].currentVideo) {
                    msg.channel.sendMessage("Currently " + this.boundChannels[id].prettyTime() + " into " + this.boundChannels[id].currentVideo.prettyPrint());
                } else {
                    msg.channel.sendMessage("Sorry, no song's found in playlist. use " + command.prefix + "play <youtube vid or playlist> to add one.")
                }
            } else {
                msg.channel.sendMessage("Sorry, Bot is not currently in a voice channel use " + command.prefix + "init while in a voice channel to bind it.")
            }
            return true;
        }


        if (command.commandnos === "volume") {
            if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection")) {
                if (command.args[0] && perms.check(msg, "music.volume.set")) {
                    var volume = parseInt(command.args[0]);
                    if (111 > volume && volume > 4) {
                        this.boundChannels[id].setVolume(volume);
                        msg.reply("Volume set to **" + volume + "**")

                    } else {
                        msg.reply("Sorry, invalid volume, please enter a number between 5 and 110")
                    }
                    return true;
                } else {
                    if (perms.check(msg, "music.volume.list")) {
                        msg.reply("Current volume is **" + this.boundChannels[id].getVolume() + "**");
                        return true;
                    }
                    return false;
                }
            } else {
                if (perms.check(msg, "music.volume.list") || perms.check(msg, "music.volume.set")) {
                    msg.channel.sendMessage("Sorry, Bot is not currently in a voice channel use " + command.prefix + "init while in a voice channel to bind it.");
                    return true;
                }
                else {
                    return false;
                }
            }
        }


        if (command.command === "shuffle" && perms.check(msg, "music.shuffle")) {
            if (this.boundChannels.hasOwnProperty(id) && this.boundChannels[id].hasOwnProperty("connection")) {
                if (this.boundChannels[id].queue.length > 1) {
                    msg.channel.sendMessage(this.boundChannels[id].shuffle());
                } else {
                    msg.channel.sendMessage("Sorry, not enough song's in playlist.")
                }
            } else {
                msg.channel.sendMessage("Sorry, Bot is not currently in a voice channel use " + command.prefix + "init while in a voice channel to bind it.")
            }
            return true;
        }


        if (command.commandnos === "logchannel" && perms.check(msg, "music.logchannels")) {
            text = "Playing Music in:\n";
            for (var i in this.boundChannels) {
                if (this.boundChannels.hasOwnProperty(i)) {
                    text += `Server: ${this.boundChannels[i].server.name} in voice channel ${this.boundChannels[i].text.name}\n`
                }
            }
            if (text != "Playing Music in:\n") {
                msg.channel.sendMessage(text);
            }
            else {
                msg.channel.sendMessage("Bot is currently not in use");
            }
            return true;
        }

        return false;
    }
};

