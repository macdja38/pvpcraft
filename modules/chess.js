/**
 * Created by macdja38 on 2016-10-01.
 */

let StandardDB = require('../lib/StandardDB');

let chessClient = require('chess');

let table = "chess";

let emotes = {
  "rb": "<:rb:230774531864657920>",
  "NB": "<:NB:230771178065625088>",
  "bb": "<:bb:230774531743023104>",
  "KB": "<:KB:230771177885401088>",
  "kb": "<:KB:230771177885401088>", // add emote later
  "qb": "<:qb:230774532451860481>",
  "QB": "<:qb:230774532451860481>", // add emote later
  "BB": "<:BB:230771178065756170>",
  "nb": "<:nb:230774531826909188>",
  "RB": "<:RB:230771178065756160>",
  "PB": "<:PB:230771178124345344>",
  "pb": "<:pb:230774531797549057>",
  "B3": "<:B6:230175796507967488>",
  "b3": "<:b3:230174772896595968>",
  "pw": "<:pw:230774531923378176>",
  "PW": "<:PW:230771178036396037>",
  "RW": "<:RW:230771177616965633>",
  "nw": "<:nw:230774531839492096>",
  "BW": "<:BW:230771178057236480>",
  "bw": "<:BW:230771178057236480>", // add emote later
  "kw": "<:kw:230774531751542784>",
  "KW": "<:kw:230774531751542784>", // add emote later
  "QW": "<:QW:230771177738600448>",
  "qw": "<:QW:230771177738600448>",
  "NW": "<:NW:230771177818161152>",
  "rw": "<:rw:230774531671719937>"
};

class chess {
  /**
   * Instantiates the module
   * @constructor
   * @param {Object} e
   * @param {Eris} e.client Eris client
   * @param {Config} e.config File based config
   * @param {Raven?} e.raven Raven error logging system
   * @param {Config} e.auth File based config for keys and tokens and authorisation data
   * @param {ConfigDB} e.configDB database based config system, specifically for per guild settings
   * @param {R} e.r Rethinkdb r
   * @param {Permissions} e.perms Permissions Object
   * @param {Feeds} e.feeds Feeds Object
   * @param {MessageSender} e.messageSender Instantiated message sender
   * @param {SlowSender} e.slowSender Instantiated slow sender
   * @param {PvPClient} e.pvpClient PvPCraft client library instance
   */
  constructor(e) {
    this.client = e.client;
    this.raven = e.raven;
    this.r = e.r;
    this.games = {};
    this.turns = {};
    this.messageSender = e.messageSender;
    this.r.tableList().contains(table)
      .do((databaseExists) => {
        return this.r.branch(
          databaseExists,
          {dbs_created: 0},
          this.r
            .tableCreate(table, {})
            .do(() => this.r.table(table).indexCreate("channel1"))
            .do(() => this.r.table(table).indexCreate("channel2"))
        );
      }).run()
  }

  static getCommands() {
    //this needs to return a list of commands that should activate the onCommand function
    //of this class. array of strings with trailing s's removed.
    return ["move", "start", "hooktest"];
  }

