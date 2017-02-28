/**
 * Created by macdja38 on 2017-02-27.
 */
"use strict";

class Command {
  /**
   *
   * @param {string} command
   * @param {string} commandnos
   * @param {string} prefix
   * @param {string[]} args
   * @param {string[]} options
   * @param {string[]} flags
   * @param {Message} msg
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