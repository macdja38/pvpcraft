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
  "RW": "<:RW:333047426191589379>",
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
    this.perms = e.perms;
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
            .do(() => this.r.table(table).indexCreate("channel2")),
        );
      }).run()
  }

  getCommands() {
    //this needs to return a list of commands that should activate the onCommand function
    //of this class. array of strings with trailing s's removed.
    return [{
      triggers: ["start"],
      permissionCheck: this.perms.genCheckCommand("chess.game.start"),
      channels: ["*"],
      execute: (command) => {
        if (this.games.hasOwnProperty(command.channel.id)) {
          command.replyAutoDeny("Sorry, game already in progress");
          return true;
        }
        this.games[command.channel.id] = chessClient.create();
        this.turns[command.channel.id] = "white";
        command.replyAutoDeny("Game started");
        //r.table(table).insert({})
      },
    }, {
      triggers: ["move"],
      permissionCheck: this.perms.genCheckCommand("chess.game.move"),
      channels: ["*"],
      execute: (command) => {
        if (!this.games.hasOwnProperty(command.channel.id)) {
          command.replyAutoDeny("Sorry, no game in progress");
          return true;
        }
        if (command.args.length > 0) {
          let m1;
          try {
            m1 = this.games[command.channel.id].move(command.args[0]);
          } catch (error) {
            command.replyAutoDeny(error);
            console.log(error);
          }
          if (m1) {
            if (this.turns[command.channel.id] === "white") {
              this.turns[command.channel.id] = "black";
            } else {
              this.turns[command.channel.id] = "white";
            }
          }
          console.log("m1", m1);
        }
        let status = this.games[command.channel.id].getStatus();
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
        attachment.footer = {text: `Currently up ${this.turns[command.channel.id]}`};
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
      },
    }, {
      triggers: ["end"],
      permissionCheck: this.perms.genCheckCommand("chess.game.end"),
      channels: ["*"],
      execute: (command) => {
        if (this.games.hasOwnProperty(command.channel.id)) {
          command.replyAutoDeny("Sorry, game already in progress");
          return true;
        }
        delete this.games[command.channel.id];
        delete this.turns[command.channel.id];
        command.replyAutoDeny("Game ended");
        //r.table(table).insert({})
      },
    }];
  }
}

module.exports = chess;