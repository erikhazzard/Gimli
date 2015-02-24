/* ==========================================================================
 *
 * app.js
 *  Main express app
 *
 * ========================================================================== */
var fs = require('fs');
var express = require('express');

// setup the models (DB) for this app
require('./setup-models');

// app module
var app = express();

// Configuration
// --------------------------------------
// Configure the app, pass in a reference to it
require('../conf/configure-app.js')(
    //first param is the app
    app, 
    // second param is an array of route objects
    [
        require('./routes-api'),
        require('./routes-app')
    ]
);

module.exports = app;
