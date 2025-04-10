import assert from "node:assert";
import { GameWorld } from "./game-world.js";
import { GameTickEvent } from "./game-tick.js";
import { EntId } from "../entities/entity.js";
import { BhvrDep, MakeBhvr } from "../schedule/events.js";
import { F32V, I16V } from "../math/vecmath.js";
import { EntSprite } from "../entities/render.js";
import { Sprite } from "../screen/sprite.js";
import { get256Color } from "../screen/color.js";
import { RawInputEvent } from "../input/inputevent.js";
import { EntGravity, GravityConfig } from "./gravity.js";
import { CameraTrackBhvr } from "./camera-track.js";
import { EntHeading, EntMovement, MoveBhvr, MovementConfig } from "./movement.js";
import { PlayAction, PlayMode } from "./play-action.js";


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
        if (arg === '*') {
            if (PlayMode.mode == PlayMode.PlayMode)
                PlayMode.takeTurns();
            else
                PlayMode.play();
        } else if (arg === '/') {
            if (PlayMode.mode == PlayMode.PauseMode)
                PlayMode.takeTurns();
            else
                PlayMode.pause();
        } else if (arg === '.') {
            PlayMode.pause();
            GameTickEvent.requestTick();
        }

        accumulateMovementInput(arg, playerInput);

        if (!playerInput.isZero)
            PlayerWalkAction.ensureActive();
    },
    events: [RawInputEvent.instance],
});


const PlayerWalkAction = new class PlayerWalkAction extends PlayAction
{
    onStart() {
        PlayerWalkBhvr.enabled = true;
    }

    onEnd() {
        PlayerWalkBhvr.enabled = false;
    }
}


const PlayerWalkBhvr = MakeBhvr({
    name: "on-player-walk",
    func: function (event, arg) {
        const ents = GameWorld.entities;
        const ts = ents.transforms;
        const hd = ents.getAspect(EntHeading);

        if (!PlayerWalkAction.isActive)
            return;

        if (GameWorld.activePlayer == null) {
            PlayerWalkAction.cancel();
            return;
        }

        const {pendingTarget: tPos, pendingDirection: tDir} = this.state;

        if (!playerInput.isZero) {
            ts.getTile(GameWorld.activePlayer, tPos);
    
            tPos.add(playerInput, tPos);

            tDir.copyFrom(playerInput);
            tDir.normalize(tDir);

            hd.setTarget(GameWorld.activePlayer, tPos);
            
            playerInput.fill(0);

            return;
        }

        const curPos = ts.getTile(GameWorld.activePlayer, this.state.posScratch);
        const curDiff = tPos.sub(curPos, this.state.difScratch);

        if (curPos.equals(tPos) || tDir.projNorm(curDiff) <= 0.1) {
            PlayerWalkAction.finish();

            return;
        }
    },
    state: {
        posScratch: new I16V([0, 0]),
        difScratch: new I16V([0, 0]),
        
        pendingDirection: new F32V([0, 0]),
        pendingTarget: new F32V([0, 0]),
    },
    events: [GameTickEvent],
    deps: [OnPlayerInputBhvr, new BhvrDep(MoveBhvr, BhvrDep.before)],
    enabled: false,
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
        ents.transforms.setTile(GameWorld.activePlayer, options.pos);
    }

    CameraTrackBhvr.target = GameWorld.activePlayer;

    if (options?.height != null) {
        ents.transforms.setHeight(GameWorld.activePlayer, options.height);
    } else if (options?.placeOnGround != null) {
        const pos = ents.transforms.getTile(GameWorld.activePlayer);

        const h = GameWorld.map.getHeight(pos[0], pos[1]);

        if (h != null)
            ents.transforms.setHeight(GameWorld.activePlayer, h);
    }

    return GameWorld.activePlayer;
}