/* ==========================================================================
 * create-player.js
 * 
 *  Utility for create player geom
 *
 * ========================================================================== */
var logger = require('bragi-browser');
var events = require('./events');

// =========================================================================
// 
// Create Box
//
// =========================================================================
function createBox( options ){
    options = options || {};

    var x = options.x || (Math.random()-0.5)*20;
    var y = options.y || 1 + (Math.random()-0.5)*1;
    var z = options.z || (Math.random()-0.5)*20;

    var halfExtents = options.size || new CANNON.Vec3(1,0.5,1);

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

    var boxBody = new CANNON.Body({ mass: options.mass || 5 });
    boxBody.addShape(boxShape);

    var boxMesh = new THREE.Mesh( boxGeometry, woodMaterial );
    boxBody.position.set(x,y,z);
    boxMesh.position.set(x,y,z);

    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;

    return { body: boxBody, mesh: boxMesh };

}
module.exports.createBox = createBox;

// =========================================================================
// 
// Create player
//
// =========================================================================
function createPlayer( options ){
    options = options || {};

    var x = options.x || (Math.random()-0.5)*20;
    var y = options.y || 1 + (Math.random()-0.5)*1;
    var z = options.z || (Math.random()-0.5)*20;

    var halfExtents = options.size || new CANNON.Vec3(1,0.5,1);

    var boxShape = new CANNON.Box(halfExtents);
    var boxGeometry = new THREE.BoxGeometry(halfExtents.x*2,halfExtents.y*2,halfExtents.z*2);

    var woodTexture = THREE.ImageUtils.loadTexture( "/static/textures/wood.jpg" );
    woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
    woodTexture.repeat.set( 1, 1 );
    var woodMaterial = new THREE.MeshLambertMaterial( { 
        shading: THREE.FlatShading,
        color: 0xffffff, 
        map: woodTexture 
    });

    var boxBody = new CANNON.Body({ mass: options.mass || 5 });
    boxBody.addShape(boxShape);

    var boxMesh = new THREE.Mesh( boxGeometry, woodMaterial );
    boxBody.position.set(x,y,z);
    boxMesh.position.set(x,y,z);

    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;

    return { body: boxBody, mesh: boxMesh };
}
module.exports.createPlayer = createPlayer;
