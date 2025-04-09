import { Camera } from "../camera.js";
import { EntTable } from "../entities/entity.js";
import { EntRender } from "../entities/render.js";
import { EntTransforms } from "../entities/transform.js";
import { gameMapPalette } from "./game-map-palette.js";

import { TrnMap } from "../map/trnmap.js";
import { Event } from "../schedule/events.js";
import { SmoothFrameCounter } from "../utility/smooth-frame-counter.js";
import { EventRepeat } from "../schedule/event-queue.js";


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
    time;
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

    /** @type {EventRepeat} */
    eventQueue_;


    #adjustFrameTarget_() {
        let mul = 1;
        if (this.frameCounter.fps > 0)
            mul = (this.targetFrameRate / this.frameCounter.fps);
        mul = Math.max(0.5, Math.min(2, mul));
        return this.targetFrameRate * mul;
    }
    
    
    requestTick(){
        this.eventQueue_.requestOne();
    }
    
    requestTurn(){
        this.eventQueue_.requestAtLeast();
    }

    /**
     * @override
     */
    onEvent(arg) {
        const time = arg.time;
        const frameDif = time - this.prevFrame;
        this.prevFrame = time;

        this.frameCounter.add(frameDif);

        this.eventQueue_.period = 1 / this.#adjustFrameTarget_();
        
        return super.onEvent(arg);
    }

    constructor() {
        super();

        this.recurring = 1 / this.targetFrameRate;
        this.enabled = true;
        this.eventQueue_ = new class extends EventRepeat{
            constructor(event) {
                super(event, {
                    period: 1 / event.targetFrameRate,
                    looping: true,
                });
            }

            makeArg(ts) {
                return new GameTick(ts, 1 / this.event.targetFrameRate); // TODO
            }
        }(this);

        this.prevFrame = this.eventQueue_.curTs;
    }
}


export { GameWorld, GameTickEvent };

export default GameWorld;
