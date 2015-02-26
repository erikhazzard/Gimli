/* ==========================================================================
 * main.js
 * 
 * Our app's main entry point
 *
 * ========================================================================== */
var logger = require('bragi-browser');
var uuid = require('uuid');
var events = require('./events');

// Main socketIO / server communication stuff
// --------------------------------------
var setupSocketIO = require('./socket-io');

// Dev stuff
// --------------------------------------
var devInput = require('./dev-input')();

// TODO: GET ID FROM SERVER
var PLAYER_ID = uuid.v4();


// Utility for creating bodies and meshes
// --------------------------------------
var createBodyAndMesh = require('./create-body-and-mesh');


// Setup getPointer
// --------------------------------------
var PointerLockControls = require('./util/pointer-lock-controls');

// API for pointer control
var getPointer = require('./util/get-pointer');
getPointer();

// =========================================================================
//
// Setup Scripts
//
// =========================================================================
var sphereShape, playerCamera, world, physicsMaterial, walls=[], balls=[], ballMeshes=[], boxes=[], boxMeshes=[];

var camera, scene, renderer, stats;
var geometry; 
var controls,time = Date.now();

var movingBox;
var gameIsRunning = false;

// EVENTS
// --------------------------------------
events.on('game:controls:enabled', function(controlsEnabled){
    logger.log('EVENTS:main:game:controls:enabled', 
    'controls enabled: ' + controlsEnabled);

    controls.enabled = controlsEnabled;

    // The very first time the controls are enabled, start the game
    if(!gameIsRunning){
        runGameLoop();
        gameIsRunning = true;
    }

});

// SETUP
// --------------------------------------
initCannon();
init();

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

    world.gravity.set(0,-40,0);
    world.broadphase = new CANNON.NaiveBroadphase();

    // Create a slippery material (friction coefficient = 0.0)
    physicsMaterial = new CANNON.Material("slipperyMaterial");
    var physicsContactMaterial = new CANNON.ContactMaterial(
        physicsMaterial,
        physicsMaterial, {
            friction: 1.0, // friction coefficient
            restitution: 0.1  // restitution
    });

    // We must add the contact materials to the world
    world.addContactMaterial(physicsContactMaterial);

    // Create a sphere - the player's camera
    sphereShape = new CANNON.Sphere(1);
    playerCamera = new CANNON.Body({ mass: 5 });
    playerCamera.addShape(sphereShape);
    playerCamera.position.set(5,1,5);
    playerCamera.linearDamping = 0.95;
    world.add(playerCamera);

    // ----------------------------------
    // Create a plane
    // ----------------------------------
    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({ mass: 0 });

    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    world.add(groundBody);

    // ----------------------------------
    // SETUP SOCKET CONNECTION
    // ----------------------------------
    // TODO: GET ID FROM SERVER
    setupSocketIO( PLAYER_ID, {position: playerCamera.position});

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

    var hemiLight = new THREE.HemisphereLight( 0xf0f0f0, 0xffffff, 1 );
    hemiLight.position.set( - 1, 1, - 1 );
    scene.add( hemiLight );

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

    // ground groundMesh
    // ----------------------------------
    // floor
    geometry = new THREE.PlaneBufferGeometry( 300, 300, 50, 50 );
    geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );

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
    if(false){ // DONT ADD FOR NOW
    _.each(_.range(10), function(){ 
        var boxObj = createBodyAndMesh.createBox({ 
            x: (Math.random()-0.5)*20,
            y: 1 + (Math.random()-0.5)*1,
            z: (Math.random()-0.5)*20
        });
        world.add(boxObj.body);
        scene.add(boxObj.mesh);
        boxes.push(boxObj.body);
        boxMeshes.push(boxObj.mesh);
    });
    }


    // Setup controls
    // ----------------------------------
    controls = new PointerLockControls( camera , playerCamera );
    scene.add( controls.getObject() );

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

