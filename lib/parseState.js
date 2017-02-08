/**
 * Created by macdja38 on 2016-04-09.
 */
"use strict";

let WarframeData = require("./WarframeData");
let languages = new WarframeData({fileName: "Languages"});
let missionDecks = new WarframeData({fileName: "MissionDecks"});
let starChart = new WarframeData({fileName: "StarChart"});
let paths = require('../../Paths.json');
const Utils = require('./utils');
const utils = new Utils();

let ActiveMissionMap = {
  VoidT1: {
    name: "Lith"
  },
  VoidT2: {
    name: "Meso"
  },
  VoidT3: {
    name: "Neo"
  },
  VoidT4: {
    name: "Axi"
  }
};

class ParseState {
  constructor() {

  }

  /**
   * Get's the locations a thing can drop from
   * @param {string} part
   */
  getLocations(part) {
    let data = missionDecks.getData();
    let partsList = [];
    let lvl2Keys = ["Rotation A", "Rotation B", "Rotation C"];
    Object.keys(data).forEach(a => {

    });
  }

  /**
   * Get's the name of a item from it's filepath as provided in the worldstate
   * @param path
   * @returns {*}
   */
  getName(path) {
    try {
      if (!paths.hasOwnProperty(path)) return path;
      let item = paths[path];
      if (!item.hasOwnProperty("LocalizeTag")) return path;
      let languageString = item.LocalizeTag;
      let localisedString = languages.get(languageString);
      if (!localisedString) return languageString;
      return localisedString;
    } catch (error) {
      console.error(path);
      console.error(error);
      return path;
    }
  }

  /**
   * Get's a mission discription from it's language path
   * @param path
   * @returns {*}
   */
  getLevel(path) {
    try {
      console.log(path);
      var names_path = languages.get(path);
      if (names_path) {
        return names_path.replace("'", "");
      }
      console.error(path);
    } catch (error) {
      console.error(error);
      console.error(path);
      return path;
    }
  }

  /**
   * Converts item time and worldstate to time difference in human readable format.
   * @param state Current worldstate
   * @param itemTime items time object
   * @returns {string}
   */
  toTimeDifference(state, itemTime) {
    return utils.secondsToTime(itemTime.$date.$numberLong/1000 - state.Time);
  }

  /**
   * Converts item time and worldstate to time difference in human readable format.
   * @param state Current worldstate
   * @param itemTime items time object
   * @returns {string}
   */
  toTimeDifferenceInPast(state, itemTime) {
    return utils.secondsToTime(state.Time - itemTime.$date.$numberLong/1000);
  }

  /**
   * Converts item time into ISO date
   * @param itemTime items time object
   * @returns {string}
   */
  toISOTime(itemTime) {
    return new Date(parseInt(itemTime.$date.$numberLong)).toISOString()
  }

  /**
   * Get's a node from it's sort Name eg SolNode10
   */
  getNode(name) {
    try {
      return starChart.get(name);
    } catch (error) {
      console.error(error);
      console.error(name);
      return name;
    }
  }

  /**
   * Get's a node name from it's sort Name eg SolNode10
   */
  getNodeName(name) {
    try {
      let node = starChart.get(name);
      if (!node) return name;
      return node.name;
    } catch (error) {
      console.error(error);
      console.error(name);
      return name;
    }
  }

  /**
   * Returns the faction name in pretty case from the string given in the worldstate api
   * @param string
   * @returns {string}
   */
  getFaction(string) {
    let FactionName = string.match(/_(\w+)/)[1];
    return FactionName[0] + FactionName.substring(1).toLowerCase();
  }

  /**
   * Returns the Mission type in pretty case from the string given in the worldstate api
   * @param string
   * @returns {string}
   */
  getMissionType(string) {
    let FactionName = string.match(/_(\w+)/)[1];
    return toTitleCase(FactionName.replace(/_/g, " "));
  }

  /**
   * Returns the substring of a sortie mission modifier in popper case without the sortie_modifier part
   * @param string
   * @returns {*}
   */
  getSortieModifier(string) {
    if(string.startsWith("SORTIE_MODIFIER_")) {
      let strippedString = string.substring(16).replace(/_/g, " ");
      return strippedString[0] + strippedString.substring(1).toLowerCase();
    }
    return string;
  }

  getTierName(i) {
    return ActiveMissionMap[i];
  }
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

module.exports = ParseState;