var sphereShape, playerCamera, world, physicsMaterial, walls=[], balls=[], ballMeshes=[], boxes=[], boxMeshes=[];

var camera, scene, renderer, stats;
var geometry, bulletBallMaterial;
var controls,time = Date.now();

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
    loader.load( 'img/skyboxsun25degtest.png', function ( image ) {
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
    var grassTexture = THREE.ImageUtils.loadTexture( "textures/grass.jpg" );
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

    var woodTexture = THREE.ImageUtils.loadTexture( "textures/wood.jpg" );
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
    if(controls.enabled==true){
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
