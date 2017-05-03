/**
 * Created by macdja38 on 2016-04-09.
 */
"use strict";

let WarframeData = require("./WarframeData");
let languages = new WarframeData({fileName: "Languages"});
let missionDecks = new WarframeData({fileName: "MissionDecks"});
let starChart = new WarframeData({fileName: "StarChart"});
let paths = require('../../Paths.json');
const utils = require('./utils');

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

/**
 * WorldState parser
 */
class ParseState {
  /**
   * Builds an embed from an alert
   * @param {Object} alert
   * @param {string} platform
   * @param {Object} state
   * @returns {{embed: {title: string, fields: Array, footer: {text: string}, timestamp: string}, itemString: string}}
   */
  static buildAlertEmbed(alert, platform, state) {
    console.log(alert);
    const title = "Warframe Alert";
    let rewards = [];
    let reward = alert.MissionInfo.missionReward;
    if (reward.countedItems) {
      rewards = reward.countedItems.map(i => {
        let possibleInfo = ParseState.getInfo(i.ItemType);
        if (possibleInfo) {
          i.ItemInfo = possibleInfo;
        }
        return i;
      })
    }
    if (reward.items) {
      rewards.push(...reward.items.map(i => {
        let thing = {ItemType: i, ItemCount: 1};
        let possibleInfo = ParseState.getInfo(i);
        if (possibleInfo) {
          thing.ItemInfo = possibleInfo;
        }
        return thing;
      }));
    }
    console.log(rewards);
    let itemString;
    if (rewards) {
      itemString = rewards.map(i => ParseState.getName(i.ItemType)).join(" ").toLowerCase();
    }
    console.log(itemString);
    const fields = [
      {name: "Remaining", value: ParseState.toTimeDifference(state, alert.Expiry), inline: true},
      {name: "Platform", value: platform.toUpperCase(), inline: true},
      {name: "Location", value: `${ParseState.getNodeName(alert.MissionInfo.location)} ${alert.MissionInfo.minEnemyLevel}-${alert.MissionInfo.maxEnemyLevel}`, inline: true},
      {name: "Mission", value: ParseState.getFaction(alert.MissionInfo.faction) + " " + ParseState.getMissionType(alert.MissionInfo.missionType), inline: true},
    ];


    if (rewards) {
      rewards.forEach(r => fields.push({
        name: "Reward",
        value: (r.ItemCount > 1 ? `${r.ItemCount}x` : "") + ParseState.getName(r.ItemType),
        inline: true
      }))
    }
    if (reward.credits) {
      if (itemString) {
        itemString += `${reward.credits}cr`;
      } else {
        itemString = `${reward.credits}cr`;
      }
      fields.push({name: "Credits", value: reward.credits, inline: true})
    }
    let embed = {
      title,
      fields,
      footer: {text: "Expires"},
      timestamp: new Date(parseInt(alert.Expiry.$date.$numberLong, 10)).toISOString(),
    };
    let itemURL;
    if (rewards) {
      for (let item of rewards) {
        if (item.ItemInfo && item.ItemInfo.IconTexture) {
          itemURL = `https://i.pvpcraft.ca/MobileExport${item.ItemInfo.IconTexture}`;
          if (item.ItemInfo.IconTexture.includes("/Lotus/Interface/Cards/")) {
            itemURL = itemURL.replace(".png", ".jpeg");
          }
          break;
        }
      }
      if (itemURL) {
        embed.thumbnail = {url: itemURL};
      }
    }
    return {embed, itemString};
  }

  /**
   * Get's the locations a thing can drop from
   * @param {string} part
   */
  static getLocations(part) {
    let data = missionDecks.getData();
    let partsList = [];
    let lvl2Keys = ["Rotation A", "Rotation B", "Rotation C"];
    Object.keys(data).forEach(a => {

    });
  }

  /**
   * Get's the name of a item from it's filepath as provided in the worldstate
   * @param {string} path
   * @returns {string}
   */
  static getName(path) {
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
   * @param {string} path
   * @returns {string}
   */
  static getLevel(path) {
    try {
      console.log(path);
      let names_path = languages.get(path);
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
   * Returns the info from the Paths.json file about a specific path if it exists, null if not
   * @param {String} path
   * @returns {Object|Null}
   */
  static getInfo(path) {
    if (!paths.hasOwnProperty(path)) return null;
    return paths[path];
  }

  /**
   * Converts item time and worldstate to time difference in human readable format.
   * @param {{Time: number}} state Current worldstate
   * @param {{$date: {$numberLong: number}}} itemTime time object
   * @returns {string}
   */
  static toTimeDifference(state, itemTime) {
    return utils.secondsToTime(itemTime.$date.$numberLong / 1000 - state.Time);
  }

  /**
   * Converts item time and worldstate to time difference in human readable format.
   * @param {{Time: number}} state Current worldstate
   * @param {{$date: {$numberLong: number}}} itemTime items time object
   * @returns {string}
   */
  static toTimeDifferenceInPast(state, itemTime) {
    return utils.secondsToTime(state.Time - itemTime.$date.$numberLong / 1000);
  }

  /**
   * Converts item time into ISO date
   * @param {{$date: {$numberLong: number}}} itemTime items time object
   * @returns {string}
   */
  static toISOTime(itemTime) {
    return new Date(parseInt(itemTime.$date.$numberLong)).toISOString()
  }

  /**
   * Get's a node from it's sort Name eg SolNode10
   * @param {string} name The solar nodes name eg `SolNode10`
   * @returns {Object} node data
   */
  static getNode(name) {
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
   * @param {string} name The solar nodes name eg `SolNode10`
   * @returns {string} node name
   */
  static getNodeName(name) {
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
   * @param {string} string
   * @returns {string}
   */
  static getFaction(string) {
    let FactionName = string.match(/_(\w+)/)[1];
    return FactionName[0] + FactionName.substring(1).toLowerCase();
  }

  /**
   * Returns the Mission type in pretty case from the string given in the worldstate api
   * @param {string} string
   * @returns {string}
   */
  static getMissionType(string) {
    let FactionName = string.match(/_(\w+)/)[1];
    return ParseState._toTitleCase(FactionName.replace(/_/g, " "));
  }

  /**
   * Returns the substring of a sortie mission modifier in popper case without the sortie_modifier part
   * @param {string} string
   * @returns {*}
   */
  static getSortieModifier(string) {
    if (string.startsWith("SORTIE_MODIFIER_")) {
      let strippedString = string.substring(16).replace(/_/g, " ");
      return strippedString[0] + strippedString.substring(1).toLowerCase();
    }
    return string;
  }

  /**
   * Get's the tier name;
   * @param {string} i
   * @returns {*}
   */
  static getTierName(i) {
    return ActiveMissionMap[i];
  }

  /**
   * Converts a string to title case
   * @param {string} str
   * @returns {string}
   * @private
   */
  static _toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }
}

module.exports = ParseState;