importScripts('lib/box2d.min.js');
var b2World = Box2D.Dynamics.b2World,
    b2Vec2 = Box2D.Common.Math.b2Vec2,
    b2Body = Box2D.Dynamics.b2Body,
    b2BodyDef = Box2D.Dynamics.b2BodyDef,
    b2FixtureDef = Box2D.Dynamics.b2FixtureDef,
    b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape,
    b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;

var cfg = {
    scale : 30, //pixels per meter
    gravity : 9.8, // m/s^2
    frameRate : 1/60, // Hz
    velocityIterations : 10,
    positionIterations : 10
};

var world = new b2World(new b2Vec2(0, cfg.gravity), true);
var bodymap = {};

var messageHandlers = {
    spawn : function(entities) {
        var bodyDef = new b2BodyDef,
            fixtureDef = new b2FixtureDef,
            vertices = [];

        fixtureDef.density = 1;
        fixtureDef.friction = 0;
        fixtureDef.restitution = 0.1;

        // for each entity, create a box2d representation (body and fixture), and add them to the world
        for(var e in entities) {
            var ent = entities[e];
            bodyDef.type = ent.dynamic ? b2Body.b2_dynamicBody : b2Body.b2_staticBody;
            bodyDef.position.x = ent.x / cfg.scale;
            bodyDef.position.y = ent.y / cfg.scale;

            var body = world.CreateBody(bodyDef);
            body.SetFixedRotation(true);
            body.SetUserData(e);
            bodymap[e] = body;

            // use passed-in data to construct the shape
            if(ent.vertices) {
                // entity is a polygon
                fixtureDef.shape = new b2PolygonShape;
                if(ent.composite) {
                    //entity is made up of multiple polygons (many fixtures on one body) 
                    for(var v in ent.vertices) {
                        createPolygonFixture(fixtureDef, ent.vertices[v]);
                        body.CreateFixture(fixtureDef);
                    }
                } else {
                    //entity is a single, convex polygon
                    createPolygonFixture(fixtureDef, ent.vertices)
                    body.CreateFixture(fixtureDef);
                }
            } else if(ent.radius) {
                // entity is a circle
                fixtureDef.shape = new b2CircleShape(ent.radius / cfg.scale);
                body.CreateFixture(fixtureDef);
            }
        }

    },
    step : function() {
        world.Step(cfg.frameRate, cfg.velocityIterations, cfg.positionIterations);
        world.DrawDebugData();
        world.ClearForces();

        // build message with results of physics simulation step
        var state = {};
        for(var body = world.GetBodyList(); body; body = body.m_next) {
            var id = body.GetUserData();
            if(id && body.GetType() !== b2Body.b2_staticBody && body.IsActive()) {
                var pos = body.GetPosition();
                state[id] = {x:pos.x*cfg.scale, y:pos.y*cfg.scale};
            }
        }
        return state;
    },
    velocity: function(message) {
        var body = bodymap[message.id];
        if(!body)
            throw "Could not find body " + message.id;
        var vel = body.GetLinearVelocity();
        if(message.x !== undefined)
            vel.x = message.x;
        if(message.y !== undefined)
            vel.y = message.y;
        body.SetAwake(true)
        body.SetLinearVelocity(vel);
    }
};

function createPolygonFixture(fixture, vertices) {
    var v = vertices.map(function(el) {
        return new b2Vec2(el[0] / cfg.scale, el[1] / cfg.scale);
    });
    fixture.shape.SetAsArray(v, v.length);
}

// web worker request/reply handling
self.onmessage = function(e) {
    var response = messageHandlers[e.data.command](e.data.message);
    if(response) {
        var message = {
            command:e.data.command,
            message:response
        };
        postMessage(message);
    }
}
