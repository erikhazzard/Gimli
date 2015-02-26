/* =========================================================================
 * 
 * server.js
 *      Main app server endpoint. To run;
 *          `node server.js`
 *
 * ========================================================================= */
var cluster = require('cluster');
var os = require('os');

var nconf = require('nconf');
require('./conf/configure')();

var numCPUs = require('os').cpus().length;
// NOTE: TODO: This must be 1 until we share memory (e.g., use redis / pubsub)
numCPUs = 1;

var logger = require('bragi');
require('./conf/configure-bragi')();

// Listen for dying workers
// --------------------------------------
cluster.on('exit', function (worker) {
    // Don't Replace the dead worker - we use monit to monitor process
    // we're not sentimental
    logger.log('error:server-push', 'Worker ' + worker.id + ' died');
});

if(cluster.isMaster){
    // ----------------------------------
    //
    // Master
    //
    // ----------------------------------
    // Fork processes
    // ==================================
    var workers = [];
    for(var i = 0; i < numCPUs; i++ ){
        workers.push(cluster.fork());
    }
} else {
    // ----------------------------------
    //
    // Workers
    //
    // ----------------------------------
    require('./lib/server-worker');
}
