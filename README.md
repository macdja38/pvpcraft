# pvpcraft
modular version of PvPBot with permissions, modules, access control and many many more features

# setup
Bot requires 2 files not yet here.
3 warframe files paths.json, sortie.json and languages.json which can be found at pvpcraft.ca/paths.json ect
index.php which is included but must be edited. be sure to configure it's url in config.json

# installation instructions
 Requires **node.js** v5 or greater, must be able to build native module's using node-gyp. RethinkDB is required for the master branch. **pm2** is optional but highly recomended.

 - `git clone https://github.com/macdja38/pvpcraft.git` to download the project
 - `cd pvpcraft` to open new directory.
 - `npm install` to install it's dependancies
 - if you have pm2 run the bot with `pm2 start pm2.json` if not run it using `node main.js`
 - bot will restart for the first 3 time's or so you run it. If modules fail to load they can be disabled by removing their lines in the config. 
 - Edit the config's to your liking (located in the config folder) make sure to add your bot account's token in auth.json

# Usage
For instruction's on how to use the instance of PvPCraft I host publicaly please see https://pvpcraft.ca/pvpbot