// ======================================
//
// Respond to player creations
//
// ======================================
var playerBodies = {}; // id: player object
var playerMeshes = {}; // id: player object

// --------------------------------------
// Listen for server updates
// --------------------------------------
events.on('game:player:add', function(options){
    options = options || {};

    var playerObj = createBodyAndMesh.createPlayer({ 
        x: options.x || (Math.random()-0.5)*20,
        y: options.y || 1 + (Math.random()-0.5)*1,
        z: options.z || (Math.random()-0.5)*20
    });
    var id = options.id || PLAYER_ID;

    world.add(playerObj.body);
    scene.add(playerObj.mesh);

    playerBodies[id] = playerObj.body;
    playerMeshes[id] = playerObj.mesh;

    logger.log('game:events:game:player:add', 
    'called | id : ' + id + ' | options: %O', 
    options);
});

events.on('game:player:disconnected', function(options){
    // Called when another client disconnects
    //
    //      id: target player ID
    //      position: new position in { x:_, y:_, z:_ }
    
    options = options || {};

    var id = options.id;
    var position = options.position;

    if(!playerBodies[id]){ 
        logger.log('warn:game:events:game:player:disconnected', 
        'no player bodies object found : ' + id);
        return; 
    }
    
    // TODO: Make sure this works
    world.remove(playerBodies[id]);
    scene.remove(playerMeshes[id]);

    delete playerBodies[id];
    delete playerMeshes[id];

    logger.log('game:events:game:player:disconnected', 'called : %O', options);
});

events.on('game:player:movement', function(options){
    // Called when client receives data from server.
    // options object will be formatted like:
    //
    //      id: target player ID
    //      position: new position in { x:_, y:_, z:_ }
    
    options = options || {};

    var id = options.id;
    var position = options.position;

    if(!playerBodies[id]){ 
        logger.log('warn:game:events:game:player:move', 
        'no player bodies object found');
        return; 
    }
    
    playerBodies[id].position.set(position.x, position.y, position.z);
    playerMeshes[id].position.set(position.x, position.y, position.z);

    logger.log('game:events:game:player:movemovement', 'called : %O', options);
});


// TODO: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX REMOVE
var lastMovementEventEmitted = Date.now();
var lastMovementTimeout;

document.addEventListener( 'keydown', function(event){

    // TODO: FOR DEV, SEND EVENT WHEN KEYDOWN
    if(Date.now() - lastMovementEventEmitted > 40){
        // let listeners know we're moving
        events.emit('self:game:player:movement', {
            id: PLAYER_ID,
            position: playerCamera.position
        });
        lastMovementEventEmitted = Date.now();

        // try to send again after a short while
        if(lastMovementTimeout){ clearTimeout( lastMovementTimeout ); }
        lastMovementTimeout = setTimeout(function(){
            if(Date.now() - lastMovementEventEmitted > 50){
                events.emit('self:game:player:movement', {
                    id: PLAYER_ID,
                    position: playerCamera.position
                });
            lastMovementEventEmitted = Date.now();
            }
        }, 500);
        
    }
}, false );

// ======================================
//
// Game Loop
//
// ======================================
var dt = 1/60;

function runGameLoop() {
    // PHYSICS
    // ----------------------------------
    // updates world
    world.step(dt);

    // Update box positions
    for(var i=boxes.length-1; i>=0; i--){
        boxMeshes[i].position.copy(boxes[i].position);
        boxMeshes[i].quaternion.copy(boxes[i].quaternion);
    }

    // update players
    for(var key in playerBodies){
        playerMeshes[key].position.copy(playerBodies[key].position);
        playerMeshes[key].quaternion.copy(playerBodies[key].quaternion);
    }

    // Updates controls
    controls.update( Date.now() - time );
    
    // RENDER
    // ----------------------------------
    // renders scene
    renderer.render( scene, camera );

    // sets time
    time = Date.now();

    // updates FPS stats
    stats.update();

    // Call loop
    requestAnimationFrame( runGameLoop );
}
