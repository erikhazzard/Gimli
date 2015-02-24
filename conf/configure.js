/* ==========================================================================
 *
 * configure.js
 *  Handles the configuration of a passed in express app object based on 
 *  configuration file settings
 *
 *  ========================================================================= */
var nconf = require('nconf');
var logger = require('bragi');
var _ = require('lodash');

var configure = function configureEverything(){
    //order of hierarchy: 1. command line args, 2. environment vars, 3. file 
    nconf.argv()
        .env();

    //Set defaults. These are overwritten by contents of file
    nconf.defaults({
        //If NODE_ENV isn't provided, use a default
        //  NODE_ENV can be one of 'local', 'develop', 'staging', 'production', 
        //      or 'test'
        NODE_ENV: 'local'
    });

    //File is located in `conf/environment.json` where environment is NODE_ENV
    var env = nconf.get('NODE_ENV');
    if(env === 'localhost'){ env = 'local'; }

    // Get the proper configuration file per environment
    var configFile = __dirname + '/environment/' + env + '.json';

    //Load secrets files. NOTE: also, may contain a callbackurl for oauth
    nconf.file('secrets', __dirname + '/secrets.json');

    //Load corresponding file
    nconf.file({ file: configFile });

    // Make sure secrets exists / has data
    if(_.keys(nconf.stores.secrets.store).length < 1){
        logger.log('warn:server', 
        'conf/secrets.json NOT found! If your app has secrets, copy conf/secrets.example.json to conf/secrets.json');
    }
};

module.exports = configure;
