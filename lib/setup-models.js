/* ==========================================================================
 *
 * setup-models.js
 *  Sets up and requires database and models for this app
 *
 * ========================================================================== */
var fs = require('fs');

// Require here (so test scripts can load app and access db)
var db = require('./database');

// Load up models
var modelsPath = __dirname + '/models';
fs.readdirSync(modelsPath).forEach(function loadModels(file){
    //load all mondel files models folder
    if (~file.indexOf('.js')){
        require(modelsPath + '/' + file);
    }
});
