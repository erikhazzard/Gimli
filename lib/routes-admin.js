/* =========================================================================
 *
 * routes-admin.js
 *  Handles all admin routes
 *
 *  ======================================================================== */
var _ = require('lodash');

var nconf = require('nconf');
require('../conf/configure')();
var env = nconf.get('NODE_ENV');

// ======================================
//
// ROUTES
//
// ======================================
var routes = function routesApi(app){
    app.get('/ping', function (req, res){
        return res.send('pong');
    });

};

module.exports = routes;
