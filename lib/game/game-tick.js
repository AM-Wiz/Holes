import { EventRepeat } from "../schedule/event-queue.js";
import { Event } from "../schedule/events.js";
import { SmoothFrameCounter } from "../utility/smooth-frame-counter.js";



class GameTick
{
    /** @type {Number} */
    time;
    /** @type {Number} */
    deltaTime;


    /** @type {Number} */
    tick;

    static ticksPerTurn = 50;

    get deltaTurn() { return 1 / GameTick.ticksPerTurn; }


    /**
     * 
     * @param {Number} tick
     * @param {Number} time
     * @param {Number} deltaTime 
     */
    constructor(tick, time, deltaTime) {
        this.tick = tick;
        this.time = time;
        this.deltaTime = deltaTime;
    }
}

const GameTickEvent = new class GameTickEventTag extends Event {
    get targetFrameRate() { return GameTick.ticksPerTurn; }

    frameCounter = new SmoothFrameCounter();

    prevFrame = 0;

    /** @type {EventRepeat} */
    eventQueue_;

    tick_ = 0;

    #adjustFrameTarget_() {
        let mul = 1;
        if (this.frameCounter.fps > 0)
            mul = (this.targetFrameRate / this.frameCounter.fps);
        mul = Math.max(0.5, Math.min(2, mul));
        return this.targetFrameRate * mul;
    }

    requestTick() {
        this.eventQueue_.requestOne();
    }

    requestTurn() {
        this.eventQueue_.requestAtLeast(GameTick.ticksPerTurn);
    }

    /**
     * @override
     */
    onEvent(arg) {
        const time = arg.time;
        const frameDif = time - this.prevFrame;
        this.prevFrame = time;

        this.frameCounter.add(frameDif);

        this.eventQueue_.period = 1 / this.#adjustFrameTarget_(); // TODO

        return super.onEvent(arg);
    }

    constructor() {
        super();

        this.recurring = 1 / this.targetFrameRate;
        this.enabled = true;
        this.eventQueue_ = new class extends EventRepeat {
            constructor(event) {
                super(event, {
                    period: 1 / event.targetFrameRate,
                    looping: false,
                });
            }

            makeArg(ts) {
                const ev = this.event;
                const tick = ev.tick_++;
                return new GameTick(tick, ts, 1 / ev.targetFrameRate);
            }
        }(this);

        this.prevFrame = this.eventQueue_.curTs;
    }
};

export { GameTickEvent, GameTick };

export default GameTickEvent;