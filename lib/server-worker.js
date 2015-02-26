/* =========================================================================
 * 
 * server-worker
 *      Single worker process that server spins up
 *
 * ========================================================================= */
var nconf = require('nconf');
require('../conf/configure')();

var http = require('http'); http.globalAgent.maxSockets = 40;

var fs = require('fs');
var path = require('path');

var SECRETS = require('../conf/configure-secrets');

// logger configured in configure-bragi
var logger = require('bragi');
require('../conf/configure-bragi')();

// Setup mongo
var db = require('./database');

// Setup App (express app handles its own config)
var app = require('./app');

// =========================================================================
//
// Server Setup
//
// =========================================================================

//// HTTP
// --------------------------------------
var server = http.createServer(app).listen(nconf.get('app:port'));
var io = require('socket.io').listen(server);

// setup socketIo stuff
require('./main')(io);

// Alert if event loop becomes blocked!
var blocked = require('blocked');
blocked(function(ms){
    ms = ms || 0;
    if(ms < 20){
        logger.log('warn:server:eventLoop:blocked', 
            'EVENT LOOP BLOCKED FOR ' + ms + 'ms');

    } else {
        logger.log('error:server:eventLoop:blocked', 
            'EVENT LOOP BLOCKED FOR ' + ms + 'ms');
    }
});

// Let the server log know we've connected
// NOTE: Use console log in this case *only* because we always want this
// message to show
logger.log('server', 
    'App Server started in environment: <' + nconf.get('NODE_ENV') + '> on PORT <' + nconf.get('app:port') + '>');

// Cactch and shutdown on errors
// ----------------------------------
// Catch the sigint to close the server
var closeEverything = function(err) {
    logger.log('warn:server', 'Shutting down...do androids dream of electric sheep?');

    if(err){
        // if there are errors, show them
        logger.log('error:server', ''+err);
        logger.log('error:server', ''+err.stack);

        // send message to slack that we're booting up
        if(SHOULD_SEND_SLACK_NOTIF){
            request.post(SLACK_WEBHOOKS.fiveNotifications,
                {form: {
                    payload: JSON.stringify({
                        text: os.hostname() + " | server: (" +
                        nconf.get('NODE_ENV') + ") ERROR::: " + err + 
                        ' ||| <' + err.stack + '>',
                        "icon_emoji": ":fire:",
                        username: "server-error"
                    })
                }},
                function (err, res, body){});
        }

    }

    // close the express app
    server.close();

    // finally, kill the process
    process.exit();
};

// when `SIGINT` event is recieved (user closes the app), shut down everything
process.on('SIGINT', closeEverything);
process.on('SIGTERM', closeEverything);
process.on('uncaughtException', closeEverything);
