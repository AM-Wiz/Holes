
import { GameTickEvent, GameWorld } from "./lib/game/game-world.js";

import { } from "./lib/game/game-map-gen.js";

import { RenderEvent, queueRender } from "./lib/game/game-render.js";

import { RawInputEvent } from "./lib/input/inputevent.js";

import { requestQuit } from "./lib/game/quit.js";

import { MakeBhvr } from "./lib/schedule/events.js";
import { requestEventPoll } from "./lib/schedule/loopevents.js";
import { I16V } from "./lib/math/vecmath.js";
import { Screen } from "./lib/screen/screen.js";


MakeBhvr({
    name: "OnQuitInput",
    func: (event, arg) => {
        if (arg !== '\u0003')
            return;

        console.log(`framerate was ${GameTickEvent.frameCounter.fps}`);

        requestQuit();
    },

    events: [RawInputEvent.instance],
});

const onInputBhvr = MakeBhvr({
    name: "OnInput",
    func: (event, arg) => {
        if (arg === 't')
            setImmediate(buildTrn);

        const cursor = GameWorld.camera.center;

        if (arg === '\x1b[A' || arg === '8')
            cursor[1] += 1;
        else if (arg === '\x1b[B' || arg === '2')
            cursor[1] -= 1;
        else if (arg === '\x1b[C' || arg === '6')
            cursor[0] += 1;
        else if (arg === '\x1b[D' || arg === '4')
            cursor[0] -= 1;
        
        else if (arg === '9')
            cursor[0] += 1, cursor[1] += 1;
        else if (arg === '3')
            cursor[0] += 1, cursor[1] -= 1;
        else if (arg === '1')
            cursor[0] -= 1, cursor[1] -= 1;
        else if (arg === '7')
            cursor[0] -= 1, cursor[1] += 1;

        else if (arg === '>' || arg === '+')
            cursor[2] += 1;
        else if (arg === '<' || arg === '-')
            cursor[2] -= 1;

        queueRender();
    },
    events: [RawInputEvent.instance],
});

queueRender();

/*
const playerSprite = new Sprite({
    color: get256Color(0.7, 0.5, 0.5),
    tileTable: [
        '╭╮',
        '╰╯',
    ]
});

const spWriter = new ScreenSpriteWriter({
    buffer: screenBuffer,
    zTestEnabled: false,
    zWriteEnabled: true,
});
*/