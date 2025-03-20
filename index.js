import screen from "./lib/screen/screen.js";
import { CColor, get256Color } from "./lib/screen/color.js";

import { Event, Behavior, MakeBhvr } from "./lib/schedule/events.js";
import { LoopEvent, requestEventPoll } from "./lib/schedule/loopevents.js";

import {RawInputEvent} from "./lib/input/inputevent.js";

import { requestQuit } from "./lib/game/quit.js"

import { TrnMap, TrnMapChunk } from "./lib/game/map/trnmap.js"
import { renderMap } from "./lib/game/map/render-map.js";

import { SmoothFrameCounter } from "./lib/utility/smooth-frame-counter.js";

import { Camera } from "./lib/game/camera.js";
import { fillTiles, randomSeed, randomSplatTiles, TrnCombineChannel, TrnMapZChannel, TrnNoiseChannel } from "./lib/game/map/trn-gen.js";
import { I16V } from "./lib/math/vecmath.js";
import { TrnPalette, TrnTile } from "./lib/game/map/trn-tile.js";


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
    CColor.red,
    CColor.redBright,
    CColor.blue,
    CColor.blueBright,
];

let loopIdx = 0;

const sWriter = new screen.ScreenWriter();

const smoothFrames = new SmoothFrameCounter();

const camera = new Camera({
    viewTop: 5,
    viewBottom: -5,
});

const trn = new TrnMap();
trn.dim = [20, 20];
// trn.dim = [2, 2];

const getShades = (color, count) => {
    const colors = new Array({length: count});
    for (let index = 0; index < count; index++) {
        const factor = index / (count - 1);
        colors[index] = get256Color(color[0] * factor, color[1] * factor, color[2] * factor);
    }
    return colors;
}

const trnPal = TrnPalette.from([
    new TrnTile({
        symbol: '%',
        color: CColor.magentaBright,
    }),
    new TrnTile({
        symbol: '/',
        color: getShades([0.3, 1, 0.2], 10),
    }),
    new TrnTile({
        symbol: '~', // TODO unicode isn't working
        color: getShades([0.8, 0.8, 0.8], 10),
    }),
    new TrnTile({
        symbol: '~',
        color: getShades([1, 0.8, 0.5], 10),
    }),
]);

const buildTrn = () => {
    fillTiles(trn, {
        tileId: 2,
        height: 0,
    });

    const ws = randomSeed();

    const channelA = new TrnNoiseChannel({
        channelSeed: "A",
        worldSeed: ws,
        scale: 1 / 10
    });
    
    const channelB = new TrnCombineChannel(
        TrnCombineChannel.Modes.mul,
        [
            new TrnNoiseChannel({ 
                channelSeed: "B",
                worldSeed: ws, scale: 1 / 10
            }),
            new TrnMapZChannel(
                new TrnNoiseChannel({
                    channelSeed: "BJit",
                    worldSeed: ws,
                    scale: 1 / 2
                }),
                0.5, 1
            ),
        ],
    );

    randomSplatTiles(trn, {
        heightMode: 'set',
        minHeight: -2,
        maxHeight: 2,

        channel: channelA,
    });

    
    randomSplatTiles(trn, {
        heightMode: 'add',
        maxHeight: 2,
        
        channel: channelB,

        tileId: 3,
        
        minThreshold: 0.2,
        mask: channelB,
    });
    
    randomSplatTiles(trn, {
        heightMode: 'add',
        maxHeight: 1,
        
        channel: channelB,

        tileId: 1,

        minThreshold: 0.5,
        mask: channelB,
    });
}

buildTrn();

const mainBhvr = MakeBhvr({
    name: "Main",
    func: (event, arg) => {
        loopIdx++;
        
        screen.refreshScreen();

        screen.clearScreenZBuffer();

        camera.center = cursor;

        renderMap(trn, camera, {
            palette: trnPal
        });

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

let cursor = I16V.from(camera.center);

const onInputBhvr = MakeBhvr({
    name: "OnInput",
    func: (event, arg) => {
        if (arg === 't')
            setImmediate(buildTrn);

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
    },
    events: [RawInputEvent.instance],
});


MakeBhvr({
    name: "OnQuitInput",
    func: (event, arg) => {
        if (arg !== '\u0003')
            return;

        console.log(`framerate was ${smoothFrames.fps}`);

        requestQuit();
    },

    events: [RawInputEvent.instance],
});


requestEventPoll();