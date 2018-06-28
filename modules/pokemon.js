/**
 * Created by Martacus on 2016-05-18.
 */
"use strict";

let Pokedex = require('pokedex-promise-v2');
let pokedex = new Pokedex();
const utils = require('../lib/utils');

class pokemon {
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
    this.perms = e.perms;
  }

  /**
   * Used to build documentation strings
   * @returns {{name: string, description: string, commands: Array<{triggers: Array<string>,
   * permissionCheck: Function, channels: Array<string>, execute: Function}>}}
   */
  getContent() {
    return {
      name: "Pokemon",
      description: "Pokemon commands",
      key: "pokemon",
      permNode: "pokemon",
      commands: this.getCommands(),
    };
  }

  /**
   * Returns an array of commands that can be called by the command handler
   * @returns {[{triggers: [string], permissionCheck: function, channels: [string], execute: function}]}
   */
  getCommands() {
    return [{
      triggers: ["pokemon"],
      permissionCheck: this.perms.genCheckCommand("pokemon.pokemon"),
      channels: ["*"],
      execute: command => {
        let pokemon_name = command.args[0];
        if (!pokemon_name || !/^[^<@#\\\/>]*$/g.test(pokemon_name)) {
          command.replyAutoDeny(i10010n `Sorry invalid input`);
        }
        Promise.resolve(pokedex.getPokemonByName(pokemon_name.toLowerCase())).then((response) => {
          let secondtype;
          try {
            secondtype = response.types[1].type.name;
          }
          catch (err) {
            secondtype = "";
          }
          command.createMessageAutoDeny(
            {
              embed: {
                title: cap(response.name),
                description: "ID: #" + response.id
                + "\nTypes: " + cap(response.types[0].type.name) + " " + cap(secondtype)
                + "\nHeight: " + response.height + "0cm"
                + "\nWeight: " + response.weight + "00g"
                + "\nBase XP: " + response.base_experience,
                thumbnail: {url: response.sprites.front_default},
              },
            },
          );
        })
          .catch(function (error) {
              if (error.statusCode == "404") {
                command.replyAutoDeny(i10010n `Could not find **${utils.clean(command.args[0])}**`);
              } else {
                console.log('There was an ERROR with getting the data: ', error);
                command.replyAutoDeny(i10010n `Error getting data ${error}`);
              }
            },
          );
      },
    }, {
      triggers: ["shiny"],
      permissionCheck: this.perms.genCheckCommand("pokemon.shiny"),
      channels: ["*"],
      execute: command => {
        let pokemon_name = command.args[0];
        if (pokemon_name && /^[^<@#\\\/>]*$/g.test(pokemon_name)) {
          Promise.resolve(pokedex.getPokemonByName(pokemon_name.toLowerCase())).then((response) => {
            command.createMessageAutoDeny(
              {
                embed: {
                  title: cap(response.name),
                  thumbnail: {url: response.sprites.front_shiny},
                },
              },
            );
          })
            .catch(function (error) {
              if (error.statusCode == "404") {
                command.replyAutoDeny(i10010n `Could not find ${command.args[0]}`);
              } else {
                console.log('There was an ERROR with getting the data: ', error);
                command.replyAutoDeny(i10010n `Error getting data ${error}`);
              }
            })
        }
        else {
          command.replyAutoDeny(i10010n `Sorry invalid input`);
        }
        return true;
      },
    }, {
      triggers: ["pokestat"],
      permissionCheck: this.perms.genCheckCommand("pokemon.pokestat"),
      channels: ["*"],
      execute: command => {
        let pokemon_name = command.args[0];
        if (pokemon_name && /^[^<@#\\\/>]*$/g.test(pokemon_name)) {
          Promise.resolve(pokedex.getPokemonByName(pokemon_name.toLowerCase())).then((response) => {
            command.createMessageAutoDeny(
              {
                embed: {
                  title: cap(response.name),
                  description: cap(response.stats[5].stat.name) + ": " + response.stats[5].base_stat
                  + "\n" + cap(response.stats[4].stat.name) + ": " + response.stats[4].base_stat
                  + "\n" + cap(response.stats[3].stat.name) + ": " + response.stats[3].base_stat
                  + "\n" + cap(response.stats[2].stat.name) + ": " + response.stats[2].base_stat
                  + "\n" + cap(response.stats[1].stat.name) + ": " + response.stats[1].base_stat
                  + "\n" + cap(response.stats[0].stat.name) + ": " + response.stats[0].base_stat,
                  thumbnail: {url: response.sprites.front_default},
                },
              },
            );
          })
            .catch(function (error) {
              if (error.statusCode == "404") {
                command.replyAutoDeny(i10010n `Could not find ${command.args[0]}`);
              } else {
                console.log('There was an ERROR with getting the data: ', error);
                command.replyAutoDeny(i10010n `Error getting data ${error}`);
              }
            });
        }
        else {
          command.replyAutoDeny(i10010n `Sorry invalid input`);
        }
        return true;
      },
    }, {
      triggers: ["hiddenability"],
      permissionCheck: this.perms.genCheckCommand("pokemon.hiddenability"),
      channels: ["*"],
      execute: command => {
        let pokemon_name = command.args[0];
        if (pokemon_name && /^[^<@#\\\/>]*$/g.test(pokemon_name)) {
          Promise.resolve(pokedex.getPokemonByName(pokemon_name.toLowerCase()))
            .then((response) => {
              command.createMessageAutoDeny(
                {
                  embed: {
                    title: cap(response.name),
                    description: response.abilities
                      .filter(a => a.is_hidden)
                      .map(a => `Hidden ability: ${a.ability.name}`)
                      .join("\n"),
                    thumbnail: {url: response.sprites.front_default},
                  },
                },
              );
            })
            .catch(function (error) {
              if (error.statusCode == "404") {
                command.replyAutoDeny(i10010n `Could not find ${command.args[0]}`);
              } else {
                console.log('There was an ERROR with getting the data: ', error);
                command.replyAutoDeny(i10010n `Error getting data ${error}`);
              }
            });
        }
        else {
          command.replyAutoDeny(i10010n `Sorry invalid input`);
        }
        return true;
      },
    }];
  }
}

function cap(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports = pokemon;