  /**
   * Called with a command, returns true or a promise if it is handling the command, returns false if it should be passed on.
   * @param {Message} msg
   * @param {Command} command
   * @param {Permissions} perms
   * @returns {boolean | Promise}
   */
  onCommand(msg, command, perms) {
    if (command.command === "start" && perms.check(msg, "games.chess.start")) {
      if (this.games.hasOwnProperty(msg.channel.id)) {
        command.replyAutoDeny("Sorry, game already in progress");
        return true;
      }
      this.games[msg.channel.id] = chessClient.create();
      this.turns[msg.channel.id] = "white";
      command.replyAutoDeny("Game started");
      //r.table(table).insert({})
    }

    if (command.command === "hooktest" && perms.check(msg, "hooktest")) {
      this.messageSender.sendMessage(msg.channel, "Hello", {
        "username": "ChessBot 3000",
        "icon_url": "http://www.clipartkid.com/images/844/27-chess-piece-pictures-free-cliparts-that-you-can-download-to-you-fAbN54-clipart.jpeg",
        "text": "",
        "slack": true,
        "attachments": [{
          "pretext": "<:rb:230774531864657920><:NB:230771178065625088><:bb:230774531743023104><:KB:230771177885401088><:qb:230774532451860481><:BB:230771178065756170><:nb:230774531826909188><:RB:230771178065756160> 1\n<:PB:230771178124345344><:pb:230774531797549057><:PB:230771178124345344><:pb:230774531797549057><:PB:230771178124345344><:pb:230774531797549057><:PB:230771178124345344><:pb:230774531797549057> 2\n<:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488> 3\n<:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968> 4\n<:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488> 5\n<:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968> 6\n<:pw:230774531923378176><:PW:230771178036396037><:pw:230774531923378176><:PW:230771178036396037><:pw:230774531923378176><:PW:230771178036396037><:pw:230774531923378176><:PW:230771178036396037> 7\n<:RW:230771177616965633><:nw:230774531839492096><:BW:230771178057236480><:kw:230774531751542784><:QW:230771177738600448><:pw:230774531923378176><:NW:230771177818161152><:rw:230774531671719937> 8\n   a     b     c     d     e     f     g     h  "
        }]
      });
    }

    if (command.command === "move" && perms.check(msg, "games.chess.move")) {
      if (!this.games.hasOwnProperty(msg.channel.id)) {
        command.replyAutoDeny("Sorry, no game in progress");
        return true;
      }
      if (command.args.length > 0) {
        let m1;
        try {
          m1 = this.games[msg.channel.id].move(command.args[0]);
        } catch (error) {
          command.replyAutoDeny(error);
          console.log(error);
        }
        if (m1) {
          if (this.turns[msg.channel.id] === "white") {
            this.turns[msg.channel.id] = "black";
          } else {
            this.turns[msg.channel.id] = "white";
          }
        }
        console.log("m1", m1);
      }
      let status = this.games[msg.channel.id].getStatus();
      let squares = status.board.squares;
      let emoteArray = squares.map(p => {
        if (p.hasOwnProperty("piece") && p.piece !== null) {
          if (p.piece.type === "pawn") {
            return `p${p.piece.side.name[0]}`
          }
          return `${p.piece.notation.toLowerCase()}${p.piece.side.name[0]}`
        } else {
          return "b3"
        }
      });
      let attachments = [{
        "pretext": emoteArray
          .map((e, i) => (Math.ceil((i + 1) / 8) % 2 !== (i % 2)) ? e.toUpperCase() : e)
          .map(e => emotes[e]).map((c, i) => ((i + 1) % 8 === 0) ? `${c} ${Math.ceil(i / 8)}\n` : c)
          .join("") + "   a     b     c     d     e     f     g     h"
      }];
      attachments.push({
        "pretext": `Currently up ${this.turns[msg.channel.id]}`,
        "color": this.turns[msg.channel.id] === "white" ? "#FFFFFF" : "#111111"
      });
      if (status.isCheckmate) {
        attachments.push({
          "pretext": "Checkmate"
        })
      }
      else if (status.isCheck) {
        attachments.push({
          "pretext": "Check"
        })
      }
      if (status.isRepetition) {
        attachments.push({
          "pretext": "Repetition"
        })
      }
      if (status.isStalemate) {
        attachments.push({
          "pretext": "Stalemate"
        })
      }
      console.log(emoteArray);
      this.messageSender.sendMessage(msg.channel, "Sorry webhook permissions required", {
        "username": "Chess Bot 3000",
        "icon_url": "http://www.clipartkid.com/images/844/27-chess-piece-pictures-free-cliparts-that-you-can-download-to-you-fAbN54-clipart.jpeg",
        "text": "",
        "slack": true,
        "attachments": attachments
      });
    }
  }
}

module.exports = chess;