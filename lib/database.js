/* ==========================================================================
 *
 * database.js
 * Sets up models and connects to the database
 *
 * ========================================================================== */
var nconf = require('nconf');
var logger = require('bragi');
var fs = require('fs');
var mongoose = require('mongoose');

//Configure db
require('../conf/configure-database.js')();

// Setup mongoose models
// NOTE: The services themselves must set up models

// Connect to the database
// --------------------------------------
var db = nconf.get('db');

// Log all DB queries for local / dev
if(nconf.get('NODE_ENV') === 'local' || nconf.get('NODE_ENV') === 'dev'){
    mongoose.set('debug', true);
}

mongoose.connect(db, function(err){
    if(err){
        //but if there's an error, exit the process
        logger.log('error:database', 'Could not connect to mongo at ' + db +
            '! \n\t\t\tMake sure mongo is running');
        //process.exit();
    }
    logger.log('database', logger.util.symbols.success + ' Connected to \033[1;97m\033[4;37m' +
        db + '\033[0m in environment: ' + nconf.get('NODE_ENV'));
});

mongoose.connection.on('error', function(err) {
    logger.log('error:database', logger.util.symbols.error + ' MongoDB error: %s', err);
});

module.exports = mongoose;
