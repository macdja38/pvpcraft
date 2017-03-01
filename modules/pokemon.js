/**
 * Created by Martacus on 2016-05-18.
 */
"use strict";

let Pokedex = require('pokedex-promise-v2');
let pokedex = new Pokedex();
let utils = require('../lib/utils.js');

class pokemon {
  /**
   * Instantiates the module
   * @constructor
   * @param {Object} e
   * @param {Client} e.client Eris client
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
  }

  static getCommands() {
    return ["pokemon", "shiny", "pokestat", "hiddenability"];
  }

  /**
   * Called with a command, returns true or a promise if it is handling the command, returns false if it should be passed on.
   * @param {Message} msg
   * @param {Command} command
   * @param {Permissions} perms
   * @returns {boolean | Promise}
   */
  onCommand(msg, command, perms) {
    if (command.command === "pokemon" && perms.check(msg, "pokemon.pokemon")) {
      let pokemon_name = command.args[0];
      if (pokemon_name && /^[^<@#\\\/>]*$/g.test(pokemon_name)) {
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
              }
            }
          );
        })
          .catch(function (error) {
              if (error.statusCode == "404") {
                command.replyAutoDeny("Could not find **" + utils.clean(command.args[0]) + "**");
              } else {
                console.log('There was an ERROR with getting the data: ', error);
                command.replyAutoDeny("Error getting data " + error);
              }
            }
          );
      }
      else {
        command.replyAutoDeny("Sorry invalid input");
      }
    }
    if (command.command === "shiny" && perms.check(msg, "pokemon.shiny")) {
      let pokemon_name = command.args[0];
      if (pokemon_name && /^[^<@#\\\/>]*$/g.test(pokemon_name)) {
        Promise.resolve(pokedex.getPokemonByName(pokemon_name.toLowerCase())).then((response) => {
          command.createMessageAutoDeny(
            {
              embed: {
                title: cap(response.name),
                thumbnail: {url: response.sprites.front_shiny},
              }
            }
          );
        })
          .catch(function (error) {
            if (error.statusCode == "404") {
              command.replyAutoDeny("Could not find " + command.args[0]);
            } else {
              console.log('There was an ERROR with getting the data: ', error);
              command.replyAutoDeny("Error getting data " + error);
            }
          })
      }
      else {
        command.replyAutoDeny("Sorry invalid input");
      }
      return true;
    }
    if (command.commandnos === "pokestat" && perms.check(msg, "pokemon.pokestat")) {
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
              }
            }
          );
        })
          .catch(function (error) {
            if (error.statusCode == "404") {
              command.replyAutoDeny("Could not find " + command.args[0]);
            } else {
              console.log('There was an ERROR with getting the data: ', error);
              command.replyAutoDeny("Error getting data " + error);
            }
          });
      }
      else {
        command.replyAutoDeny("Sorry invalid input");
      }
      return true;

    }
    if (command.command === "hiddenability" && perms.check(msg, "pokemon.hiddenability")) {
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
                }
              }
            );
          })
          .catch(function (error) {
            if (error.statusCode == "404") {
              command.replyAutoDeny("Could not find " + command.args[0]);
            } else {
              console.log('There was an ERROR with getting the data: ', error);
              command.replyAutoDeny("Error getting data " + error);
            }
          });
      }
      else {
        command.replyAutoDeny("Sorry invalid input");
      }
      return true;
    }
    return false;
  }


}

function cap(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports = pokemon;