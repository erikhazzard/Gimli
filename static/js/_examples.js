

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
