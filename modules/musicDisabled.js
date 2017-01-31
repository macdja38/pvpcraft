/**
 * Created by macdja38 on 2017-01-30.
 */
"use strict";

module.exports = class music {
  constructor(e) {
  }

  getCommands() {
    return ["init", "play", "skip", "list", "time", "pause", "resume", "volume", "shuffle", "next", "destroy", "logchannel", "link"];
  }

  onCommand(msg, command, perms) {
    if (!msg.channel.server) return; //this is a pm... we can't do music stuff here.
    if (!perms.check(msg, `music.${command.command}`)) return false;
    msg.reply("Sorry music is currently disabled at the moment, please join https://join.pvpcraft.ca and check the #announcements chat for info on why and status updates");
    return true;
  }
};

