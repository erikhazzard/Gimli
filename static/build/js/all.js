(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* ==========================================================================
 * main.js
 * 
 * Our app's main entry point
 *
 * ========================================================================== */
// Setup getPointer
var events = require('./events');
var getPointer = require('./util/get-pointer');
getPointer();

// =========================================================================
//
// Setup Scripts
//
// =========================================================================
var sphereShape, playerCamera, world, physicsMaterial, walls=[], balls=[], ballMeshes=[], boxes=[], boxMeshes=[];

var camera, scene, renderer, stats;
var geometry, bulletBallMaterial;
var controls,time = Date.now();

var movingBox;

// EVENTS
// --------------------------------------
events.on('game:controls:enabled', function(controlsEnabled){
    controls.enabled = controlsEnabled;
});

// SETUP
// --------------------------------------
initCannon();
init();
animate();

function initCannon(){
    // Setup our world
    world = new CANNON.World();
    world.quatNormalizeSkip = 0;
    world.quatNormalizeFast = false;

    var solver = new CANNON.GSSolver();

    world.defaultContactMaterial.contactEquationStiffness = 1e9;
    world.defaultContactMaterial.contactEquationRelaxation = 4;

    solver.iterations = 7;
    solver.tolerance = 0.1;
    var split = true;
    if(split) { 
        world.solver = new CANNON.SplitSolver(solver);
    } else {  
        world.solver = solver;
    }

    world.gravity.set(0,-30,0);
    world.broadphase = new CANNON.NaiveBroadphase();

    // Create a slippery material (friction coefficient = 0.0)
    physicsMaterial = new CANNON.Material("slipperyMaterial");
    var physicsContactMaterial = new CANNON.ContactMaterial(
        physicsMaterial,
        physicsMaterial,
        0.0, // friction coefficient
        0.3  // restitution
    );

    // We must add the contact materials to the world
    world.addContactMaterial(physicsContactMaterial);

    // Create a sphere - the player's camera
    var mass = 5, radius = 1.1;
    sphereShape = new CANNON.Sphere(radius);
    playerCamera = new CANNON.Body({ mass: mass });
    playerCamera.addShape(sphereShape);
    playerCamera.position.set(0,5,0);
    playerCamera.linearDamping = 0.93;
    world.add(playerCamera);

    // Create a plane
    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    world.add(groundBody);
}

function init() {
    // ----------------------------------
    // Setup Renderer
    // ----------------------------------
    renderer = new THREE.WebGLRenderer();
    renderer.shadowMapEnabled = true;
    renderer.shadowMapSoft = true;

	renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );

    document.body.appendChild( renderer.domElement );

    // ----------------------------------
    // CAMERA
    // ----------------------------------
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

    // ----------------------------------
    // SCENE
    // ----------------------------------
    scene = new THREE.Scene();

    // ----------------------------------
    // LIGHTS
    // ----------------------------------
    if(true){
    light = new THREE.SpotLight( 0xffffff );
    light.position.set( 20, 30, 30 );
    light.target.position.set( 0, 0, 0 );
    light.castShadow = true;

    light.shadowCameraNear = 10;
    light.shadowCameraFar = 70; //camera.far;
    light.shadowCameraFov = 50;

    light.shadowMapBias = 0.1;
    light.shadowMapDarkness = 0.6;
    light.shadowMapWidth = 2*1024;
    light.shadowMapHeight = 2*512;

    scene.add( light );
    }

    var light = new THREE.HemisphereLight( 0xf0f0f0, 0xffffff, 1 );
    light.position.set( - 1, 1, - 1 );
    scene.add( light );



    // Skybox
    // ----------------------------------
    var cubeMap = new THREE.CubeTexture( [] );
    cubeMap.format = THREE.RGBFormat;
    cubeMap.flipY = false;
    var loader = new THREE.ImageLoader();
    loader.load( '/static/img/skyboxsun25degtest.png', function ( image ) {
        console.log(image);
        var getSide = function ( x, y ) {
            var size = 1024;
            var canvas = document.createElement( 'canvas' );
            canvas.width = size;
            canvas.height = size;
            var context = canvas.getContext( '2d' );
            context.drawImage( image, - x * size, - y * size );
            return canvas;
        };
        cubeMap.images[ 0 ] = getSide( 2, 1 ); // px
        cubeMap.images[ 1 ] = getSide( 0, 1 ); // nx
        cubeMap.images[ 2 ] = getSide( 1, 0 ); // py
        cubeMap.images[ 3 ] = getSide( 1, 2 ); // ny
        cubeMap.images[ 4 ] = getSide( 1, 1 ); // pz
        cubeMap.images[ 5 ] = getSide( 3, 1 ); // nz
        cubeMap.needsUpdate = true;
    } );

    var cubeShader = THREE.ShaderLib.cube;
    cubeShader.uniforms.tCube.value = cubeMap;

    var skyBoxMaterial = new THREE.ShaderMaterial( {
        fragmentShader: cubeShader.fragmentShader,
        vertexShader: cubeShader.vertexShader,
        uniforms: cubeShader.uniforms,
        depthWrite: false,
        side: THREE.BackSide
    });

    var skyBox = new THREE.Mesh(
        new THREE.BoxGeometry( 300,300,300 ),
        skyBoxMaterial
    );
    scene.add( skyBox );


    // Setup controls
    // ----------------------------------
    controls = new PointerLockControls( camera , playerCamera );
    scene.add( controls.getObject() );

    // floor
    geometry = new THREE.PlaneBufferGeometry( 300, 300, 50, 50 );
    geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );

    // ground groundMesh
    var grassTexture = THREE.ImageUtils.loadTexture( "/static/textures/grass.jpg" );
    grassTexture.anisotropy = 8;
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set( 32, 32 );
    var grassMaterial = new THREE.MeshLambertMaterial({ 
        shading: THREE.FlatShading,
        color: 0xddffdd, 
        map: grassTexture 
    });

    var groundMesh = new THREE.Mesh( geometry, grassMaterial );
    groundMesh.castShadow = false;
    groundMesh.receiveShadow = true;

    scene.add( groundMesh );

    // Add boxes
    // ----------------------------------
    var halfExtents = new CANNON.Vec3(1,0.5,1);
    var boxShape = new CANNON.Box(halfExtents);
    var boxGeometry = new THREE.BoxGeometry(halfExtents.x*2,halfExtents.y*2,halfExtents.z*2);

    var woodTexture = THREE.ImageUtils.loadTexture( "/static/textures/wood.jpg" );
    woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
    woodTexture.repeat.set( 1, 1 );
    var woodMaterial = new THREE.MeshLambertMaterial( { 
        shading: THREE.FlatShading,
        color: 0x7F7163, 
        map: woodTexture 
    });

    for(var i=0; i<7; i++){
        var x = (Math.random()-0.5)*20;
        var y = 1 + (Math.random()-0.5)*1;
        var z = (Math.random()-0.5)*20;
        var boxBody = new CANNON.Body({ mass: 5 });
        boxBody.addShape(boxShape);
        var boxMesh = new THREE.Mesh( boxGeometry, woodMaterial );
        world.add(boxBody);
        scene.add(boxMesh);
        boxBody.position.set(x,y,z);
        boxMesh.position.set(x,y,z);
        boxMesh.castShadow = true;
        boxMesh.receiveShadow = true;
        boxes.push(boxBody);
        boxMeshes.push(boxMesh);
    }

    // Add a randomly moving box
    // ----------------------------------
    var x = 10;
    var y = 10;
    var z = 10;
    var boxBody = new CANNON.Body({ mass: 55 });

    var halfExtents = new CANNON.Vec3(3,2.5,3);
    var boxShape = new CANNON.Box(halfExtents);
    var boxGeometry = new THREE.BoxGeometry(halfExtents.x*2,halfExtents.y*2,halfExtents.z*2);
    boxBody.addShape(boxShape);

    var boxMesh = new THREE.Mesh( boxGeometry, woodMaterial );
    world.add(boxBody);
    scene.add(boxMesh);
    boxBody.position.set(x,y,z);
    boxMesh.position.set(x,y,z);
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    boxes.push(boxBody);
    boxMeshes.push(boxMesh);

    // SETUP BALL MATERIAL
    // ----------------------------------
    bulletBallMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, envMap: cubeMap, refractionRatio: 0.95 } );


    // RESIZE
    // ----------------------------------
    window.addEventListener( 'resize', onWindowResize, false );

    // STATS
    // ----------------------------------
    var container = document.createElement( 'div' );
	document.body.appendChild( container );
    stats = new Stats();
	container.appendChild( stats.domElement );
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

