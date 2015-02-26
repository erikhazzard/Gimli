/* ==========================================================================
 * socket-io.js
 * 
 *  Socket IO config
 *
 * ========================================================================== */
var logger = require('bragi-browser');
var events = require('./events');

function setupSocket( id, options ){
    var socket = io({bla: true});
    options = options || {};
    logger.log('socket-io:setupSocket', 'called with %O', options);

    // initial connection
    socket.emit('game:player:connected', {
        id: id, position: options.position
    });

    // ----------------------------------
    //
    // SOCKET EVENT LISTENERS
    //
    // ----------------------------------
    // CONNECT
    socket.on('broadcast:game:player:connected', function(options){ 
        logger.log('socket-io:game:player:connected', 
        'got message %O', options);

        if(options.id == id){ 
            logger.log('warn:socket-io:game:player:connected', 'ignoring own message');
            return; 
        }

        // otherwise, create an object for the player
        events.emit('game:player:add', {
            id: options.id,
            position: options.position
        });
    });

    // OTHER player movement
    socket.on('broadcast:game:player:movement', function(options){
        options = options || {};

        if(options.id == id){ 
            logger.log('warn:socket-io:game:player:movement', 'ignoring own message');
            return; 
        }

        logger.log('socket-io:game:player:movement', 
        'got message %O', options);

        // when player position event is emitted, send message to socketio
        events.emit('game:player:movement', {
            id: options.id,
            position: options.position
        });
    });

    // DISCONNECT
    socket.on('broadcast:game:player:disconnected', function(options){ 
        logger.log('socket-io:game:player:disconnected', 
        'got message %O', options);

        // otherwise, create an object for the player
        events.emit('game:player:disconnected', { id: options.id });
    });

    // ----------------------------------
    //
    // GAME EVENT LISTENERS (which trigger socket emits)
    // FOR Own triggers
    //
    // ----------------------------------
    var lastMovementEmit = Date.now();

    events.on('self:game:player:movement', function(options){
        // when player position event is emitted, send message to socketio
        socket.emit('game:player:movement', {
            id: id,
            position: options.position
        });
        lastMovementEmit = Date.now();
    });

}
module.exports = setupSocket;
