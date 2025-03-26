
import { GameTickEvent, GameWorld } from "./lib/game/game-world.js";

import { } from "./lib/game/game-map-gen.js";

import { RenderEvent, queueRender } from "./lib/game/game-render.js";

import { RawInputEvent } from "./lib/input/inputevent.js";

import { requestQuit } from "./lib/game/quit.js";

import { MakeBhvr } from "./lib/schedule/events.js";
import { requestEventPoll } from "./lib/schedule/loopevents.js";
import { I16V } from "./lib/math/vecmath.js";
import { Screen } from "./lib/screen/screen.js";
import { spawnPlayer } from "./lib/game/player.js";


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
    name: "ScreenRefresh",
    func: function (event, arg) {
        queueRender();
    },
    events: [RawInputEvent.instance],
});

spawnPlayer();

queueRender();
