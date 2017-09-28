## pvpcraft
A modular version of PvPBot with permissions, modules, access control, and many, many more features

## setup
The bot requires 1 file not yet here: Paths.json. It can be found at [pvpcraft.ca/Paths.json](https://pvpcraft.ca/Paths.json) (place it one folder above project root).
For web, [github.com/macdja38/pvpsite](https://github.com/macdja38/pvpsite) must be setup, and URLs must be configured in this project's `config/config.json`.

## installation instructions
Requires **node.js** v8.1 or greater, the ability to build native module's using node-gyp, and [git](https://git-scm.com/). RethinkDB is required for the master branch. **pm2** is optional, but it's highly recommended.

#### In your command line of choice, enter:
 - `git clone https://github.com/macdja38/pvpcraft.git` to download the project,
 - `cd pvpcraft` to open the new project directory made by git,
 - `npm install` to install it's dependencies,
 - `pm2 start pm2.json` to start the bot if you have pm2
 **OR**
 - `node main.js` if you don't
 
 #### Note:
 - The bot will restart for the first 3-ish times you run it
 - If modules fail to load, they can be disabled by removing their lines in the config file
 - Edit the configs to your liking (they're located in the config folder)
 - Make sure to add your bot account's token to auth.json

## Usage
For instructions on how to use the instance of PvPCraft I host publicly, please see [user docs](https://bot.pvpcraft.ca/docs).  
For documentation to help with getting started writing your own modules, please see [developers docs](https://macdja38.github.io/pvpcraft/).
