import screen from "./lib/screen/screen.js";
import { Color } from "./lib/screen/color.js";

import { Event, Behavior, MakeBhvr } from "./lib/schedule/events.js";
import { LoopEvent, requestEventPoll } from "./lib/schedule/loopevents.js";

import {RawInputEvent} from "./lib/input/inputevent.js";

import { requestQuit } from "./lib/game/quit.js"

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

/*
{
    screen.refreshScreen();
    
    screen.clearBuffer('1', Color.darkRed);
    
    screen.printScreen();
}
*/

const mainLoopEvent = new LoopEvent();

mainLoopEvent.recurring = 0.01;
mainLoopEvent.enabled = true;


const maxLoops = 1000;
let loopIdx = 0;

const flashColors = [
    Color.darkRed,
    Color.red,
    Color.darkBlue,
    Color.blue,
];

const mainBhvr = MakeBhvr({
    name: "Main",
    func: (event) => {
        if (!(loopIdx++ < maxLoops)) {
            event.removeBehavior(mainBhvr);
            event.cancel();

            return;
        }

        screen.refreshScreen();
    
        const color = flashColors[Math.trunc(loopIdx % flashColors.length)];

        screen.clearBuffer('1', color);
    
        screen.printScreen();
    },
    events: [mainLoopEvent],
});

requestEventPoll();

const onInputBhvr = MakeBhvr({
    name: "OnInput",
    func: (event, arg) => {

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
