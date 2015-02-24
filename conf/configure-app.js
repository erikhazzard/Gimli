/* =========================================================================
 *
 * configure-app.js
 *  Configures app and express related settings
 *
 *  ======================================================================== */
var _ = require('lodash');
var os = require('os');
var nconf = require('nconf');
var express = require('express');

var logger = require('bragi');
var bragiLogRoute = require('./bragi-util.js').logRoute;

var bodyParser = require('body-parser');
var multer = require('multer');
var methodOverride = require('method-override');
var compression = require('compression');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');

// ejs settings
var ejs = require('ejs');
ejs.open = '{{';
ejs.close = '}}';

var env = nconf.get('NODE_ENV');

var setupResSendPrepared = require('./express-middleware').setupResSendPrepared;


// App Configuration
// --------------------------------------
module.exports = function configureApp(app, routeFunctions){
    // Takes in two params:
    //      app: Express app object
    //      routeFunctions: array of route function objects, each function will
    //          be called with `app` passed in to setup routes

    //Set defaults (used if not set in file, environment, or command line)
    nconf.add('app', {
        'type': 'literal',
        'app': { 
            'cacheNormalTTL': 60,
            // Default port
            'port': 8200,
            'portHttps': 8243,
            'allowedDomains': '*',
            'cookie': {
                'maxAge': 86400000, //one year
                httpOnly: true,
                'key': '_c',
                'secret': '2b,OAjT|C=,hN1ag~,x_fLBX/34wejfinkX,$Rg7J`##G@r2Y`<JLNa=N'
            },

        }
    });

    // KNOX config (s3 uploading process)
    nconf.add('s3', {
        'type': 'literal',
        's3': {
            // uses profile "ios-profiles-s3"
            'key': '',
            'secret': '',
            'bucket': ''
        }
    });

    //Server config
    //-----------------------------------
    //we use EJS for template rendering
    app.set('views', __dirname + '/../templates');
    app.engine('html', ejs.__express);

    // don't expose server info
    app.disable('x-powered-by');

    // Compress everything
    app.use(compression());
    app.use(favicon(__dirname + '/../static/img/favicon.ico'));

    // Static serve
    app.use('/static', express.static(__dirname + '/../static'));

    // Show stack errors
    app.set('showStackError', true);

    if(env === 'local' || env === 'develop' || env === 'test'){
        // Set some config options based on environment
        app.locals.pretty = true;
    }

    // ----------------------------------
    //
    // Middleware
    //
    // ----------------------------------
    // Session / cookie related
    app.use(methodOverride('_method'));

    app.use(cookieParser(nconf.get('app:cookie:secret')));

    // individual : 
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    // multipart forms
    app.use(multer({ dest: '/tmp'}));

    // CORs support
    app.use(function(req, res, next){
        // Enable CORs support
        res.header('Access-Control-Allow-Origin', nconf.get('app:allowedDomains'));
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        // use utf8 encoding
        res.charset = 'utf-8';
        next();
    });

    // -----------------------------------
    //
    // Routes 
    //
    // -----------------------------------
    app.use(setupResSendPrepared);

    ////// use our cache preprocessor
    //app.use(function setCacheHeader(req,res,next){
        //// set default cache header
        //if(req.originalUrl.match(/^\/static/)){ 
            //setCacheHeaders(res);
        //} else {
            //setCacheHeaders(res, 0);
        //}
        //next();
    //});

    // Use bragi as a logger when routes are hit
    app.use(bragiLogRoute);
    
    // App Routes
    // ----------------------------------
    _.each(routeFunctions, function(route){
        route(app);
    });

    // Then, handle errors
    // ----------------------------------
    app.use(function handleError(err, req, res, next){
        Error.captureStackTrace(err, arguments.callee);
        var stackInfo = err.stack+'';
        stackInfo = stackInfo.replace(/\n/g, '\n\t');

        logger.log('error:express-app', 
        '(in handleError) Error with request: ' + req.url + ' | ' + 
        err + '\n\t' + stackInfo, {
            error: err,
        });

        // Don't set status for cloudfront
        return res.sendPrepared(null, {error: true, message: ''+err, 
            status: 500, date: +new Date()});
    });

    // Finally, handle missing pages
    // -----------------------------------
    app.use(function handleMissingPage(req, res, next){
        logger.log('error:express-app', 'Invalid page requested: ' + req.url);
        res.sendPrepared(null, {error: true, message: 'Invalid page', 
            status: 404, date: +new Date()});
    });
};
