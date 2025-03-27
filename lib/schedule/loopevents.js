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
     * @type {?Number}
     */
    nextPoll_ = null;
    /**
     * The time at which the previous poll occurred
     * @type {?Number}
     */
    prevPoll_ = null;

    /**
     * When not null, indicates the period on which the event recurs
     * @type {?Number}
     */
    recurring_ = null;



    /**
     * @typedef Options
     * @property {?Number} recurring
     * @property {?Boolean} enabled
     */

    /**
     * 
     * @param {?Options} options 
     */
    constructor(options) {
        super();

        if (options?.recurring != null)
            this.recurring = options.recurring;

        if (options?.enabled != null)
            this.enabled = options.enabled;
    }


    /** @type {Boolean} */
    get enabled() { return this.enabled_; }
    /** @type {Boolean} */
    set enabled(value) {
        this.enabled_ = value;
    }


    /** @type {?Number} */
    get recurring() { return this.recurring_; }
    set recurring(value) {
        if (this.recurring_ === value)
            return;

        this.recurring_ = value;

        if (this.recurring_ >= 0) {
            const next = this.curTs + this.recurring_;
            if (this.nextPoll_ != null)
                this.nextPoll_ = Math.min(this.nextPoll_, next);
            else
                this.nextPoll_ = next;
        }

        this.#dirtyPoll_();
    }


    /**
     * The current timestamp
     * @type {Number}
     */
    get curTs() { return getTs(); }

    /**
     * The time stamp of the next scheduled poll.
     * When null, no poll is expected.
     * @type {?Number}
     */
    get nextPoll() { return this.nextPoll_; }


    /**
     * @param {LoopPollArg} arg 
     */
    onEvent(arg) {
        super.onEvent(arg);
    }


    /**
     * Test if the event is ready to poll
     * @param {Number} ts 
     * @returns {Boolean}
     */
    onPollSchedule_(ts) {
        this.nextQueuedPoll_ = null;
        
        if (this.nextPoll_ == null) // There is no poll scheduled
            return false;

        if (this.nextPoll_ > ts) {
            // We are waiting for a poll, but it is too early
            this.nextQueuedPoll_ = this.nextPoll_;
            addPollSet_(this.nextPoll_, this);

            return false;
        }
        
        this.nextPoll_ = null;

        if (this.recurring_ != null && this.recurring_ >= 0)
            this.setPoll(ts + this.recurring_); // Our event is recurring, set up our next automatic poll

        return true;
    }

    onPoll_(ts) {
        const prevPoll = this.prevPoll_;
        this.prevPoll_ = ts;

        if (this.enabled) {
            const arg = new LoopPollArg(ts, ts - prevPoll);
            
            this.post(arg);
        }

        this.#dirtyPoll_();
    }


    #dirtyPoll_() {
        if (this.nextPoll_ == null)
            return;
        else if (this.nextQueuedPoll_ != null && this.nextQueuedPoll_ <= this.nextPoll_)
            return;

        this.nextQueuedPoll_ = this.nextPoll_;

        addPollSet_(this.nextPoll_, this);
        ensurePollBy_(this.nextPoll_);
    }

    delayPoll(time) {
        this.nextPoll_ ??= this.curTs;
        this.nextPoll_ += time;

        this.#dirtyPoll_();
    }
    
    advancePoll(time) {
        this.nextPoll_ ??= this.curTs;
        this.nextPoll_ -= time;

        this.#dirtyPoll_();
    }

    requestPollIn(time) {
        this.nextPoll_ = this.curTs + time;

        this.#dirtyPoll_();
    }
    
    requestPollImmediate() {
        this.nextPoll_ = 0;

        this.#dirtyPoll_();
    }
    
    requestPoll(ts) {
        this.nextPoll_ ??= this.curTs;
        this.nextPoll_ = Math.min(this.nextPoll_, ts);

        this.#dirtyPoll_();
    }
    
    setPoll(ts) {
        this.nextPoll_ = ts;

        this.#dirtyPoll_();
    }

    cancel() {
        this.nextPoll_ = null;

        this.#dirtyPoll_();
    }
}





export const getTs = () => process.uptime();

/** @type {?Number} */
let nextPollTs = null;
/** @type {Number} */
let lastPollTs = 0;

/** @type {Boolean} */
let polling = false;

/** @type {ExAggr} */
const exAggr = new ExAggr();

/**
 * Reschedule the polling loop based on pending events
 */
const ensurePoll_ = () => {
    let nextts = null;

    if (lepeDirtySet.length > 0) {
        // We have entries in the dirty set, poll immediately
        nextts = 0;
    }
    
    const nextqd = lepeQueueSet.peek();
    if (nextqd != null) {
        // We have entries in the queue set, poll at the entry's time
        nextts = nextts != null ? Math.min(nextts, nextqd.ts) : nextqd.ts;
    }
    
    if (nextts == null)
        return;

    ensurePollBy_(nextts);
}

/**
 * Ensure that the poll loop occurs by at least `ts`
 * @param {Number} ts 
 */
