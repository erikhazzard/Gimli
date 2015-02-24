/* =========================================================================
 *
 * bragi-express-util.js
 *      logging util functions for express
 *
 *      TODO: CLEAN THIS UP
 *
 * ========================================================================= */
var logger = require('bragi');
var _ = require('lodash');
var os = require("os");
var HOST_NAME = os.hostname();
var nconf = require('nconf');
var ENV = nconf.get('NODE_ENV');

// setup regex objects for tiny optimization (don't create a regex object for
// each request)
var REGEXES = {
    usersBase: /users\/([^\/?]+)/
};

var SINGLE_ITEM_ARRAY = ['']; // use for caching, is never modified


// If we want to add to influx
//var addMessageToInfluxData = require('./util/add-message-to-influx-db');

// --------------------------------------
//
// logRoute
//
// --------------------------------------
function logRoute ( req, res, next ){
    // Get the start time for requests. Use hrtime to get more precise results
    req._hrStartTime = process.hrtime();
    req._startDate = Date.now();

    // keep track of an ID so we can track requests and logs if we need to
    req._reqId = req._startDate + '||' + req._hrStartTime + '||' +
        (Math.random() * 100000 | 0);

    // ----------------------------------
    //
    // Get UserID and Room ID (for analytics / tracking)
    //
    // ----------------------------------
    // try to get user ID or room ID. Note-must get room id and userid from URL
    // because params hasn't been grabbed yet
    var userId = req.param('userId');
    if(!userId){
        userId = req.url.match(REGEXES.usersBase);
        userId = userId ? userId[1] : null;
    }

    // ----------------------------------
    //
    // Set up the meta object to send to analytics / graylog
    // 
    // ----------------------------------
    var metaObject = _.assign(
        {},
        req.query,
        req.body,
        { 
            userId: userId, 
            reqId: req._reqId
        }
    );

    // story body and query (yes, it's redundant, but we want to also know if
    // a user passed in a query as URL query or form data)
    if(req.body){ metaObject.body = req.body; }
    if(req.query){ metaObject.query = req.query; }

    // ----------------------------------
    //
    // Setup meta
    //
    // ----------------------------------
    var methodSymbol = {
        GET: logger.util.symbols.arrow,
        POST: logger.util.symbols.asterisk,
        PUT: logger.util.symbols.spade,
        DELETE: logger.util.symbols.boxError
    }[req.method];
    metaObject.method = req.method;

    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    metaObject.fullUrl = fullUrl;
    metaObject.fromHostname = HOST_NAME;
    metaObject.remoteAddress = req.connection.remoteAddress;
    metaObject.protocol = req.protocol;
    metaObject.isEventSourceConnection = false;

    // add any header info
    if(req.headers){ metaObject.headers = req.headers; }

    // ----------------------------------
    //
    // Log Message
    //
    // ----------------------------------
    // keep track of the meta obj - allow any endpoint to access it. Use
    // '_' to imply that it should not be modified
    req._metaObject = metaObject;

    // LOG IT
    logger.log('server:express-app:request:' + req.method, 
        logger.util.print(methodSymbol, 'yellow') + ' ' + 
        logger.util.print(req.method, 'blue') + ' : ' + fullUrl +
        logger.util.print(' | making request...', 'grey'),

        // send over data object
        metaObject
    );

    //// Add to analytics for incoming request
    //// ----------------------------------
    //// ignore pings
    //// NOTE: If we wanted to add to influx, do it here:
    //if(req.url !== '/ping'){
        //addMessageToInfluxData({
            //name: 'request:sent',
            //columns: [
                //"time", "value", "endpoint", "method", "hostname",
                //"remoteAddress", 
                //"env", "fullUrl", "protocol", 
                //"userId", "roomId",
                //"baseUrl", "reqId",
                //"isEventSourceConnection"
            //],
            //points: [[
                //Date.now(), 1, req.url, req.method, HOST_NAME, 
                //req.connection.remoteAddress,
                //ENV, metaObject.fullUrl, req.protocol, 
                //metaObject.userId, metaObject.roomId,
                //(req.url.match(/[^?]*/) || SINGLE_ITEM_ARRAY)[0],
                //req._reqId,
                //metaObject.isEventSourceConnection
            //]]
        //});
    //}

    // ==================================
    //
    // Log when the request finishes
    //
    // ==================================
    var end = res.end; // store original end function
    res.end = function (chunk, encoding) {
        // Function called when route has been processed, before returning
        // to client
        
        // get time diff in MS
        var diff = process.hrtime(req._hrStartTime);
        res.responseTime = (diff[0] * 1e9 + diff[1]) / 1e6;

        metaObject.responseTime = res.responseTime;
        metaObject.statusCode = res.statusCode;

        // Get a formatted string in a color depending on response time
        var responseTimeString = '';
        if(res.responseTime < 100){
            responseTimeString = logger.util
                .print(res.responseTime + ' ms', 'green');

        } else if(res.responseTime < 1000){
            responseTimeString = logger.util
                .print(res.responseTime + ' ms', 'yellow');

        } else {
            responseTimeString = logger.util
                .print(res.responseTime + ' ms', 'red');
        }

        var resSymbol = logger.util.symbols.success;
        var statusCode = logger.util.print(res.statusCode, 'green');

        // modify messages based on status
        if(res.statusCode >= 400){ 
            resSymbol = logger.util.symbols.warn;
            statusCode = logger.util.print(res.statusCode, 'yellow');
        } else if(res.statusCode >= 500){ 
            resSymbol = logger.util.symbols.error;
            statusCode = logger.util.print(res.statusCode, 'red');
        }

        //// log the response if it's not too big
        //if(chunk.length && chunk.length < 310126){
            //loggedData.chunk = chunk;
        //}
        //

        // Log it
        var groupName = 'server:express-app:response:' + req.method + ':' + res.statusCode;
        if(req.url === '/ping'){
            groupName += ':ping';
        }

        logger.log(groupName,
            resSymbol + logger.util.print(req.method, 'blue') + 
            ' : ' + fullUrl +
            logger.util.print(' | status:', 'grey') +
            statusCode + ' ' + '[ ' + responseTimeString + ' ] ' +
            logger.util.print(' request completed!', 'grey'),

            // send over data object
            metaObject
        );

        // SEND REQUEST
        res.end = end;
        res.end(chunk, encoding);

        //// Add to analytics
        //// NOTE: If we want to add to influx, do it here
        //if(req.url !== '/ping'){
            //addMessageToInfluxData({
                //name: 'request:completed',
                //columns: [
                    //"time", "value", "endpoint", "method", "hostname",
                    //"statusCode", "remoteAddress", 
                    //"env", "fullUrl", "protocol", 
                    //"userId", "roomId",
                    //"baseUrl", "reqId",
                    //"isEventSourceConnection"
                //],
                //points: [[
                    //Date.now(), res.responseTime, req.url, req.method, HOST_NAME, 
                    //res.statusCode, req.connection.remoteAddress,
                    //ENV, metaObject.fullUrl, req.protocol, 
                    //metaObject.userId, metaObject.roomId,
                    //(req.url.match(/[^?]*/) || SINGLE_ITEM_ARRAY)[0],
                    //req._reqId, 
                    //metaObject.isEventSourceConnection
                //]]
            //});
        //}
    };

    next();
}

module.exports.logRoute = logRoute;
