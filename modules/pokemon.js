/**
 * Created by Martacus on 2016-05-18.
 */
"use strict";

var Pokedex = require('pokedex-promise-v2');

var Utils = require('../lib/utils.js');
var utils = new Utils();

var P = new Pokedex();

module.exports = class pokemon {
    constructor(e) {
        this.client = e.client;
    }

    getCommands() {
        return ["pokemon", "shiny", "pokestat", "hiddenability"];
    }

    onCommand(msg, command, perms) {
        console.log("Pokemon initiated");
        if (command.command === "pokemon" && perms.check(msg, "pokemon.pokemon")) {
            let pokemon_name = command.args[0].toLowerCase();
            if (/^[^<@#\\\/>]*$/g.test(pokemon_name)) {
                Promise.resolve(P.getPokemonByName(pokemon_name)).then((response)=> {
                        var secondtype;
                        try {
                            secondtype = response.types[1].type.name;
                        }
                        catch (err) {
                            secondtype = "";
                        }
                        this.client.sendMessage(msg.channel, "Pokemon: " + cap(response.name)
                            + "\nID: #" + response.id
                            + "\nTypes: " + cap(response.types[0].type.name) + " " + cap(secondtype)
                            + "\nHeight: " + response.height + "0cm"
                            + "\nWeight: " + response.weight + "00g"
                            + "\nBase XP: " + response.base_experience,
                            {
                                file: {
                                    file: response.sprites.front_default,
                                    name: command.args[0] + ".png"
                                }
                            })
                    })
                    .catch(function (error) {
                            if (error.statusCode == "404") {
                                msg.reply("Could not find **" + utils.clean(command.args[0]) + "**");
                            } else {
                                console.log('There was an ERROR with getting the data: ', error);
                                msg.reply("Error getting data " + error);
                            }
                        }
                    );
            }
            else {
                msg.reply("Sorry invalid input");
            }
        }
        if (command.command === "shiny" && perms.check(msg, "pokemon.shiny")) {
            let pokemon_name = command.args[0].toLowerCase();
            if (/^[^<@#\\\/>]*$/g.test(pokemon_name)) {
                let P = new Pokedex();
                Promise.resolve(P.getPokemonByName(pokemon_name)).then((response) => {
                        this.client.sendMessage(msg.channel,
                            {
                                file: {
                                    file: response.sprites.front_shiny,
                                    name: command.args[0] + ".png"
                                }
                            })
                    })
                    .catch(function (error) {
                        if (error.statusCode == "404") {
                            msg.reply("Could not find " + command.args[0]);
                        } else {
                            console.log('There was an ERROR with getting the data: ', error);
                            msg.reply("Error getting data " + error);
                        }
                    })
            }
            else {
                msg.reply("Sorry invalid input");
            }
            return true;
        }
        if (command.commandnos === "pokestat" && perms.check(msg, "pokemon.pokestat")) {
            var pokemon_name = command.args[0].toLowerCase();
            if (/^[^<@#\\\/>]*$/g.test(pokemon_name)) {
                Promise.resolve(P.getPokemonByName(pokemon_name)).then((response)=> {
                        this.client.sendMessage(msg.channel, cap(response.stats[5].stat.name) + ": " + response.stats[5].base_stat
                            + "\n" + cap(response.stats[4].stat.name) + ": " + response.stats[4].base_stat
                            + "\n" + cap(response.stats[3].stat.name) + ": " + response.stats[3].base_stat
                            + "\n" + cap(response.stats[2].stat.name) + ": " + response.stats[2].base_stat
                            + "\n" + cap(response.stats[1].stat.name) + ": " + response.stats[1].base_stat
                            + "\n" + cap(response.stats[0].stat.name) + ": " + response.stats[0].base_stat)
                    })
                    .catch(function (error) {
                        if (error.statusCode == "404") {
                            msg.reply("Could not find " + command.args[0]);
                        } else {
                            console.log('There was an ERROR with getting the data: ', error);
                            msg.reply("Error getting data " + error);
                        }
                    });
            }
            else {
                msg.reply("Sorry invalid input");
            }
            return true;

        }
        if (command.command === "hiddenability" && perms.check(msg, "pokemon.hiddenability")) {
            let pokemon_name = command.args[0].toLowerCase();
            if (/^[^<@#\\\/>]*$/g.test(pokemon_name)) {
                Promise.resolve(P.getPokemonByName(pokemon_name))
                    .then((response)=> {
                        for (var i = 0; i < response.abilities.length; i++) {
                            if (response.abilities[i].is_hidden === true) {
                                this.client.sendMessage(msg.channel, "Hidden ability: " + cap(response.abilities[i].ability.name))
                            }
                        }
                    })
                    .catch(function (error) {
                        if (error.statusCode == "404") {
                            msg.reply("Could not find " + command.args[0]);
                        } else {
                            console.log('There was an ERROR with getting the data: ', error);
                            msg.reply("Error getting data " + error);
                        }
                    });
            }
            else {
                msg.reply("Sorry invalid input");
            }
            return true;
        }
        return false;
    }


};

function cap(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
