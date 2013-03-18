SLIME = {};
SLIME.Physics = {};
SLIME.Input = {};
SLIME.Graphics = {};
SLIME.World = {};

window.addEventListener("load", function(e) {
    SLIME.Input.init();
    SLIME.World.init();
    SLIME.Physics.init();
    SLIME.Graphics.init();

    SLIME.GameLoop();
}, false);

SLIME.GameLoop = function() {
    (function step() {
        SLIME.Physics.step();
        SLIME.Graphics.update();
        requestAnimationFrame(step);
    })();
};

SLIME.Physics = {
    init: function() {
        var physics = new Worker('scripts/physics-webworker.js');
        physics.onmessage = function(e) {
            switch(e.data.command) {
                case "step":
                    var newState = e.data.message;
                    _.extend(SLIME.World.snapshot, newState);
                    break;
            }
        };
        SLIME.Physics.world = physics;
        SLIME.Physics.world.postMessage({command: "spawn", message : SLIME.World.snapshot });
    },
    step: function() {
        SLIME.Physics.world.postMessage({command: "step"});
    },
    setVelocity: function(target, velocity) {
        velocity.id = target;
        SLIME.Physics.world.postMessage({command: "velocity", message: velocity});
    }
};

SLIME.World.init = function() {
    SLIME.World.WORLD_HEIGHT = 500;
    SLIME.World.WORLD_WIDTH = 800;
    var WORLD_WIDTH = 800,
        WORLD_HEIGHT = 500,
        pi = Math.PI,
        cos = Math.cos,
        sin = Math.sin;

    SLIME.World.snapshot = {
        world_top: { x: 0, y: 0, 
            vertices: [[0,0],[0,-1],[WORLD_WIDTH,-1],[WORLD_WIDTH,0]]
        },
        world_bottom: { x: 0, y: WORLD_HEIGHT, 
            vertices: [[0,0],[0,-1],[WORLD_WIDTH,-1],[WORLD_WIDTH,0]]
        },
        world_left: { x: 0, y: 0, 
            vertices: [[0,0],[1,0],[1,WORLD_HEIGHT],[0,WORLD_HEIGHT]]
        },
        world_right: { x: WORLD_WIDTH, y: 0, 
            vertices: [[0,0],[1,0],[1,WORLD_HEIGHT],[0,WORLD_HEIGHT]]
        },
        net: { x: WORLD_WIDTH / 2 - 10, y: WORLD_HEIGHT - 25, 
            vertices: [[0,0],[0,-25],[20,-25],[20,0]]
        },
        ball: { x: WORLD_WIDTH / 2 - 10, y: WORLD_HEIGHT / 2, dynamic: true,
            radius: 10
        },
        player_slime: { x: WORLD_WIDTH * 1/4, y: WORLD_HEIGHT - 25, dynamic: true, composite: true,
            vertices:[
                [[0,0],[0,-30],[30*cos(pi*19/12), 30*sin(pi*19/12)],[30*cos(pi*20/12), 30*sin(pi*20/12)],[30*cos(pi*21/12), 30*sin(pi*21/12)],[30*cos(pi*22/12), 30*sin(pi*22/12)],[30*cos(pi*23/12), 30*sin(pi*23/12)],[30, 0]],
                [[0,0],[-30,0],[30*cos(pi*13/12), 30*sin(pi*13/12)],[30*cos(pi*14/12), 30*sin(pi*14/12)],[30*cos(pi*15/12), 30*sin(pi*15/12)],[30*cos(pi*16/12), 30*sin(pi*16/12)],[30*cos(pi*17/12), 30*sin(pi*17/12)],[0, -30]]
            ]
        },
        computer_slime: { x: WORLD_WIDTH * 3/4, y: WORLD_HEIGHT - 25, dynamic: true, composite: true,
            vertices:[
                [[0,0],[0,-30],[30*cos(pi*19/12), 30*sin(pi*19/12)],[30*cos(pi*20/12), 30*sin(pi*20/12)],[30*cos(pi*21/12), 30*sin(pi*21/12)],[30*cos(pi*22/12), 30*sin(pi*22/12)],[30*cos(pi*23/12), 30*sin(pi*23/12)],[30, 0]],
                [[0,0],[-30,0],[30*cos(pi*13/12), 30*sin(pi*13/12)],[30*cos(pi*14/12), 30*sin(pi*14/12)],[30*cos(pi*15/12), 30*sin(pi*15/12)],[30*cos(pi*16/12), 30*sin(pi*16/12)],[30*cos(pi*17/12), 30*sin(pi*17/12)],[0, -30]]
            ]
        }
    };
};

SLIME.Input.init = function() {
    var key = { LEFT : 37, UP : 38, RIGHT : 39 };
    var active = {}

    document.addEventListener("keydown", function(e) {
        active[e.keyCode] = true;

        var velocity = {};
        if(e.keyCode == key.UP) velocity.y = -12; // jump
        if(e.keyCode == key.LEFT) velocity.x = -8; // move left
        if(e.keyCode == key.RIGHT) velocity.x = 8; // move right
        
        if(velocity.x || velocity.y)
            SLIME.Physics.setVelocity("player_slime", velocity);

    }, false);

    document.addEventListener("keyup", function(e) {
        // stop x-axis movement
        delete active[e.keyCode];
        if(!(active[key.LEFT] || active[key.RIGHT]))
            SLIME.Physics.setVelocity("player_slime", {x:0});
    }, false);
};

SLIME.Graphics.init = function() {
    // construct initial scene
    var ball = SLIME.World.snapshot.ball;
    var player = SLIME.World.snapshot.player_slime;
    var computer = SLIME.World.snapshot.computer_slime;

    var camera = SLIME.Graphics.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 1, 10000);
    camera.position.z = 1000;
    var scene = SLIME.Graphics.scene = new THREE.Scene();

    var ball = new THREE.SphereGeometry( 40, 32, 16);
    var ball_material = new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true });
    var ball_mesh = SLIME.Graphics.ball_mesh = new THREE.Mesh(ball, ball_material);
    scene.add(ball_mesh);

    var dome = new THREE.SphereGeometry( 40, 32, 16, 0, 2 * Math.PI, 0, Math.PI / 2 ); 
    var material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    var player_mesh = SLIME.Graphics.player_mesh = new THREE.Mesh(dome, material);
    scene.add(player_mesh);
    var computer_mesh = SLIME.Graphics.computer_mesh = new THREE.Mesh(dome, material);
    scene.add(computer_mesh);

    var renderer = SLIME.Graphics.renderer = new THREE.CanvasRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

};
SLIME.Graphics.update = function() {
    // move our dynamic objects
    var ball = SLIME.World.snapshot.ball,
        player = SLIME.World.snapshot.player_slime,
        computer = SLIME.World.snapshot.computer_slime;

    var renderer = SLIME.Graphics.renderer,
        scene = SLIME.Graphics.scene,
        camera = SLIME.Graphics.camera;

    var player_mesh = SLIME.Graphics.player_mesh,
        computer_mesh = SLIME.Graphics.computer_mesh
        ball_mesh = SLIME.Graphics.ball_mesh;

    player_mesh.position.x = player.x;
    player_mesh.position.y = -player.y;
    computer_mesh.position.x = computer.x;
    computer_mesh.position.y = -computer.y;
    ball_mesh.position.x = ball.x;
    ball_mesh.position.y = -ball.y;

    renderer.render(scene, camera);
};
