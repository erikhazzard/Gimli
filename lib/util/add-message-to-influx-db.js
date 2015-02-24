/* =========================================================================
 *
 * add-message-to-influx-db
 *      Analytics util to add data to influx db
 *
 *
 *  ======================================================================== */
var logger = require('bragi');
var nconf = require('nconf');

var _ = require('lodash');
var request = require('request');

// Analytics - InfluxDB - Grafana
require('../../conf/configure-analytics')();

// get influx from service wide config
var influxConfig = nconf.get('influxdb') || { };
var influxDbUrl = 
    (influxConfig.protocol || 'http') + '://' +
    influxConfig.host + '/db/' + 
    (influxConfig.db || 'analytics') + '/series?' +
    'u=' + influxConfig.username +
    '&p=' + influxConfig.password;

// ======================================
//
// Util to send message to influxdb
//
// ======================================
var SEND_INTERVAL = 300;
var INFLUX_DATA = [];

var INFLUX_TIMEOUT = setInterval( function sendMessageToInflux (){
    // send messages on an interval, then reset the influx data array
    if(INFLUX_DATA.length > 0){ 
        logger.log('sendMessagesToInflux', 
            'sending data: %j', {
                numMessages: INFLUX_DATA.length,
                url: influxDbUrl
            });

        // send the data
        request.post({
            url: influxDbUrl,
            headers: { 'content-type': 'application/json' },
            //pool : 'undefined' !== typeof options.pool ? options.pool : {},
            body: JSON.stringify(INFLUX_DATA)
        }, function done(e,res,body){
            if(e){ 
                logger.log('error:addMessageToInfluxData', 'error with request: ' + e); 
            }
        });

        INFLUX_DATA.length = 0;  // reset array
    }
}, SEND_INTERVAL);

function addMessageToInfluxData( data ){
    // Add messages to the INFLUX_DATA queue. 

    // ensure time is first column
    if( data.columns[0] !== 'time' ){
        //ensure time is added
        var now = +new Date();

        data.columns.unshift( 'time' );

        _.each(data.points, function (d){
            d.unshift(now);
        });
    }

    // update messages
    INFLUX_DATA.push(data);
}

module.exports = addMessageToInfluxData;
