import { Camera } from "../camera.js";
import { EntTable } from "../entities/entity.js";
import { EntRender } from "../entities/render.js";
import { EntTransforms } from "../entities/transform.js";
import { gameMapPalette } from "./game-map-palette.js";

import { TrnMap } from "../map/trnmap.js";
import { Event } from "../schedule/events.js";
import { SmoothFrameCounter } from "../utility/smooth-frame-counter.js";
import EventQueue from "../schedule/event-queue.js";


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


export class GameTick
{
    /** @type {Number} */
    time
    /** @type {Number} */
    deltaTime;

    /**
     * 
     * @param {Number} time
     * @param {Number} deltaTime 
     */
    constructor(time, deltaTime) {
        this.time = time;
        this.deltaTime = deltaTime;
    }
}

const GameTickEvent = new class GameTickEventTag extends Event
{
    targetFrameRate = 60; // TODO

    frameCounter = new SmoothFrameCounter();

    prevFrame = 0;

    /** @type {EventQueue} */
    eventQueue_;


    #adjustFrameTarget_() {
        let mul = 1;
        if (this.frameCounter.fps > 0)
            mul = (this.targetFrameRate / this.frameCounter.fps);
        mul = Math.max(0.5, Math.min(2, mul));
        return this.targetFrameRate * mul;
    }
    
    
    requestTick(){
        const period = 1 / this.targetFrameRate;
        this.eventQueue_.requestIn(null, period, true);
    }

    /**
     * @override
     */
    onEvent() {
        const ts = this.eventQueue_.curEventTs;
        const frameDif = ts - this.prevFrame;
        this.prevFrame = ts;

        this.frameCounter.add(frameDif);

        this.eventQueue_.requestIn(null, 1 / this.#adjustFrameTarget_(), false);

        return super.onEvent(new GameTick(ts, frameDif));
    }

    constructor() {
        super();

        this.recurring = 1 / this.targetFrameRate;
        this.enabled = true;
        this.eventQueue_ = new EventQueue({
            event: this,
        });

        this.prevFrame = this.eventQueue_.ts;
    }
}


export { GameWorld, GameTickEvent };

export default GameWorld;
