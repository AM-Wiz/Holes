import { Camera } from "../camera.js";
import { EntTable } from "../entities/entity.js";
import { EntRender } from "../entities/render.js";
import { EntTransforms } from "../entities/transform.js";
import { gameMapPalette } from "./game-map-palette.js";

import { TrnMap } from "../map/trnmap.js";
import { LoopEvent, LoopPollArg } from "../schedule/loopevents.js";
import { SmoothFrameCounter } from "../utility/smooth-frame-counter.js";


const GameWorld = new class GameWorldTag {
    /** @type {TrnMap} */
    map = new TrnMap({
        dim: [10, 10],
        palette: gameMapPalette,
    });
    
    /** @type {EntTable} */
    entities = new EntTable({
        aspects: [EntTransforms, EntRender],
    });
    
    /** @type {Camera} */
    camera = new Camera({
        viewTop: 5,
        viewBottom: -5,
    });

    /** @type {Number} */
    time = 0;
};


const GameTickEvent = new class GameTickEventTag extends LoopEvent
{
    frameTarget = 30; // TODO

    frameCounter = new SmoothFrameCounter();

    prevFrame = 0;

    /**
     * @override
     * @param {LoopPollArg} arg 
     */
    onEvent(arg) {
        const frameDif = arg.ts - this.prevFrame;
        this.prevFrame = arg.ts;

        super.onEvent(arg);
        
        this.frameCounter.add(frameDif);
    }

    constructor() {
        super();

        this.prevFrame = this.curTs;
        this.recurring = 1 / this.frameTarget;
        this.enabled = true;
    }
}


export { GameWorld, GameTickEvent };

export default GameWorld;
