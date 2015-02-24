//============================================================================
//
//configure-database.js
//  Configures winston related settings
//
//============================================================================
var nconf = require('nconf');

module.exports = function configure(){
    //get level based on environment
    var env = nconf.get('NODE_ENV');
    // Configure DB based on host

    var db = nconf.get('database:db');

    nconf.add('db', {
        'type': 'literal',
        //database
        db: db
    });
};
