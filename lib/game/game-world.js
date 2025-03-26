import { Camera } from "../camera.js";
import { EntTable } from "../entities/entity.js";
import { EntRender } from "../entities/render.js";
import { EntTransforms } from "../entities/transform.js";
import { gameMapPalette } from "./game-map-palette.js";

import { TrnMap } from "../map/trnmap.js";
import { LoopEvent, LoopPollArg } from "../schedule/loopevents.js";
import { SmoothFrameCounter } from "../utility/smooth-frame-counter.js";


const GameWorld = new class
{
    map = new TrnMap({
        dim: [10, 10],
        palette: gameMapPalette,
    });
    
    entities = new EntTable({
        aspects: [EntTransforms, EntRender],
    });
    
    camera = new Camera({
        viewTop: 5,
        viewBottom: -5,
    });


    time = 0;
};


const GameTickEvent = new class GameTickEventTag extends LoopEvent
{
    frameTarget = 30; // TODO

    frameCounter = new SmoothFrameCounter();

    /**
     * @override
     * @param {LoopPollArg} arg 
     */
    onEvent(arg) {
        // const before = this.curTs;

        super.onEvent(arg);
        
        // const after = this.curTs;

        // this.frameCounter.add(after - before);
    }

    constructor() {
        super();

        this.recurring = 1 / this.frameTarget;
        this.enabled = true;
    }
}


export { GameWorld, GameTickEvent };

export default GameWorld;