const ensurePollBy_ = (ts) => {
    if (nextPollTs != null && ts <= nextPollTs)
        return;

    nextPollTs = ts;

    const curTs = getTs();

    const dif = (ts - curTs) * 1000;

    if (dif < 1) {
        setImmediate(poll);
    } else {
        setTimeout(poll, dif);
    }
}

/* The queue set records pending events that should be polled at some time in the future.
 * As a priority queue, distant future events can be entirely ignored.
 * In order to avoid endless looping, new pending events
 * are added to the dirty queue instead, during polling.
 */

class LoopEventPollEntry {
    /** @type {Number} */
    ts;
    /** @type {LoopEvent} */
    event;
}

/** @type {TinyQueue<LoopEventPollEntry>} */
const lepeQueueSet = new TinyQueue([],
    (a, b) =>
        a.ts < b.ts ? -1
      : a.ts > b.ts ? 1
      : 0
);

/** @type {LoopEventPollEntry[]} */
const lepePool = [];

const addPollQSet_ = (ts, event) => {
    let lepe = lepePool.pop() ?? new LoopEventPollEntry();

    lepe.ts = ts;
    lepe.event = event;

    lepeQueueSet.push(lepe);
}

/**
 * Add `event` to the polling set
 * @param {Number} ts The time stamp that `event` should be polled at
 * @param {LoopEvent} event 
 */
const addPollSet_ = (ts, event) => {
    if (polling) {
        // We are already polling, add it to the dirty set to avoid hanging
        addPollDSet_(ts, event);
    } else if (ts < lastPollTs) {
        // The event should be activated immediately, add it to the dirty set
        addPollDSet_(ts, event);
    } else {
        // The event occurs in the future, add it to the queue set
        addPollQSet_(ts, event);
    }
}

/**
 * Poll the queue set
 */
const pollQSet_ = () => {
    while (true) {
        const e = lepeQueueSet.peek();

        if (!(e?.ts <= lastPollTs))
            break; // Nothing else is ready, We can skip checking the rest

        lepeQueueSet.pop();

        pollSingle_(e.event, lastPollTs);

        lepePool.push(e);
    }
}

/* The dirty set is used to record pending events that should be polled immediately.
 * It uses a page-flipping technique to ensure that
 * during polling new additions to the dirty set
 * are not immediately processed,
 * this gives other tasks in the vm work queue a chance to execute.
 */

/** @type {LoopEvent[]} */
let lepeDirtySet = [];

/** @type {LoopEvent[]} */
let lepeDirtySetFlip = [];

const addPollDSet_ = (ts, event) => {
    lepeDirtySet.push(event);
}

/**
 * Flip the dirty sets, and return the previously active dirty set
 * @returns {LoopEvent[]} The previously active dirty set
 */
const flipPollDSet_ = () => {
    const dirty = lepeDirtySet;
    lepeDirtySet = lepeDirtySetFlip;
    lepeDirtySetFlip = dirty;
    
    return dirty;
}

/**
 * Poll the elements in the dirty set
 */
const pollDSet_ = () => {
    const dirty = lepeDirtySet;
    lepeDirtySet = lepeDirtySetFlip;
    lepeDirtySetFlip = dirty;

    for (const e of dirty) {
        if (e.nextPoll == null)
            continue;

        if (!(e.nextPoll <= lastPollTs)) {
            // Item is not yet scheduled, add to queue set
            addPollQSet_(e.nextPoll, e);
            continue;
        }
        
        pollSingle_(e, lastPollTs);
    }

    // Clear the dirty set
    dirty.splice(0);
}

/**
 * Flush all applicable elements remaining in the dirty set into the queue
 */
const flushDSet_ = () => {
    const dirty = flipPollDSet_();

    for (const e of dirty) {
        if (e.nextPoll == null)
            continue;

        // Flush the item to the dirty set or queue, depending on whether it is ready for polling
        if (e.nextPoll <= lastPollTs)
            addPollDSet_(e.nextPoll, e);
        else
            addPollQSet_(e.nextPoll, e);
    }

    // Clear the dirty set
    dirty.splice(0);
}

/**
 * Poll `event`
 * @param {LoopEvent} event 
 */
const pollSingle_ = (event) => {
    if (!event.onPollSchedule_(lastPollTs)) // Event is not scheduled to run yet
        return;
    
    try { event.onPoll_(lastPollTs); }
    catch (ex) { exAggr.add(ex); }
}

/**
 * The poll loop
 */
const poll = () => {
    polling = true;
    
    nextPollTs = null;
    lastPollTs = getTs();

    exAggr.clear();
    
    pollDSet_();

    pollQSet_();

    flushDSet_();

    const endTs = getTs();

    ensurePoll_();
    
    polling = false;

    exAggr.rethrow();
}



/**
 * Request that the poll loop execute immediately
 */
export const requestEventPoll = () => {
    if (nextPollTs != null && nextPollTs <= 0)
        return;

    nextPollTs = 0;
    setImmediate(poll);
}
