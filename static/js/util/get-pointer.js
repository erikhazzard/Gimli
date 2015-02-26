/* ==========================================================================
 * get-pointer.js
 * 
 *  Script to setup pointer / mouse lock. Handles interaction with freeze
 *  frame BEFORE game begins
 *
 * ========================================================================== */
var events = require('../events');
var logger = require('bragi-browser');
var _ = require('lodash');

// --------------------------------------
// Get pointer
// --------------------------------------
module.exports = function getPointer(){
    var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;
    var instructions = document.getElementById( 'instructions' );
    var blocker = document.getElementById( 'blocker' );
    var element = document.body;

    // HELPERS
    function showBlocker(){
        logger.log('get-pointer:showBlocker', 'showing instruction blocker');
        blocker.style.display = 'block';
    }
    function hideBlocker(){
        logger.log('get-pointer:showBlocker', 'showing instruction blocker');
        blocker.style.display = 'none';
    }

    // POINTER LOCK TEST
    // ----------------------------------
    if ( havePointerLock ) {
        var pointerlockchange = function pointerLockChange ( event ) {
            logger.log('get-pointer:pointerlockchange', 
            'pointer lock change called');

            if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {
                // LOCK IS GAINED
                events.emit('game:controls:enabled', true);
                blocker.style.display = 'none';

            } else {
                // LOCK IS LOST
                // When the lock is lost, show the blocker
                showBlocker();
            }
        };

        var pointerlockerror = function pointerLockError ( event ) {
            logger.log('get-pointer:pointerlockerror', 
            'error getting point lock', event);

            showBlocker();
            alert('Error getting pointer');
        };

        // Pointer lock change events
        // ------------------------------
        document.addEventListener( 'pointerlockchange', pointerlockchange, false );
        document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
        document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );

        document.addEventListener( 'pointerlockerror', pointerlockerror, false );
        document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
        document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );

        // ------------------------------
        // Remove block and get lock when instructions are clicked
        // ------------------------------
        _.each(['click', 'touchstart'], function(eventName){
            blocker.addEventListener(eventName, function ( event ) {
                hideBlocker();

                // Ask the browser to lock the pointer
                element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
                if (/Firefox/i.test( navigator.userAgent ) ) {
                    var fullscreenchange = function fullScreenChange ( event ) {
                        if ( document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element ) {
                            document.removeEventListener( 'fullscreenchange', fullscreenchange );
                            document.removeEventListener( 'mozfullscreenchange', fullscreenchange );
                            element.requestPointerLock();
                        }
                    };
                    document.addEventListener( 'fullscreenchange', fullscreenchange, false );
                    document.addEventListener( 'mozfullscreenchange', fullscreenchange, false );
                    element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;
                    element.requestFullscreen();
                } else {
                    element.requestPointerLock();
                }
            }, false );
        });

    } else {
        // Does NOT have pointer lock
        logger.log('get-pointer:cannotGetPointerLock', 
        'cannot get pointer lock');
        showBlocker();
        alert('Your browser does not support pointer lock');

    }

    // ----------------------------------
    // Handle alt tab / window switching
    // ----------------------------------
    document.addEventListener("visibilitychange", function() {
        logger.log('get-pointer:visibilitychange:' + document.visibilityState, 
        'visibility: ' + document.visibilityState);

        if(document.visibilityState){ 
            showBlocker();
        }
    });
    _.each(['focus', 'blur', 'onpageshow'], function(eventType){
        document.addEventListener(eventType, function() {
            logger.log('get-pointer:documentEvent:' + eventType,
            'document ' + eventType + ' event');

            if(document.visibilityState){ 
                showBlocker();
            }
        });
    });
};
