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

  "1_": "<:1_:701531822739423364>",
  "2_": "<:2_:701531833590087742>",
  "3_": "<:3_:701531843886973041>",
  "4_": "<:4_:701531852925829228>",
  "5_": "<:5_:701531861213642804>",
  "6_": "<:6_:701531868700475536>",
  "7_": "<:7_:701531876816453712>",
  "8_": "<:8_:701531883489460335>",
  "a_": "<:a_:701531891114836020>",
  "b_": "<:b_:701531899222556747>",
  "c_": "<:c_:701531907506176041>",
  "d_": "<:d_:701531915903041636>",
  "e_": "<:e_:701531925029978234>",
  "f_": "<:f_:701531934475419739>",
  "g_": "<:g_:701531942994313226>",
  "h_": "<:h_:701531950262779985>",
};

/**
 * checks two permission nodes (|| operation)
 * @param {string} node1
 * @param {string} node2
 * @returns {Function}
 */
function genDualCheckCommand(node1, node2) {
  return function (command) {
    return command.perms.check(command, node1) || command.perms.check(command, node2);
  };
}

/**
 * Converts the file notation to a 0 indexed column.
 * @param {string} file
 * @returns {number}
 */
function squareFileToColumn(file) {
  return file.charCodeAt(0) - 97;
}

/**
 * Converts an array of 64 squares into 2D array [row][column]
 * @param {Array<Object>} squares
 * @returns {Array<Array<Object>>}
 */
function squaresTo2DArray(squares) {
  const rows = new Array(8).fill(null).map(() => []);
  squares.forEach((square) => {
    rows[square.rank - 1][squareFileToColumn(square.file)] = square;
  });
  return rows
}

/**
 * Converts a chess piece to an emote
 * @param {Object} piece
 * @returns {string}
 */
function pieceToEmote(piece) {
  let emote;
  if (piece.piece !== null) {
    if (piece.piece.type === "pawn") {
      emote = `p${piece.piece.side.name[0]}`
    } else {
      emote = `${piece.piece.notation.toLowerCase()}${piece.piece.side.name[0]}`;
    }
  } else {
    emote = "b3"
  }
  const evenRow = piece.rank % 2 === 0;
  if ((piece.file === "a" || piece.file === "c" || piece.file === "e" || piece.file === "g") ? evenRow : !evenRow) {
    return emotes[emote.toUpperCase()];
  } else {
    return emotes[emote];
  }
}

function buildBottomLegend() {
  return ["a", "b", "c", "d", "e", "f", "g", "h"].map(letter => `${letter}_`).map(letter => emotes[letter]).join("");
}

/**
 * Turns a chess board from the chess library into a signified representation using discord emotes for pieces
 * @param {{squares: Array<Object>}} board
 * @returns {string}
 */
function stringifyBoard(board) {
  const squares = board.squares.slice(0);
  const rows = squaresTo2DArray(squares)
    .map(r => r.map(pieceToEmote))
    .map(r => r.join(""))
    .map((r, i) => `${r} ${i === 0 ? ` 1` : i + 1}`)
    .reverse();
  rows.push(buildBottomLegend());
  return rows.join("\n");
}

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
   * @param {Function} e.i10010n internationalization function
   */
  constructor(e) {
    this.client = e.client;
    this.pvpcraft = e.pvpcraft;
    this.raven = e.raven;
    this.i10010n = e.i10010n;
    this.r = e.r;
    this.perms = e.perms;
    this.games = {};
    this.turns = {};
    this.messageSender = e.messageSender;
    this.r.tableList().contains(table)
      .do((databaseExists) => {
        return this.r.branch(
          databaseExists,
          { dbs_created: 0 },
          this.r
            .tableCreate(table, {})
            .do(() => this.r.table(table).indexCreate("channel1"))
            .do(() => this.r.table(table).indexCreate("channel2")),
        );
      }).run()
  }

  /**
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent() {
    return {
      name: "Chess",
      description: "Chess commands",
      key: "chess",
      permNode: "game.chess",
      commands: this.getCommands(),
    };
  }

  sendBoardStatus(command) {
    let status = this.games[command.channel.id].getStatus();

    let attachment = {
      description: stringifyBoard(status.board),
    };
    attachment.footer = { text: `Currently up ${this.turns[command.channel.id]}` };
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
    return command.createMessageAutoDeny({ embed: attachment });
  }

  /**
   * Get's the commands for the module
   * @returns {Array<{triggers: Array<string> permissionCheck: function channels: Array<string> execute: function}>}
   */
  getCommands() {
    //this needs to return a list of commands that should activate the onCommand function
    //of this class. array of strings with trailing s's removed.
    return [{
      triggers: ["start"],
      permissionCheck: genDualCheckCommand("game.chess.start", "chess.game.start"),
      description: "Start a chess game.",
      usage: "start",
      channels: ["*"],
      execute: async (command) => {
        if (this.games.hasOwnProperty(command.channel.id)) {
          return command.replyAutoDeny(command.translate`Sorry, game already in progress`);
        }
        this.games[command.channel.id] = chessClient.create();
        this.turns[command.channel.id] = "white";
        await command.replyAutoDeny(command.translate`Game started`);
        return this.sendBoardStatus(command);
        //r.table(table).insert({})
      },
    }, {
      triggers: ["move"],
      permissionCheck: genDualCheckCommand("game.chess.move", "chess.game.move"),
      channels: ["*"],
      description: "Move a piece on the chess board",
      usage: "move <move in [algebraic chess notation](https://truckersection.com/guide-to-algebraic-chess-notation/)>",
      execute: (command) => {
        if (!this.games.hasOwnProperty(command.channel.id)) {
          command.replyAutoDeny(command.translate`Sorry, no game in progress`);
          return true;
        }
        if (command.args.length < 1) {
          command.replyAutoDeny(command.translate`usage \`${command.prefix}move <move in Algebraic Chess Notation>\``);
          return true;
        }
        try {
          this.games[command.channel.id].move(command.args[0]);
        } catch (error) {
          command.replyAutoDeny(error);
          console.log(error);
          return true;
        }
        this.turns[command.channel.id] = this.turns[command.channel.id] === "white" ? "black" : "white";
        return this.sendBoardStatus(command);
      },
    }, {
      triggers: ["end"],
      permissionCheck: genDualCheckCommand("game.chess.end", "chess.game.end"),
      description: "End a chess game",
      usage: "end",
      channels: ["*"],
      execute: (command) => {
        if (!this.games.hasOwnProperty(command.channel.id)) {
          command.replyAutoDeny(command.translate`Sorry, game is not in progress`);
          return true;
        }
        delete this.games[command.channel.id];
        delete this.turns[command.channel.id];
        return command.replyAutoDeny(command.translate`Game ended`);
      },
    }];
  }
}

module.exports = chess;