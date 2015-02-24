/* =========================================================================
 *
 * set-cache-headers.js
 *  Sets cache headers
 *  
 * ========================================================================= */
var nconf = require('nconf');
var logger = require('bragi');

module.exports = function setCacheHeaders( res, ttl ){
    // setCacheHeader
    //  Takes in an express `res` object and a `ttl` and sets the cache headers
    //
    //  Params:
    //      res: Express res object
    //      ttl: (Optional) {Number} or {Float}. If a number is provided, the
    //          ttl will be set to that number (in seconds). If a float is 
    //          provided, the default TTL will be multiplies by it (e.g., a
    //          value of 0.5 would set the TTL to half the default value).
    //
    //          If 0 is passed in, additional no-cache headers will be set. This
    //          will force no caching
    //
    //          If ttl is not defined or set to null, ttl will be set to the
    //          default value
    
    // By default, use the normalTTL values
    var maxAge = +(nconf.get('app:cacheNormalTTL') || 60);
    if(!maxAge) { maxAge = 10; }

    // if ttl was passed in, use it
    if(ttl === undefined || ttl === null){
        // Don't do anyhting if TTL is undefined
        maxAge = maxAge;
        // round it up
        maxAge = Math.ceil(+maxAge);
    } else if( ttl > 0 && ttl < 1 ){
        // detect a passed in float and scale the TTL (e.g., 0.5 would half the 
        // default TTL)
        maxAge = Math.ceil(+(+maxAge * +ttl));
    } else if ( ttl === 0 || ttl === '0' ){
        // detect 0 (force no cache) passed in
        maxAge = '0, no-cache, must-revalidate';
    } else if(ttl !== undefined){
        // otherwise, a number was passed in (number in second) use it
        maxAge = Math.ceil(+(ttl));
    }

    logger.log('setCacheHeaders', '・setCacheHeaders() : called : ttl: ' + 
        maxAge + ' | ' + 'Original TTL: ' + ttl);

    // Set the header
    res.setHeader('Cache-Control', 
        'public, max-age=' + maxAge
    );

    return res;
};
