/* ==========================================================================
 * dev-input.js
 * 
 *  Handle key input for dev command
 *
 * ========================================================================== */
var logger = require('bragi-browser');
var events = require('./events');

module.exports = function setupDevInput(){
    function onkeydown( event ) {
        switch( event.keyCode ) {
            case 80:
                logger.log('dev-input',
                'adding new entity');

                events.emit('game:player:add');
                break;
        }
    }

    document.addEventListener( 'keydown', onkeydown, false );
};
