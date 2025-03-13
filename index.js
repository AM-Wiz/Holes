import screen from "./screen/screen.js";
import { Color } from "./screen/color.js";

import { Event, Behavior, MakeBhvr } from "./game/schedule/events.js";
import { LoopEvent, requestEventPoll } from "./game/schedule/loopevents.js";

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
