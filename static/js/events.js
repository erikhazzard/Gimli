/* ==========================================================================
 * events.js
 * 
 * Main event - app wide dispatcher
 *
 * ========================================================================== */
// Setup getPointer
var EventEmitter = require('events').EventEmitter;
var events = new EventEmitter();

// expose globally for testing
window.EVENTS = events;

module.exports = events;
