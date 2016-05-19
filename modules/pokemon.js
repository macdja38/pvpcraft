/**
 * Created by Martacus on 2016-05-18.
 */
"use strict";

var Pokedex = require('pokedex-promise-v2');

var P = new Pokedex();

module.exports = class pokemon {
    constructor(cl){
        this.client = cl;
    }

    getCommands(){
        return ["pokemon", "shiny", "stat", "hiddenability"];
    }

    onCommand(msg, command, perms, l){
        console.log("Pokemon initiated");
        if(command.command === "pokemon"&& perms.check(msg, "pokemon.pokemon")){
            var pokemon_name = command.arguments[0];
            P.getPokemonByName(pokemon_name)
                .then((response)=> {
                    var secondtype;
                    try{
                        secondtype = response.types[1].type.name;
                    }
                    catch(err){
                        secondtype = "";
                    }
                    this.client.sendMessage(msg.channel, "Pokemon: " + cap(response.name)
                        + "\nID: #" + response.id
                        + "\nTypes: " + cap(response.types[0].type.name) + " " + cap(secondtype)
                        + "\nHeight: " + response.height + "0cm"
                        + "\nWeight: " + response.weight + "00g"
                        + "\nBase XP: " + response.base_experience,
                        {file: {
                            file: response.sprites.front_default,
                            name: command.arguments[0] + ".png"
                        }})
                })
            .catch(function(error) {
                console.log('There was an ERROR with getting the data: ', error);
            });
        }
        if(command.command === "shiny"&& perms.check(msg, "pokemon.shiny")){
            var pokemon_name = command.arguments[0];
            P.getPokemonByName(pokemon_name)
                .then((response)=> {
                    this.client.sendMessage(msg.channel,
                        {file: {
                            file: response.sprites.front_shiny,
                            name: command.arguments[0] + ".png"
                        }})
                })
                .catch(function(error) {
                    console.log('There was an ERROR with getting the data: ', error);
                });
        }
        if(command.command === "stat"&& perms.check(msg, "pokemon.stats")){
            var pokemon_name = command.arguments[0];
            P.getPokemonByName(pokemon_name)
                .then((response)=> {
                    this.client.sendMessage(msg.channel,cap(response.stats[5].stat.name) + ": " + response.stats[5].base_stat
                        + "\n" + cap(response.stats[4].stat.name) + ": " + response.stats[4].base_stat
                        + "\n" + cap(response.stats[3].stat.name) + ": " + response.stats[3].base_stat
                        + "\n" + cap(response.stats[2].stat.name) + ": " + response.stats[2].base_stat
                        + "\n" + cap(response.stats[1].stat.name) + ": " + response.stats[1].base_stat
                        + "\n" + cap(response.stats[0].stat.name) + ": " + response.stats[0].base_stat)
                })
                .catch(function(error) {
                    console.log('There was an ERROR with getting the data: ', error);
                });
        }
        if(command.command === "hiddenability"&& perms.check(msg, "pokemon.hidden")){
            var pokemon_name = command.arguments[0];
            P.getPokemonByName(pokemon_name)
                .then((response)=> {
                    for (var i = 0; i < response.abilities.length; i++) {
                        if(response.abilities[i].is_hidden === true){
                            this.client.sendMessage(msg.channel, "Hidden ability: " + cap(response.abilities[i].ability.name))
                        }
                    }
                })
                .catch(function(error) {
                    console.log('There was an ERROR with getting the data: ', error);
                });
        }
    }


}

function cap(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
