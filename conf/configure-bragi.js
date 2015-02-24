/* =========================================================================
 *
 * configure-bragi.js
 *  Configures winston related settings
 * 
 * ========================================================================= */
var nconf = require('nconf');
require('./configure')();
var logger = require('bragi');

module.exports = function configBragi(){
    //get level based on environment
    var env = nconf.get('NODE_ENV');

    if(['localhost','test', 'dev', 'develop'].indexOf(env) !== -1){
        logger.options.showStackTrace = true;
        logger.transports.get('Console').property('showStackTrace', true);
    }

    // TODO: Bragi should allow transport to be set as singleton
    if(!logger.transports._transports.Graylog){
        // if it's not in the local / test environment, add graylog transport
        if(['test', 'local', 'localhost'].indexOf(env) === -1){
            if(nconf.get('services')){
                logger.transports.add(new logger.transportClasses.Graylog({
                    host: nconf.get('services').graylog.host,
                    port: nconf.get('services').graylog.port,

                    service: 'app', 

                    additionalOptions: {
                        // options to send for every requst
                        environment: env,
                        pid: process.pid,
                        service: 'api'
                    },

                    //groupsEnabled: [
                        ///server-api/,
                        ///fetch-user/,
                        ///app-activity-eventsource/
                    //],
                    groupsDisabled: [
                        /routeChatRoom:fetchedData:queueOpen/, 
                        /publishToExchange/,
                        /sendMessagesToInflux/, 
                        /amqpConnection:setupExchange/,
                        /analytics/,
                        /server-api:memory/,
                        /sendMessageToEventSource/
                    ]
                }));
            }
        }
    }
};
