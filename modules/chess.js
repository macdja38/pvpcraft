/**
 * Created by macdja38 on 2016-10-01.
 */

let StandardDB = require('../lib/StandardDB');

let chessClient = require('chess');

let table = "chess";

let emotes = {
  "bb": "<:bb:333047389143302144>",
  "bw": "<:bw:333047389231382529>",
  "kb": "<:kb:333047389420257281>",
  "nb": "<:nb:333047389466394626>",
  "b3": "<:b3:333047389625647115>",
  "rb": "<:rb:333047389730635789>",
  "qw": "<:qw:333047389893951491>",
  "pb": "<:pb:333047390015586310>",
  "pw": "<:pw:333047390086889472>",
  "kw": "<:kw:333047390095409155>",
  "rw": "<:rw:333047390267244545>",
  "nw": "<:nw:333047390376296458>",
  "qb": "<:qb:333047390380752898>",
  "B3": "<:B3:333047423351914498>",
  "NB": "<:NB:333047423544983554>",
  "KW": "<:KW:333047423729664001>",
  "KB": "<:KB:333047423884591104>",
  "PW": "<:PW:333047423960219659>",
  "BB": "<:BB:333047424035848192>",
  "PB": "<:PB:333047424073596928>",
  "NW": "<:NW:333047424073596958>",
  "QB": "<:QB:333047424140574721>",
  "QW": "<:QW:333047424522125312>",
  "BW": "<:BW:333047424778240022>",
  "RB": "<:RB:333047425197408256>",
  "RW": "<:RW:333047426191589379>"
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
    return ["move", "start", "end", "hooktest"];
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
      command.createMessageAutoDeny({
        embed: {
          author: {
            name: "ChessBot 3000",
            icon_url: "http://www.clipartkid.com/images/844/27-chess-piece-pictures-free-cliparts-that-you-can-download-to-you-fAbN54-clipart.jpeg",
          },
          text: "",
          description: "<:rb:230774531864657920><:NB:230771178065625088><:bb:230774531743023104><:KB:230771177885401088><:qb:230774532451860481><:BB:230771178065756170><:nb:230774531826909188><:RB:230771178065756160> 1\n<:PB:230771178124345344><:pb:230774531797549057><:PB:230771178124345344><:pb:230774531797549057><:PB:230771178124345344><:pb:230774531797549057><:PB:230771178124345344><:pb:230774531797549057> 2\n<:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488> 3\n<:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968> 4\n<:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488> 5\n<:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968><:b6:230175796507967488><:b3:230174772896595968> 6\n<:pw:230774531923378176><:PW:230771178036396037><:pw:230774531923378176><:PW:230771178036396037><:pw:230774531923378176><:PW:230771178036396037><:pw:230774531923378176><:PW:230771178036396037> 7\n<:RW:230771177616965633><:nw:230774531839492096><:BW:230771178057236480><:kw:230774531751542784><:QW:230771177738600448><:pw:230774531923378176><:NW:230771177818161152><:rw:230774531671719937> 8\n   a     b     c     d     e     f     g     h  ",
        }
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
      let attachment = {
        description: emoteArray
          .map((e, i) => (Math.ceil((i + 1) / 8) % 2 !== (i % 2)) ? e.toUpperCase() : e)
          .map(e => emotes[e]).map((c, i) => ((i + 1) % 8 === 0) ? `${c} ${Math.ceil(i / 8)}\n` : c)
          .join("") + "  a     b     c     d     e     f     g     h",
        author: {
          "username": "Chess Bot 3000",
          "icon_url": "http://www.clipartkid.com/images/844/27-chess-piece-pictures-free-cliparts-that-you-can-download-to-you-fAbN54-clipart.jpeg",
        },
      };
      attachment.footer = {text: `Currently up ${this.turns[msg.channel.id]}`};
      if (status.isCheckmate) {
        attachment.footer.text += " | Checkmate";
      } else if (status.isCheck) {
        attachment.footer.text += " | Check";
      }
      if (status.isRepetition) {
        attachment.footer.text += " | Repetition";
      }
      if (status.isStalemate) {
        attachment.footer.text += " | Stalemate";
      }
      console.log(emoteArray);
      command.createMessageAutoDeny({embed: attachment});
    }

    if (command.command === "end" && perms.check(msg, "games.chess.end")) {
      if (!this.games.hasOwnProperty(msg.channel.id)) {
        command.replyAutoDeny("Sorry, no game is in progress.");
        return true;
      }
      delete this.games[msg.channel.id];
      delete this.turns[msg.channel.id];
      command.replyAutoDeny("Game ended");
      //r.table(table).insert({})
    }
  }
}

module.exports = chess;