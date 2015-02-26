/* =========================================================================
 * 
 * main
 *      PASS 1 - Main endpoint for all server communication
 *
 * ========================================================================= */
var _ = require('lodash');

var nconf = require('nconf');
require('../conf/configure')();

// logger configured in configure-bragi
var logger = require('bragi');
require('../conf/configure-bragi')();

// 
// Global data about players
// --------------------------------------
// NOTE: TODO: This should be shared across instances
// This keeps track only active players and their positions
var PLAYER_DATA = {};

// periodic info
setInterval( function(){
    logger.log('PLAYER_DATA', 'player data: %j', PLAYER_DATA);
}, 4000);

// =========================================================================
//
// Server Setup
//
// =========================================================================
module.exports = function( io ){

    io.on('connection', function(socket){
        logger.log('socketIo:connection',
        'client connected'); 

        _.each(PLAYER_DATA, function( val, key ){
            socket.emit('broadcast:game:player:connected', {
                id: key,
                position: val.position
            });
        });

        var playerId = null;

        // Initial connection
        socket.on('game:player:connected', function(msg){
            logger.log('socketIo:game:player:connected',
            'game player connected message %j', msg); 

            socket.broadcast.emit('broadcast:game:player:connected', {
                id: msg.id,
                position: msg.position 
            });
            
            // keep track of player ID
            playerId = msg.id;

            if(playerId !== null){ PLAYER_DATA[playerId] = { position: msg.position }; }
        });


        // when we get a message, emit player location
        socket.on('game:player:movement', function(msg){
            logger.log('socketIo:connection:movement:' + playerId, 
            'got movement : %j', msg);

            // emit data every time player moves
            socket.broadcast.emit('broadcast:game:player:movement', {
                id: playerId,
                position: msg.position
            });

            if(playerId !== null){
                PLAYER_DATA[playerId] = PLAYER_DATA[playerId] || {};
                PLAYER_DATA[playerId].position = msg.position;
            }
        });

        // Disconnect
        socket.on('disconnect', function(){
            logger.log('socketIo:connection:disconnection:' + playerId, 
            'client disconnected');

            io.emit('broadcast:game:player:disconnected', { 
                id: playerId 
            });

            if(playerId !== null){
                delete PLAYER_DATA[playerId]; 
            }
        });
    });
};
