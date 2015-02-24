/* =========================================================================
 *
 * logging-helpers
 *      Helpers for logging
 *
 *
 *  ======================================================================== */
var _ = require('lodash');

module.exports.logData = function logData( req, dataObject ){
    // Takes in a data object and a request object and extends the dataObject
    // to include the req object data (data from req is 
    // added from ../bragi-util.js when a request is made)
    
    if(!dataObject){ dataObject = {}; }

    return _.assign( dataObject, req._metaObject);
};
