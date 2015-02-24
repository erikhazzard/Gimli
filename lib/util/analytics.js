/* =========================================================================
 *
 * analytics
 *      Analytics util
 *
 *  ======================================================================== */
var _ = require('lodash');
var logger = require('bragi');
var addMessageToInfluxData = require('./add-message-to-influx-db');
var os = require('os');
var hostname = os.hostname();

function track ( options ){
    // Send to influx db
    // ----------------------------------
    var columns = ['time', 'value'];
    var point = [+new Date()];

    // have value always be second item
    if(!options.value){ point.push(1); } 
    else { point.push(options.value); }

    // add other keys
    _.each(options, function(value, key){
        // skip some keys
        if(key === 'group' || key === 'value'){
            // no op

        } else {
            // Update date to push
            columns.push(key);
            point.push(value);
        }
    });

    columns.push('hostname');
    point.push(hostname);

    // send over the message
    addMessageToInfluxData({
        name: options.group,
        columns: columns,
        points: [point]
    });
}

module.exports.track = track;