var dt = 1/60;
function animate() {
    requestAnimationFrame( animate );
        
    if(controls.enabled){
        world.step(dt);

        // Update ball positions
        for(var i=0; i<balls.length; i++){
            ballMeshes[i].position.copy(balls[i].position);
            ballMeshes[i].quaternion.copy(balls[i].quaternion);
        }

        // DUMMY EXPERIMENT 
        if(Math.random() < 0.05){
            //// set random direction
            //boxes[boxes.length-1].velocity.set(
                //-20 + Math.random() * 40,
                //-20 + Math.random() * 40,
                //-20 + Math.random() * 40
            //);
            
            // Chase player
            boxes[boxes.length-1].position.set(
                playerCamera.position.x+5, 
                playerCamera.position.y+5, 
                playerCamera.position.z+10
            );
        }

        // Update box positions
        for(i=0; i<boxes.length; i++){
            boxMeshes[i].position.copy(boxes[i].position);
            boxMeshes[i].quaternion.copy(boxes[i].quaternion);
        }
    }

    controls.update( Date.now() - time );
    renderer.render( scene, camera );
    time = Date.now();

    stats.update();

}


// ======================================
//
// SHOOT BALLS
//
// ======================================
var ballShape = new CANNON.Sphere(0.2);
var ballGeometry = new THREE.SphereGeometry(ballShape.radius, 32, 32);
var shootDirection = new THREE.Vector3();
var shootVelo = 15;
var projector = new THREE.Projector();

