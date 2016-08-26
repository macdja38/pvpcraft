/**
 * Created by macdja38 on 2016-04-09.
 */
"use strict";

var names = require('../../Languages.json');
var paths = require('../../Paths.json');
var sortie = require('../../sortie.json');
var nodes = require('../../Nodes.json');

var ActiveMissionMap = {
    VoidT1: {
        name: "Lith"
    },
    VoidT2: {
        name: "Miso"
    },
    VoidT3: {
        name: "Neo"
    },
    VoidT4: {
        name: "Axi"
    }
};

var ParseState = function () {

};

/**
 * Get's the name of a item from it's filepath as provided in the worldstate
 * @param path
 * @returns {*}
 */
ParseState.prototype.getName = function getName(path) {
    try {
        if(!paths.hasOwnProperty(path)) return path;
        let item = paths[path];
        if(!item.hasOwnProperty("LocalizeTag")) return path;
        let languageString = item.LocalizeTag;
        if (!names.hasOwnProperty(languageString)) return languageString;
        return names[languageString];
    } catch (error) {
        console.error(path);
        console.error(error);
        return path;
    }
};

/**
 * Get's a mission discription from it's language path
 * @param path
 * @returns {*}
 */
ParseState.prototype.getLevel = function getName(path) {
    try {
        console.log(path);
        var names_path = names[path];
        if (names_path) {
            return names_path.replace("'", "");
        }
        console.error(path);
    } catch (error) {
        console.error(error);
        console.error(path);
        return path;
    }
};

/**
 * Get's a node from it's sort Name eg SolNode10
 */
ParseState.prototype.getNode = function getNode(name) {
    try {
        console.log(name);
        var node = nodes[name];
        if (node) {
            return node;
        }
        console.error(name);
    } catch (error) {
        console.error(error);
        console.error(name);
        return name;
    }
};

/**
 * Get's a node name from it's sort Name eg SolNode10
 */
ParseState.prototype.getNodeName = function getNodeName(name) {
    try {
        console.log(name);
        var node_tag = nodes[name].locTag;
        console.log(node_tag);
        if (node_tag) {
            return names[node_tag].replace("'", "");
        }
        console.error(name);
    } catch (error) {
        console.error(error);
        console.error(name);
        return name;
    }
};

/**
 * Returns the faction name in pretty case from the string given in the worldstate api
 * @param string
 * @returns {string}
 */
ParseState.prototype.getFaction = function getFaction(string) {
    var FactionName = string.match(/_(\w+)/)[1];
    return FactionName[0] + FactionName.substring(1).toLowerCase();
};

/**
 * Returns the Mission type in pretty case from the string given in the worldstate api
 * @param string
 * @returns {string}
 */
ParseState.prototype.getMissionType = function getMissionType(string) {
    var FactionName = string.match(/_(\w+)/)[1];
    return toTitleCase(FactionName.replace(/_/g, " "));
};

/**
 * Get's sortie boss from index
 * @param i
 */
ParseState.prototype.getBoss = function getBoss(i) {
    return sortie.bosses[i];
};

/**
 * Get's sortie's location from index
 * @param i
 */
ParseState.prototype.getRegion = function getRegion(i) {
    return sortie.regions[i];
};

/**
 * Get's sortie's modifier from index.
 * @param i
 */
ParseState.prototype.getModifiers = function getModifiers(i) {
    return sortie.modifiers[i];
};

ParseState.prototype.getTierName = function getTierName(i) {
    return ActiveMissionMap[i];
};

function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

module.exports = ParseState;