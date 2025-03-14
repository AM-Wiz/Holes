import TinyQueue from "tinyqueue";
import { ExAggr } from "../utility/exaggr.js";
import { Event, Behavior } from "./events.js";


export { Event };

export class LoopPollArg
{
    /**
     * 
     * @param {Number} ts 
     * @param {Number} deltaTime 
     */
    constructor(ts, deltaTime) {
        this.ts = ts;
        this.deltaTime = deltaTime;
    }
}

export class LoopEvent extends Event
{
    /** @type {Boolean} */
    enabled_ = false;
    /**
     * The timestamp of the next known poll entry in the queue.
     * Used to avoid added excess entries to the queue.
     * Counts monotonically downwards.
     * @type {?Number}
     */
    nextQueuedPoll_ = null;
    /**
     * The desired timestamp for the next poll ot occur.
     * If polling occurs too soon, the poll will be ignored
     * @type {Number}
     */
    nextPoll_ = -1;
    /**
     * Indicates that the event is presently waiting for a poll event
     * @type {Boolean}
     */
    waitingPoll_ = false;
    /**
     * The time at which the previous poll occurred
     * @type {Number}
     */
    prevPoll_ = -2;

    /**
     * When not null, indicates the period on which the event recurs
     * @type {?Number}
     */
    recurring_ = null;


    constructor() {
        super();
    }


    /** @type {Boolean} */
    get enabled() { return this.enabled_; }
    /** @type {Boolean} */
    set enabled(value) {
        this.enabled_ = value;
    }


    /** @type {?Number} */
    get recurring() { return this.recurring_; }
    /** @type {?Number} */
    set recurring(value) {
        if (this.recurring_ === value)
            return;

        this.recurring_ = value;

        if (this.recurring_ >= 0) {
            this.waitingPoll_ = true;

            this.nextPoll_ = Math.min(this.nextPoll_,  getTs() + this.recurring_);
        }

        this.#dirtyPoll_();
    }



    /**
     * @param {LoopPollArg} arg 
     */
    onEvent(arg) {
        super.onEvent(arg);
    }


    /**
     * 
     * @param {Number} ts 
     * @returns {Boolean}
     */
    #onPollSchedule_(ts) {
        this.nextQueuedPoll_ = null;

        if (this.nextPoll_ > ts)
            return false;
        
        
        if (!this.waitingPoll_)
            return false;
        
        this.prevPoll_ = ts;
        this.waitingPoll_ = false;

        if (this.recurring_ >= 0)
            this.setPoll(ts + this.recurring_);

        return true;
    }

    onPoll_(ts) {
        const prevPoll = this.prevPoll_;

        if (!this.#onPollSchedule_(ts))
            return;
        
        if (this.enabled) {
            const arg = new LoopPollArg(ts, ts - prevPoll);
            
            this.post(arg);
        }
    }


    #dirtyPoll_() {
        if (this.nextQueuedPoll_ != null && this.nextQueuedPoll_ <= this.nextPoll_)
            return;

        this.nextQueuedPoll_ = this.nextPoll_;

        addPollQSet_(this.nextPoll_, this);
    }

    delayPoll(time) {
        this.nextPoll_ += time;

        this.#dirtyPoll_();
    }
    
    advancePoll(time) {
        this.nextPoll_ -= time;

        this.#dirtyPoll_();
    }

    requestPollIn(time) {
        this.nextPoll_ = getTs() + time;
        this.waitingPoll_ = true;

        this.#dirtyPoll_();
    }
    
    requestPollImmediate() {
        this.nextPoll_ = 0;
        this.waitingPoll_ = true;

        this.#dirtyPoll_();
    }
    
    requestPoll(ts) {
        this.nextPoll_ = Math.min(this.nextPoll_, ts);
        this.waitingPoll_ = true;

        this.#dirtyPoll_();
    }
    
    setPoll(ts) {
        this.nextPoll_ = ts;
        this.waitingPoll_ = true;

        this.#dirtyPoll_();
    }

    cancel() {
        this.waitingPoll_ = false;

        this.#dirtyPoll_();
    }
}





export const getTs = () => process.uptime();

/** @type {Number} */
let nextPollTs = getTs();

let pollScheduled = false;


/**
 * Reschedule the polling event
 */
const ensurePoll_ = () => {
    const next = lepeQueue.peek();

    if (next == null)
        return;
    
    const nextts = next.ts;

    ensurePollBy_(nextts);
}

const ensurePollBy_ = (ts) => {
    if (ts <= nextPollTs)
        return;

    if (pollScheduled)
        return;

    nextPollTs = ts;

    pollScheduled = true;

    const curTs = getTs();

    const dif = (ts - curTs) * 1000;

    if (dif < 1)
        setImmediate(poll);
    else
        setTimeout(poll, dif);
}

class LoopEventPollEntry {
    /** @type {Number} */
    ts;
    /** @type {LoopEvent} */
    event;
}

/** @type {TinyQueue<LoopEventPollEntry>} */
const lepeQueue = new TinyQueue([],
    (a, b) =>
        a.ts < b.ts ? -1
      : a.ts > b.ts ? 1
      : 0
);

/** @type {LoopEventPollEntry[]} */
const lepePool = [];

const addPollQSet_ = (ts, event) => {
    let lepe = lepePool.pop() || new LoopEventPollEntry();

    lepe.ts = ts;
    lepe.event = event;

    lepeQueue.push(lepe);

    ensurePollBy_(lepe.ts);
};

/**
 * 
 * @param {ExAggr} exs 
 */
const pollQSet_ = (ts, exs) => {
    while (true) {
        const e = lepeQueue.peek();

        if (!(e?.ts <= ts))
            break;

        lepeQueue.pop();

        try { pollSingle_(e.event, ts); }
        catch (ex) { exs.add(ex); }

        lepePool.push(e);
    }
}

/**
 * 
 * @param {LoopEvent} event 
 * @param {Number} ts
 */
const pollSingle_ = (event, ts) => {
    event.onPoll_(ts);
}

const poll = () => {
    const ts = getTs();

    pollScheduled = false;
    nextPollTs = Math.min(nextPollTs, ts);

    const exs = new ExAggr();

    pollQSet_(ts, exs);

    const endTs = getTs();

    ensurePoll_();

    exs.rethrow();
}




export const requestEventPoll = () => {
    if (pollScheduled)
        return;

    pollScheduled = true;
    setImmediate(poll);
}
