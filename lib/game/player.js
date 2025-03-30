import assert from "node:assert";
import { GameTickEvent, GameWorld } from "./game-world.js";
import { EntId } from "../entities/entity.js";
import { MakeBhvr } from "../schedule/events.js";
import { I16V } from "../math/vecmath.js";
import { screenBuffer } from "./game-screen.js";
import { EntSprite } from "../entities/render.js";
import { Sprite } from "../screen/sprite.js";
import { get256Color } from "../screen/color.js";
import { RawInputEvent } from "../input/inputevent.js";
import { queueRender } from "./game-render.js";


/**
 * @property {?EntId} activePlayer
 */
GameWorld['activePlayer'] = null;


const accumulateMovementInput = (arg) => {
    let [x, y, z] = [0, 0, 0];

    if (arg === '\x1b[A' || arg === '8')
        y += 1;
    else if (arg === '\x1b[B' || arg === '2')
        y -= 1;
    else if (arg === '\x1b[C' || arg === '6')
        x += 1;
    else if (arg === '\x1b[D' || arg === '4')
        x -= 1;
    
    else if (arg === '9')
        x += 1, y += 1;
    else if (arg === '3')
        x += 1, y -= 1;
    else if (arg === '1')
        x -= 1, y -= 1;
    else if (arg === '7')
        x -= 1, y += 1;

    else if (arg === '>' || arg === '+')
        z += 1;
    else if (arg === '<' || arg === '-')
        z -= 1;

    return [x, y, z];
}


const playerMovement = [0, 0];

const OnPlayerInputBhvr = MakeBhvr({
    name: "OnPlayerInput",
    func: function (event, arg) {
        const ents = GameWorld.entities;
        const ts = ents.transforms;

        if (GameWorld.activePlayer == null)
            return;

        const [x, y, z] = accumulateMovementInput(arg);

        if (x != 0 || y != 0) {
            let pos = ts.getPos(GameWorld.activePlayer, this.state.posScratch);
            pos[0] += x, pos[1] += y;
            ts.setPos(GameWorld.activePlayer, pos);
        }

        if (z != 0) {
            let height = ts.getHeight(GameWorld.activePlayer);
            height += z;
            ts.setHeight(GameWorld.activePlayer, height);
        }
    },
    state: {
        posScratch: new I16V([0, 0]),
    },
    events: [RawInputEvent.instance],
});



const PlayerWalkBhvr = MakeBhvr({
    name: "PlayerWalk",
    func: function (event, arg) {
        const ents = GameWorld.entities;
        const ts = ents.transforms;
        
        if (GameWorld.activePlayer == null)
            return;

        const pos = ts.getPos(GameWorld.activePlayer);
        const h = ts.getHeight(GameWorld.activePlayer);
        
        const mh = GameWorld.map.getHeight(pos[0], pos[1]);
        if (mh == null)
            return;

        if (h > mh) {
            let distToFall = h - mh;
            let fallDist = this.state.fallSpeed * arg.deltaTime;

            if (fallDist > distToFall) // TODO round up to nearest multiple of coordinate step
                fallDist = distToFall;

            ts.setHeight(GameWorld.activePlayer, h - fallDist);
        } else if (h < mh) {
            ts.setHeight(GameWorld.activePlayer, mh);
        }
    },
    state: {
        fallSpeed: 10,
        fallAmount: 0,
    },
    events: [GameTickEvent],
    deps: [OnPlayerInputBhvr],
});


const PlayerCameraTrackBhvr = MakeBhvr({
    name: "PlayerTrackCamera",
    func: function (event, arg) {
        const ents = GameWorld.entities;
        const ts = ents.transforms;

        if (GameWorld.activePlayer == null)
            return;

        const pos = ts.getPos(GameWorld.activePlayer, this.state.posScratch);
        const height = ts.getHeight(GameWorld.activePlayer);

        const targetHeight = Math.trunc(height + GameWorld.camera.viewLength / 2);

        pos[0] -= screenBuffer.dim[0] / 2;
        pos[1] -= screenBuffer.dim[1] / 2;

        if (GameWorld.camera.center[0] == pos[0] && GameWorld.camera.center[1] == pos[1] && GameWorld.camera.height == targetHeight)
            return;

        GameWorld.camera.center[0] = pos[0];
        GameWorld.camera.center[1] = pos[1];
        GameWorld.camera.height = targetHeight; // TODO

        queueRender();
    },
    state: {
        posScratch: new I16V([0, 0]),
    },
    events: [GameTickEvent],
    deps: [PlayerWalkBhvr],
});


const playerSprite = new EntSprite({
    sprite: new Sprite({
        color: get256Color(0.8, 0.7, 0.3),
        tile: '☻',
    }),
    height: 2,
});



export const spawnPlayer = (options) => {
    assert.ok(GameWorld.activePlayer == null);

    const ents = GameWorld.entities;

    GameWorld.activePlayer = ents.newEntity();

    ents.renderables.setSprite(GameWorld.activePlayer, playerSprite);

    if (options?.pos != null) {
        ents.transforms.setPos(GameWorld.activePlayer, options.pos);
    }

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