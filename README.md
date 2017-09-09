# pvpcraft
modular version of PvPBot with permissions, modules, access control and many many more features

# setup
Bot requires 1 file not yet here.
Paths.json which can be found at pvpcraft.ca/Paths.json (place one folder above project root)
For web https://github.com/macdja38/pvpsite must be setup and urls configured in this project's config/config.json

# installation instructions
 Requires **node.js** v8.1 or greater, must be able to build native module's using node-gyp, must have [git](https://git-scm.com/) installed. RethinkDB is required for the master branch. **pm2** is optional but highly recommended.

 - `git clone https://github.com/macdja38/pvpcraft.git` to download the project
 - `cd pvpcraft` to open new directory.
 - `npm install` to install it's dependencies
 - if you have pm2 run the bot with `pm2 start pm2.json` if not run it using `node main.js`
 - bot will restart for the first 3 time's or so you run it. If modules fail to load they can be disabled by removing their lines in the config. 
 - Edit the config's to your liking (located in the config folder) make sure to add your bot account's token in auth.json

# Usage
For instruction's on how to use the instance of PvPCraft I host publicly please see [user docs](https://bot.pvpcraft.ca/docs)  
For documentation to help with getting started writing your own modules please see [developers docs](https://macdja38.github.io/pvpcraft/)
