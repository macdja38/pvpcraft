/**
 * Created by Martacus on 2016-05-18.
 */
"use strict";

let Pokedex = require('pokedex-promise-v2');

let utils = require('../lib/utils.js');

let P = new Pokedex();

module.exports = class pokemon {
  constructor(e) {
    this.client = e.client;
  }

  getCommands() {
    return ["pokemon", "shiny", "pokestat", "hiddenability"];
  }

  onCommand(msg, command, perms) {
    if (command.command === "pokemon" && perms.check(msg, "pokemon.pokemon")) {
      let pokemon_name = command.args[0];
      if (pokemon_name && /^[^<@#\\\/>]*$/g.test(pokemon_name)) {
        Promise.resolve(P.getPokemonByName(pokemon_name.toLowerCase())).then((response) => {
          let secondtype;
          try {
            secondtype = response.types[1].type.name;
          }
          catch (err) {
            secondtype = "";
          }
          this.client.createMessage(msg.channel.id,
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
          ).catch(perms.getAutoDeny(msg));
        })
          .catch(function (error) {
              if (error.statusCode == "404") {
                msg.channel.createMessage(msg.author.mention + ", " + "Could not find **" + utils.clean(command.args[0]) + "**").catch(perms.getAutoDeny(msg));
              } else {
                console.log('There was an ERROR with getting the data: ', error);
                msg.channel.createMessage(msg.author.mention + ", " + "Error getting data " + error).catch(perms.getAutoDeny(msg));
              }
            }
          );
      }
      else {
        msg.channel.createMessage(msg.author.mention + ", " + "Sorry invalid input");
      }
    }
    if (command.command === "shiny" && perms.check(msg, "pokemon.shiny")) {
      let pokemon_name = command.args[0];
      if (pokemon_name && /^[^<@#\\\/>]*$/g.test(pokemon_name)) {
        Promise.resolve(P.getPokemonByName(pokemon_name.toLowerCase())).then((response) => {
          this.client.createMessage(msg.channel.id,
            {
              embed: {
                title: cap(response.name),
                thumbnail: {url: response.sprites.front_shiny},
              }
            }
          ).catch(perms.getAutoDeny(msg));
        })
          .catch(function (error) {
            if (error.statusCode == "404") {
              msg.channel.createMessage(msg.author.mention + ", " + "Could not find " + command.args[0]);
            } else {
              console.log('There was an ERROR with getting the data: ', error);
              msg.channel.createMessage(msg.author.mention + ", " + "Error getting data " + error);
            }
          })
      }
      else {
        msg.channel.createMessage(msg.author.mention + ", " + "Sorry invalid input");
      }
      return true;
    }
    if (command.commandnos === "pokestat" && perms.check(msg, "pokemon.pokestat")) {
      let pokemon_name = command.args[0];
      if (pokemon_name && /^[^<@#\\\/>]*$/g.test(pokemon_name)) {
        Promise.resolve(P.getPokemonByName(pokemon_name.toLowerCase())).then((response) => {
          this.client.createMessage(msg.channel.id,
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
          ).catch(perms.getAutoDeny(msg));
        })
          .catch(function (error) {
            if (error.statusCode == "404") {
              msg.channel.createMessage(msg.author.mention + ", " + "Could not find " + command.args[0]).catch(perms.getAutoDeny(msg));
            } else {
              console.log('There was an ERROR with getting the data: ', error);
              msg.channel.createMessage(msg.author.mention + ", " + "Error getting data " + error).catch(perms.getAutoDeny(msg));
            }
          });
      }
      else {
        msg.channel.createMessage(msg.author.mention + ", " + "Sorry invalid input").catch(perms.getAutoDeny(msg));
      }
      return true;

    }
    if (command.command === "hiddenability" && perms.check(msg, "pokemon.hiddenability")) {
      let pokemon_name = command.args[0];
      if (pokemon_name && /^[^<@#\\\/>]*$/g.test(pokemon_name)) {
        Promise.resolve(P.getPokemonByName(pokemon_name.toLowerCase()))
          .then((response) => {
            this.client.createMessage(msg.channel.id,
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
            ).catch(perms.getAutoDeny(msg));
          })
          .catch(function (error) {
            if (error.statusCode == "404") {
              msg.channel.createMessage(msg.author.mention + ", " + "Could not find " + command.args[0]).catch(perms.getAutoDeny(msg));
            } else {
              console.log('There was an ERROR with getting the data: ', error);
              msg.channel.createMessage(msg.author.mention + ", " + "Error getting data " + error).catch(perms.getAutoDeny(msg));
            }
          });
      }
      else {
        msg.channel.createMessage(msg.author.mention + ", " + "Sorry invalid input").catch(perms.getAutoDeny(msg));
      }
      return true;
    }
    return false;
  }


};

function cap(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
