/**
 * Created by macdja38 on 2016-04-09.
 */
var names = require('../../Languages.json');
var paths = require('../../Paths.json');
var sortie = require('../../sortie.json');

var ParseState = function () {

};

/**
 * Get's the name of a item from it's filepath as provided in the worldstate
 * @param path
 * @returns {*}
 */
ParseState.prototype.getName = function getName(path) {
    try {
        if (paths[path]) {
            if (paths[path].LocalizeTag) {
                if (names[paths[path].LocalizeTag.toLowerCase()]) {
                    return names[paths[path].LocalizeTag.toLowerCase()].value.replace("'", "");
                }
                else {
                    return paths[path].LocalizeTag;
                }
            }
            else {
                return path;
            }
        } else {

        }
    } catch (error) {
        console.error(error);
        console.error(path);
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
        var names_path = names[path.toLowerCase()];
        if (names_path) {
            return names_path.value.replace("'", "");
        }
        console.error(path);
    } catch (error) {
        console.error(error);
        console.error(path);
        return path;
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
    return FactionName[0] + FactionName.substring(1).toLowerCase();
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

module.exports = ParseState;