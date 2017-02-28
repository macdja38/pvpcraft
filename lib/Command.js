/**
 * Created by macdja38 on 2017-02-27.
 */
"use strict";

class Command {
  /**
   *
   * @param {string} command command text
   * @param {string} commandnos command text without trailing s
   * @param {string} prefix prefix used to trigger the command
   * @param {string[]} args arguments imputed with command
   * @param {string[]} options options run with command, eg `--user Mario`
   * @param {string[]} flags flags run with command eg `-f`
   * @param {Message} msg message that triggered the command object's creation
   */
  constructor(command, commandnos, prefix, args, options, flags, msg) {
    this.command = command;
    this.commandnos = commandnos;
    this.prefix = prefix;
    this.args = args;
    this.options = options;
    this.flags = flags;
    this.msg = msg;
  }
}

module.exports = Command;