function getShootDir(targetVec){
    var vector = targetVec;
    targetVec.set(0,0,1);
    projector.unprojectVector(vector, camera);
    var ray = new THREE.Ray(playerCamera.position, vector.sub(playerCamera.position).normalize() );
    targetVec.x = ray.direction.x;
    targetVec.y = ray.direction.y;
    targetVec.z = ray.direction.z;
}

window.addEventListener("click",function(e){
    if(controls.enabled === true){
        var x = playerCamera.position.x;
        var y = playerCamera.position.y;
        var z = playerCamera.position.z;
        var ballBody = new CANNON.Body({ mass: 1 });
        ballBody.addShape(ballShape);

        var ballMesh = new THREE.Mesh( ballGeometry, bulletBallMaterial );
        world.add(ballBody);
        scene.add(ballMesh);

        ballMesh.castShadow = true;
        ballMesh.receiveShadow = true;
        balls.push(ballBody);
        ballMeshes.push(ballMesh);
        getShootDir(shootDirection);
        ballBody.velocity.set(  shootDirection.x * shootVelo,
                                shootDirection.y * shootVelo,
                                shootDirection.z * shootVelo);

        // Move the ball outside the player sphere
        x += shootDirection.x * (sphereShape.radius*1.02 + ballShape.radius);
        y += shootDirection.y * (sphereShape.radius*1.02 + ballShape.radius);
        z += shootDirection.z * (sphereShape.radius*1.02 + ballShape.radius);
        ballBody.position.set(x,y,z);
        ballMesh.position.set(x,y,z);
    }
});

},{"./events":3,"./util/get-pointer":4}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],3:[function(require,module,exports){
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

},{"events":2}],4:[function(require,module,exports){
/* ==========================================================================
 * get-pointer.js
 * 
 *  Script to setup pointer / mouse lock. Handles interaction with freeze
 *  frame BEFORE game begins
 *
 * ========================================================================== */
var events = require('../events');

module.exports = function getPointer(){
    var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;
    var instructions = document.getElementById( 'instructions' );
    var blocker = document.getElementById( 'blocker' );
    var element = document.body;

    if ( havePointerLock ) {
        var pointerlockchange = function pointerLockChange ( event ) {
            if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {
                events.emit('game:controls:enabled', true);
                blocker.style.display = 'none';

            } else {
                events.emit('game:controls:enabled', false);
                instructions.style.display = '';
            }
        };

        var pointerlockerror = function ( event ) {
            instructions.style.display = '';
            alert('Error getting pointer');
        };

        // Hook pointer lock state change events
        document.addEventListener( 'pointerlockchange', pointerlockchange, false );
        document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
        document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );

        document.addEventListener( 'pointerlockerror', pointerlockerror, false );
        document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
        document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );

        instructions.addEventListener( 'click', function ( event ) {
            instructions.style.display = 'none';

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

    } else {
        instructions.style.display = 'block';
    }

    document.addEventListener("visibilitychange", function() {
        if(document.visibilityState){ blocker.style.display = 'block'; }
    });
    document.addEventListener("blur", function() {
        if(document.visibilityState){ blocker.style.display = 'block'; }
    });
};

},{"../events":3}]},{},[1]);
