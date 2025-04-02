import assert from "node:assert";
import { GameTickEvent, GameWorld } from "./game-world.js";
import { EntId } from "../entities/entity.js";
import { BhvrDep, MakeBhvr } from "../schedule/events.js";
import { I16V } from "../math/vecmath.js";
import { screenBuffer } from "./game-screen.js";
import { EntSprite } from "../entities/render.js";
import { Sprite } from "../screen/sprite.js";
import { get256Color } from "../screen/color.js";
import { RawInputEvent } from "../input/inputevent.js";
import { queueRender } from "./game-render.js";
import { EntGravity, GravityConfig } from "./gravity.js";
import { CameraTrackBhvr } from "./camera-track.js";
import { EntHeading, EntMovement, MoveBhvr, MovementConfig } from "./movement.js";


/**
 * @property {?EntId} activePlayer
 */
GameWorld['activePlayer'] = null;




const accumulateMovementInput = (arg, inputs) => {
    if (arg === '\x1b[A' || arg === '8')
        inputs[1] = +1;
    else if (arg === '\x1b[B' || arg === '2')
        inputs[1] = -1;
    else if (arg === '\x1b[C' || arg === '6')
        inputs[0] = +1;
    else if (arg === '\x1b[D' || arg === '4')
        inputs[0] = -1;
    
    else if (arg === '9')
        inputs[0] = +1, inputs[1] = +1;
    else if (arg === '3')
        inputs[0] = +1, inputs[1] = -1;
    else if (arg === '1')
        inputs[0] = -1, inputs[1] = -1;
    else if (arg === '7')
        inputs[0] = -1, inputs[1] = +1;

    else if (arg === '>' || arg === '+')
        inputs[2] = +1;
    else if (arg === '<' || arg === '-')
        inputs[2] = -1;
    
    if (arg === ' ' || arg === '5')
        inputs[0] = 0, inputs[1] = 0, inputs[2] = 0;

    return inputs;
}


const playerInput = new I16V(3);

const OnPlayerInputBhvr = MakeBhvr({
    name: "on-player-input",
    func: function (event, arg) {
        accumulateMovementInput(arg, playerInput);
    },
    events: [RawInputEvent.instance],
});



const PlayerWalkBhvr = MakeBhvr({
    name: "on-player-walk",
    func: function (event, arg) {
        const ents = GameWorld.entities;
        const ts = ents.transforms;
        const hd = ents.getAspect(EntHeading);

        if (GameWorld.activePlayer == null)
            return;

        hd.setMotion(GameWorld.activePlayer, playerInput);
        
        /*
        const [x, y, z] = playerInput;
        
        if (x != 0 || y != 0) {
            let pos = ts.getPos(GameWorld.activePlayer, this.state.posScratch);
            pos.add(playerInput, pos);
            ts.setPos(GameWorld.activePlayer, pos);
        }

        if (z != 0) {
            let height = ts.getHeight(GameWorld.activePlayer);
            height += playerInput[2];
            ts.setHeight(GameWorld.activePlayer, height);
        }
        */

        playerInput.fill(0);
    },
    state: {
        posScratch: new I16V([0, 0]),
    },
    events: [GameTickEvent],
    deps: [OnPlayerInputBhvr, new BhvrDep(MoveBhvr, BhvrDep.before)],
});

const playerSprite = new EntSprite({
    sprite: new Sprite({
        color: get256Color(0.8, 0.7, 0.3),
        tile: '☻',
    }),
    height: 2,
});


const playerGravity = new GravityConfig({
    fall: true,
    rise: true,
    riseLimit: null,
    riseSpeed: 1,
});

const playerMovement = new MovementConfig({
    type: MovementConfig.Walk,
    maxSpeed: 10,
    maxSteep: 3,
    walkSteepMult: 0.3,
});

export const spawnPlayer = (options) => {
    assert.ok(GameWorld.activePlayer == null);

    const ents = GameWorld.entities;

    GameWorld.activePlayer = ents.newEntity();

    ents.getAspect(EntGravity).set(GameWorld.activePlayer, playerGravity);

    ents.getAspect(EntMovement).set(GameWorld.activePlayer, playerMovement);

    ents.renderables.setSprite(GameWorld.activePlayer, playerSprite);

    if (options?.pos != null) {
        ents.transforms.setPos(GameWorld.activePlayer, options.pos);
    }

    CameraTrackBhvr.target = GameWorld.activePlayer;

    if (options?.height != null) {
        ents.transforms.setHeight(GameWorld.activePlayer, options.height);
    } else if (options?.placeOnGround != null) {
        const pos = ents.transforms.getPos(GameWorld.activePlayer);

        const h = GameWorld.map.getHeight(pos[0], pos[1]);

        if (h != null)
            ents.transforms.setHeight(GameWorld.activePlayer, h);
    }

    return GameWorld.activePlayer;
}