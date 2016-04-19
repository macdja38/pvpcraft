/**
 * Created by macdja38 on 2016-04-09.
 */
var names = require('../../names.json');
var paths = require('../../paths.json');
var sortie = require('../../sortie.json');

var ParseState = function() {

};

ParseState.prototype.getName = function getName(path) {
    try{
        console.log(path);
        console.log(paths[path]);
        return names[paths[path].toLowerCase()].name.replace("'", "");
    } catch (error) {
        console.error(error);
        console.error(path);
        return path;
    }
};

ParseState.prototype.getBoss = function getBoss(i) {
    return sortie.bosses[i];
};

ParseState.prototype.getRegion = function getRegion(i) {
    return sortie.regions[i];
};

ParseState.prototype.getModifiers = function getModifiers(i) {
    return sortie.modifiers[i];
};

module.exports = ParseState;