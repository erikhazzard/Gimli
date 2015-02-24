/* ==========================================================================
 * events.js
 * 
 * Main event - app wide dispatcher
 *
 * ========================================================================== */
// Setup getPointer
var EventEmitter = require('events').EventEmitter;
var events = new EventEmitter();

module.exports = events;
