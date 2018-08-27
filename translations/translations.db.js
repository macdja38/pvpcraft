const { define, ID } = require("i10010n");

module.exports = {
  [ID `Help can be found at https://bot.pvpcraft.ca/docs`]: {
    "de": define `Hilfe kann bei https://bot.pvpcraft.ca/docs gefunden werden.`,
  },
  [ID `${"moderation info"}\nPlease give the bot "Manage Webhooks" to enable non fallback functionality`]: {
    "de": define `${0}\nBitte geben Sie der Bot die Berechtigung "WebHooks verwalten", um die Nicht-Fallback-Funktionalität zu aktivieren.`,
  },
  [ID `ID`]: {
    "de": define `ID`,
  },
  [ID `Age`]: {
    "de": define `Datum`,
  },
  [ID `${"from"} to ${"to"}`]: {
    "de": define `${0} zu ${1}`,
  },
  [ID `${"from"} **to** ${"to"}`]: {
    "de": define `${0} **zu** ${1}`,
  },
  [ID `**Uncached** to ${"to"}`]: {
    "de": define `**Uncached** zu ${0}`,
  },
  [ID `User`]: {
    "de": define `Benutzer`,
  },
  [ID `Username`]: {
    "de": define `Nutzername`,
  },
  [ID `Member`]: {
    "de": define `Mitglied`,
  },
  [ID `Role`]: {
    "de": define `Rolle`,
  },
  [ID `Channel`]: {
    "de": define `Kanal`,
  },
  [ID `Channel Updated`]: {
    "de": define `Kanal aktualisiert`,
  },
  [ID `Topic Changed`]: {
    "de": define `Thema geändert`,
  },
  [ID `Status`]: {
    "de": define `Status`,
  },
  [ID `Created`]: {
    "de": define `Erstellt`,
  },
  [ID `Avatar`]: {
    "de": define `Benutzerbild`,
  },
  [ID `Content`]: {
    "de": define `Nachrichteninhalt`,
  },
  [ID `Member Updated`]: {
    "de": define `Mitglied aktualisieren`,
  },
  [ID `Message Updated`]: {
    "de": define `Nachricht geändert`,
  },
  [ID `Message Deleted`]: {
    "de": define `Nachricht gelöscht`,
  },
  [ID `Role Created`]: {
    "de": define `Rolle erstellen`,
  },
  [ID `Role Updated`]: {
    "de": define `Rolle aktualisieren`,
  },
  [ID `Role Deleted`]: {
    "de": define `Rolle gelöscht`,
  },
  [ID `Voice Leave`]: {
    "de": define `Benutzer verlässt Kanal`,
  },
  [ID `Voice Join`]: {
    "de": define `Benutzer tritt Kanal bei`,
  },
  [ID `Presence Updated`]: {
    "de": define `Anwesenheit aktualisiert`,
  },
  [ID `User Joined`]: {
    "de": define `Benutzer ist beigetreten`,
  },
  [ID `User Left or was Kicked`]: {
    "de": define `User Left oder wurde Kicked`,
  },


  // music
  [ID `Bound successfully use ${"prefix"}destroy to unbind it.`]: {
    "de": define `Bindded erfolgreich \`${0}destroy\`, um es zu lösen.`,
  },
  [ID `Disconnecting from voice chat and unbinding from text chat.`]: {
    "de": define `Vom Voice-Chat und Text-Chat trennen.`,
  },
  [ID `Binding to **${"voice channel"}** and **${"text channel"}**`]: {
    "de": define `Bindend an **${0}** und **${1}**.`,
  },
  [ID `You must be in a voice channel to use this command. If you are currently in a voice channel please rejoin it.`]: {
    "de": define `Sie müssen in einem Sprachkanal sein, um diesen Befehl verwenden zu können. Wenn Sie sich bereits \
in einem Sprachkanal befinden, stellen Sie die Verbindung wieder her.`,
  },
  [ID `Not bound. Double checking all bindings have been destroyed.`]: {
    "de": define `Nicht gebunden. Doppelte Überprüfung aller Bindungen wurde zerstört.`,
  },
  [ID `Please specify a youtube video, search term, or playlist!\n\`${"prefix"}play <video, search term, playlist>\``]: {
    "de": define `Bitte geben Sie ein Youtube-Video, einen Suchbegriff oder eine Playlist an!\n${0}play <Video, Suchbegriff, Playlist>`,
  },
  [ID `Please have someone with the permission node \`music.init\` run ${"prefix"}init `]: {
    "de": define `Bitte lassen Sie jemanden mit dem Berechtigungsknoten \`music.init\` ${0}init ausführen`,
  },
  [ID `Connection is not ready`]: {
    "de": define `Die Verbindung ist nicht bereit`,
  },
  [ID `Not a valid song index, please supply a number.`]: {
    "de": define `Kein gültiger Songindex, bitte geben Sie eine Nummer an.`,
  },
  [ID `Not enough songs to skip, queue a song using \`${"command"}play <youtube url of video or playlist>\`.`]: {
    "de": define `Nicht genügend Lieder zum Überspringen, ein Lied mit \`{0}play <youtube URL>\` einstellen.`,
  },
  [ID `Removing ${"songinfo"} from the queue.`]: {
    "de": define `Entfernen sie ${0} aus die Queue.`,
  },
  [ID `Not currently playing a song.`]: {
    "de": define `Momentan kein Lied abspielen`,
  },
  [ID `${"votes"}/${"max votes"} votes needed to skip ${"song name"}`]: {
    "de": define `${0}/${1} Stimmen benötigt, um ${2} zu überspringen.`,
  },
  [ID `Sorry, you may only vote to skip once per song.`]: {
    "de": define `Sorry, Sie können nur einmal pro Song wählen.`,
  },
  [ID `Paused Playback use ${"prefix"}resume to resume it.`]: {
    "de": define `Pausierte Wiedergabe Verwenden Sie \`${0}resume\` um fortzufahren.`,
  },
  [ID `Cannot pause unless something is being played`]: {
    "de": define `Kann nicht pausiert werden, wenn nicht etwas abgespielt wird`,
  },
  [ID `Cannot resume unless something is paused.`]: {
    "de": define `Kann nur fortgesetzt werden, wenn nicht etwas abgespielt wird`,
  },
  [ID `Playback resumed.`]: {
    "de": define `Die Wiedergabe wurde fortgesetzt`,
  },
  [ID `Queue cleared`]: {
    "de": define `Die Warteschlange wurde gelöscht`,
  },
  [ID `In order to vastly increase performance volume is currently disabled, This feature may be re-enabled in the future`]: {
    "de": define `Um die Leistung erheblich zu erhöhen, ist das Volumen derzeit deaktiviert. Diese Funktion wird möglicherweise in Zukunft wieder aktiviert.`,
  },
  [ID `Currently ${"time"} into ${"video"}`]: {
    "de": define `Zur Zeit ${0} im ${1}`,
  },
  [ID `Volume set to **${"volume"}**`]: {
    "de": define `Lautstärke auf **${0}** eingestellt`,
  },
  [ID `Sorry, invalid volume, please enter a number between 5 and 200`]: {
    "de": define `Entschuldigung, ungültige Lautstärke, bitte geben Sie eine Zahl zwischen 5 und 200 ein`,
  },
  [ID `Current volume is **${"volume"}**`]: {
    "de": define `Das aktuelle Volumen ist ${0}`,
  },
  [ID `Sorry but you must be in the same voice channel as the bot to use this command.`]: {
    "de": define `Entschuldigung, aber Sie müssen sich im selben Sprachkanal wie der Bot befinden, um diesen Befehl zu verwenden.`,
  },


  //
  [ID `Sorry, there was an error processing your command. The error is \`\`\`${"error"}\`\`\` reference code \`${"code"}\`"`]: {
    "de": define `Entschuldigung, bei der Verarbeitung Ihres Befehls ist ein Fehler aufgetreten. Der Fehler ist \`\`\`${0}\`\`\` Referenczcode \`${1}\``,
  },

};
