/*
 * Bunny Soccer!
 * Template taken from: Assignment 1 UBC CPSC 314, Vjan2019
 */

// CHECK WEBGL VERSION
if ( WEBGL.isWebGL2Available() === false ) {
  document.body.appendChild( WEBGL.getWebGL2ErrorMessage() );
}

// SETUP RENDERER & SCENE
var container = document.createElement( 'div' );
document.body.appendChild( container );

var canvas = document.createElement("canvas");
var context = canvas.getContext( 'webgl2' );
var renderer = new THREE.WebGLRenderer( { canvas: canvas, context: context } );
renderer.setClearColor(0XAFEEEE); // green background colour
container.appendChild( renderer.domElement );
var scene = new THREE.Scene();

// SETUP CAMERA
var camera = new THREE.PerspectiveCamera(30,1,0.1,1000); // view angle, aspect ratio, near, far
camera.position.set(0,70,100);
camera.lookAt(scene.position);
scene.add(camera);

// SETUP ORBIT CONTROLS OF THE CAMERA
var controls = new THREE.OrbitControls(camera);
controls.damping = 0.2;
controls.autoRotate = false;

// ADAPT TO WINDOW RESIZE
function resize() {
  renderer.setSize(window.innerWidth,window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
}

// EVENT LISTENER RESIZE
window.addEventListener('resize',resize);
resize();

//SCROLLBAR FUNCTION DISABLE
window.onscroll = function () {
     window.scrollTo(0,0);
   }

// WORLD COORDINATE FRAME: other objects are defined with respect to it
var worldFrame = new THREE.AxesHelper(5) ;
scene.add(worldFrame);

// FLOOR WITH PATTERN
var floorTexture = new THREE.TextureLoader().load('images/floor.jpg');
floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(2, 2);

var floorMaterial = new THREE.MeshBasicMaterial({ map: floorTexture, side: THREE.DoubleSide });
var floorGeometry = new THREE.PlaneBufferGeometry(100, 60);  //width and length, must change fall dist as well if this is changed
var floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.position.y = -0.1;
floor.rotation.x = Math.PI / 2;
scene.add(floor);
floor.parent = worldFrame;

//make Goals
var goalMaterial = new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
var goalGeometry = new THREE.PlaneBufferGeometry(10, 30);
var goalA = new THREE.Mesh(goalGeometry, goalMaterial);
goalA.position.x = -50.0;
goalA.position.y = 0.3;
goalA.rotation.x = Math.PI / 2;
scene.add(goalA);
goalA.parent = worldFrame;

var goalB = new THREE.Mesh(goalGeometry, goalMaterial);
goalB.position.x = 50.0;
goalB.position.y = 0.3;
goalB.rotation.x = Math.PI / 2;
scene.add(goalB);
goalB.parent = worldFrame;

scoreBoard = document.getElementById( 'scoreBoard');
var scoreA = 0;
var scoreB = 0;

// UNIFORMS
var bunnyBPosition = {type: 'v3', value: new THREE.Vector3(25.0,-0.3,0.0)};
var ballPosition = {type: 'v3', value: new THREE.Vector3(0.0,2.0,0.0)};
var explode = {type: 'int', value: 0};

// MATERIALS: specifying uniforms and shaders
var bunnyBMaterial = new THREE.ShaderMaterial({
  uniforms: { bunnyBPosition: bunnyBPosition,
              explode: explode,
  }
});

var ballMaterial = new THREE.ShaderMaterial({
  uniforms: { ballPosition: ballPosition,
  }
});

// LOAD SHADERS
var shaderFiles = [
  'glsl/bunnyB.vs.glsl',
  'glsl/bunnyB.fs.glsl',
  'glsl/ball.vs.glsl',
  'glsl/ball.fs.glsl'
];

new THREE.SourceLoader().load(shaderFiles, function(shaders) {
  bunnyBMaterial.vertexShader = shaders['glsl/bunnyB.vs.glsl'];
  bunnyBMaterial.fragmentShader = shaders['glsl/bunnyB.fs.glsl'];

  ballMaterial.vertexShader = shaders['glsl/ball.vs.glsl'];
  ballMaterial.fragmentShader = shaders['glsl/ball.fs.glsl'];
})

var ctx = renderer.context;
ctx.getShaderInfoLog = function () { return '' };   // stops shader warnings, seen in some browsers

// LOAD BUNNY
function loadOBJ(file, material, scale, xOff, yOff, zOff, xRot, yRot, zRot) {
  var manager = new THREE.LoadingManager();
          manager.onProgress = function (item, loaded, total) {
    console.log( item, loaded, total );
  };

  var onProgress = function (xhr) {
    if ( xhr.lengthComputable ) {
      var percentComplete = xhr.loaded / xhr.total * 100;
      console.log( Math.round(percentComplete, 2) + '% downloaded' );
    }
  };

  var onError = function (xhr) {
  };

  var loader = new THREE.OBJLoader( manager );
  loader.load(file, function(object) {
    object.traverse(function(child) {
      if (child instanceof THREE.Mesh) {
        child.material = material;
      }
    });

    object.position.set(xOff,yOff,zOff);
    object.rotation.x= xRot;
    object.rotation.y = yRot;
    object.rotation.z = zRot;
    object.scale.set(scale,scale,scale);
    object.parent = worldFrame;
    scene.add(object);

  }, onProgress, onError);
}

loadOBJ('obj/bunny.obj', bunnyBMaterial, 20, 0, 0, 0, 0,0,0);

// CREATE BALL
var ballGeometry = new THREE.SphereGeometry(2, 30, 30);
var ball = new THREE.Mesh(ballGeometry, ballMaterial);
ball.position.set(0.0, 0.0, 0.0);
ball.scale.set(1,1,1);
ball.parent = worldFrame;
scene.add(ball);

var jump = 0;
var resetjump = 1;
var velocity = 0;
var fall = 0;
var lock = 0;

var ballVelocity = 0.0;
var bunnyBPrevPos = new THREE.Vector3(bunnyBPosition.value.x,bunnyBPosition.value.y,bunnyBPosition.value.z);
var dist;
//var timer1 = 0.0;

var pxV = 0.0;
var nxV = 0.0;
var pzV = 0.0;
var nzV = 0.0;

var goal = 0;

// LISTEN TO KEYBOARD
var keyboard = new THREEx.KeyboardState();
function checkKeyboard() {
  bunnyBPrevPos.x = bunnyBPosition.value.x;
  bunnyBPrevPos.y = bunnyBPosition.value.y;
  bunnyBPrevPos.z = bunnyBPosition.value.z;
  if (keyboard.pressed("W") && lock == 0)
    bunnyBPosition.value.z -= 0.4;
  else if (keyboard.pressed("S") && lock == 0)
    bunnyBPosition.value.z += 0.4;

  if (keyboard.pressed("A") && lock == 0)
    bunnyBPosition.value.x -= 0.4;
  else if (keyboard.pressed("D") && lock == 0)
    bunnyBPosition.value.x += 0.3;
  
  if (keyboard.pressed("space") ) {
    //ballVelocity = 5.0;
    kick();
  }
  finishKick();
/*
  if (keyboard.pressed("Z")) {
    if (resetjump == 1) {
      velocity = 1.0;
      jump = 1;
      resetjump = 0;
    }
  }
  */
  if (jump == 1){
    velocity = (velocity * 10 - 1) /10;
    bunnyBPosition.value.y += velocity;
    if (velocity == 0.0)
      jump = 0;
  }
  if (resetjump == 0 && jump == 0 && fall == 0){
    bunnyBPosition.value.y -= velocity;
    velocity = (velocity * 10 + 1) / 10;
    if (velocity == 1.0)
      resetjump = 1;
  }

  if (resetjump == 0 && jump == 0 && fall == 1) {
    bunnyBPosition.value.y -= velocity;
    velocity = (velocity * 10 + 1) / 10;
    if (bunnyBPosition.value.y <= 0.0) {
      resetjump = 1;
      fall = 0;
      bunnyBPosition.value.y = 0.0;
      velocity = 0.0;
    }
  }

  checkGoal();
  checkDistance();
  bunnyBMaterial.needsUpdate = true; // Tells three.js that some uniforms might have changed
  ballMaterial.needsUpdate = true;
}

function checkDistance() {
  // Fall off platform
  if (Math.abs(bunnyBPosition.value.x) > 50.0 || Math.abs(bunnyBPosition.value.z) > 30.0) {
    fall = 1;
  }

  if (fall == 1 && jump == 0) {
    bunnyBPosition.value.y -= velocity;
    velocity = (velocity * 10 + 1) / 10;
    if (bunnyBPosition.value.y <= -20.0) {
      bunnyBPosition.value.x = 25.0;
      bunnyBPosition.value.y = 8.0;
      bunnyBPosition.value.z = 0.0;
      resetjump = 0;
      jump = 0;
    }
  }

  // check ball contact
  dist = (bunnyBPosition.value).distanceTo(ballPosition.value);
  var dx = 0.0;
  var dz = 0.0;
  if (dist < 4.0) {
    if (Math.abs(bunnyBPosition.value.x) > Math.abs(ballPosition.value.x)) {
      dx = (bunnyBPrevPos.x * 10 - ballPosition.value.x) /10;
      ballPosition.value.x = (ballPosition.value.x * 10 - dx) / 10;
    }
    if (Math.abs(bunnyBPosition.value.x) < Math.abs(ballPosition.value.x)) {
      dx = (ballPosition.value.x * 10 + bunnyBPrevPos.x ) /10;
      ballPosition.value.x = (ballPosition.value.x * 10 + dx) / 10;
    }
    if (Math.abs(bunnyBPosition.value.z) > Math.abs(ballPosition.value.z)) {
      dz = (bunnyBPrevPos.z * 10 - ballPosition.value.z) /10;
      ballPosition.value.z = (ballPosition.value.z * 10 - dz) / 10;
    }
    if (Math.abs(bunnyBPosition.value.z) < Math.abs(ballPosition.value.z)) {
      dz = (ballPosition.value.z * 10 + bunnyBPrevPos.z ) /10;
      ballPosition.value.z = (ballPosition.value.z * 10 + dz) / 10;
    }
  }

  //check ball fall
  if (Math.abs(ballPosition.value.x) > 50.0 || Math.abs(ballPosition.value.z) > 30.0) {
    ballPosition.value.y -= ballVelocity;
    ballVelocity = (ballVelocity * 10 + 1) / 10;
    if (ballPosition.value.y <= -20.0) {
      ballPosition.value.x = 0.0;
      ballPosition.value.y = 2.0;
      ballPosition.value.z = 0.0;
      ballVelocity = 0.0;
      goal = 0;
    }
  }
}

function kick() {
  dist = (bunnyBPosition.value).distanceTo(ballPosition.value);
  if (dist < 5.0) {
    if (Math.abs(bunnyBPosition.value.x) > Math.abs(ballPosition.value.x)) {
      if (((bunnyBPrevPos.x * 10 - ballPosition.value.x) /10) > 0.0) {
        nxV = 5.0;
      }
      else {
        nxV = -5.0;
      }
      ballPosition.value.x = ( (ballPosition.value.x * 10 - nxV) / 10 );
    }
    if (Math.abs(bunnyBPosition.value.x) < Math.abs(ballPosition.value.x)) {
      if (((ballPosition.value.x * 10 + bunnyBPrevPos.x ) /10) > 0.0) {
        pxV = 5.0;
      }
      else {
        pxV = -5.0;
      }
      ballPosition.value.x = ( (ballPosition.value.x * 10 + pxV) / 10 );
    }
    if (Math.abs(bunnyBPosition.value.z) > Math.abs(ballPosition.value.z)) {
      if (((bunnyBPrevPos.z * 10 - ballPosition.value.z) /10) > 0.0) {
        nzV = 5.0;
      }
      else {
        nzV = -5.0;
      }
      ballPosition.value.z = ( (ballPosition.value.z * 10 - nzV) / 10 );
    }
    if (Math.abs(bunnyBPosition.value.z) < Math.abs(ballPosition.value.z)) {
      if (((ballPosition.value.z * 10 + bunnyBPrevPos.z ) /10) > 0.0) {
        pzV = 5.0;
      }
      else {
        pzV = -5.0;
      }
      ballPosition.value.z = ( (ballPosition.value.z * 10 + pzV) / 10 );
    }
  }
}

function finishKick() {
  if (nxV != 0.0) {
    if (nxV > 0.0) {
      nxV = (nxV * 10 - 1) / 10;
    }
    else {
      nxV = (nxV * 10 + 1) / 10;
    }
    ballPosition.value.x = ( (ballPosition.value.x * 10 - nxV) / 10 );
  }
  if (pxV != 0.0) {
    if (pxV > 0.0) {
      pxV = (pxV * 10 - 1) / 10;
    }
    else {
      pxV = (pxV * 10 + 1) / 10;
    }
    ballPosition.value.x = ( (ballPosition.value.x * 10 + pxV) / 10 );
  }
  if (nzV != 0.0) {
    if (nzV > 0.0) {
      nzV = (nzV * 10 - 1) / 10;
    }
    else {
      nzV = (nzV * 10 + 1) / 10;
    }
    ballPosition.value.z = ( (ballPosition.value.z * 10 - nzV) / 10 );
  }
  if (pzV != 0.0) {
    if (pzV > 0.0) {
      pzV = (pzV * 10 - 1) / 10;
    }
    else {
      pzV = (pzV * 10 + 1) / 10;
    }
    ballPosition.value.z = ( (ballPosition.value.z * 10 + pzV) / 10 );
  }
}

function checkGoal() {
  if (goal != 1) {
    if (ballPosition.value.x < -50.0 && Math.abs(ballPosition.value.z) < 15.0 ) {
      scoreB++;
      goal = 1;
    }
    if (ballPosition.value.x > 50.0 && Math.abs(ballPosition.value.z) < 15.0 ) {
      scoreA++;
      goal = 1;
    }
  updateScoreBoard();
  }
 
}

function updateScoreBoard(){
  scoreBoard.innerHTML = 'Player 1: ' + scoreA + ' Player 2: ' + scoreB;
}

// SETUP UPDATE CALL-BACK
function update() {
  checkKeyboard();
  requestAnimationFrame(update);
  renderer.render(scene, camera);
}

update();

