import screen from "./lib/screen/screen.js";
import { Color } from "./lib/screen/color.js";

import { Event, Behavior, MakeBhvr } from "./lib/schedule/events.js";
import { LoopEvent, requestEventPoll } from "./lib/schedule/loopevents.js";

import {RawInputEvent} from "./lib/input/inputevent.js";

import { requestQuit } from "./lib/game/quit.js"

import { TrnMap, TrnMapChunk } from "./lib/game/map/trnmap.js"
import { renderMap } from "./lib/game/map/render-map.js";

import { SmoothFrameCounter } from "./lib/utility/smooth-frame-counter.js";

import { Camera } from "./lib/game/camera.js";
import { randomHeight, TrnNoiseChannel } from "./lib/game/map/trn-gen.js";


/*
{
    const {F32V} = await import("./math/vecmath.js");
    const vres = F32V.from([0, 1, 2]).add(5);
    console.log(vres);
}
*/

/*
{
    const str = "abcd\0efgh";
    const bufTest = new Uint8Array(str.length);

    for (let i = 0; i < str.length; i++) {
        bufTest[i] = str.charCodeAt(i);
    }

    process.stdout.write(new DataView(bufTest.buffer, 4), 'ascii');
}
*/

const mainLoopEvent = new LoopEvent();

mainLoopEvent.recurring = 0.01;
mainLoopEvent.enabled = true;


const flashColors = [
    Color.darkRed,
    Color.red,
    Color.darkBlue,
    Color.blue,
];

let loopIdx = 0;

const sWriter = new screen.ScreenWriter();

const smoothFrames = new SmoothFrameCounter();

const camera = new Camera();

const trn = new TrnMap();
trn.dim = [5, 5];

const buildTrn = () => {
    const channel = new TrnNoiseChannel({
        scale: 1 / 20
    });

    randomHeight(trn, channel);
}

buildTrn();

const mainBhvr = MakeBhvr({
    name: "Main",
    func: (event, arg) => {
        loopIdx++;
        
        screen.refreshScreen();

        screen.clearScreenZBuffer();

        renderMap(trn, camera);

        /*
        sWriter.symbol = '1';
        
        for (let rIdx = 0, rEnd = sWriter.size[0]; rIdx < rEnd; rIdx++) {
            const colorIdx = loopIdx + rIdx;
            sWriter.color = flashColors[Math.trunc(colorIdx % flashColors.length)];
            sWriter.writeRow(rIdx);
        }
        */

        screen.printScreen();

        smoothFrames.add(arg.deltaTime);
    },
    events: [mainLoopEvent],
});


const onInputBhvr = MakeBhvr({
    name: "OnInput",
    func: (event, arg) => {
        if (arg === 't')
            setImmediate(buildTrn);
    },
    events: [RawInputEvent.instance],
});


MakeBhvr({
    name: "OnQuitInput",
    func: (event, arg) => {
        if (arg === '\u0003')
            requestQuit();
    },

    events: [RawInputEvent.instance],
});


requestEventPoll();