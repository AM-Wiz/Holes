import { SchdItem, Scheduler } from "./scheduler.js";
import { Event } from "./events.js";
import ExAggr from "../utility/exaggr.js";
import assert from "node:assert";


class QEntry extends SchdItem
{
    /** @type {EventQueueBase} */
    queue = null;
    /** @type {Event} */
    get event() { return this.queue.event_; }
    /** @type {any} */
    arg = null;

    constructor() {
        super(EvQSchd, 0);
    }

    toString() { return `${this.event}`; }

    /** @type {QEntry[]} */
    static Pool = [];

    /**
     * 
     * @param {EventQueueBase} queue 
     * @param {any} arg 
     * @param {Number} ts 
     * @returns {QEntry}
     */
    static newEntry(queue, arg, ts) {
        const e = this.Pool.pop() ?? new QEntry();
        e.queue = queue;
        e.time = ts;
        e.arg = arg;

        return e;
    }
    
    /**
     * 
     * @param {QEntry} entry 
     */
    static returnEntry(entry) {
        this.Pool.push(entry);
    }
}


class EventQueueBase
{
    /** @type {Event} */
    event_;

    /** @type {Boolean} */
    waitAsync_ = true;
    /** @type {?Promise} */
    waitingPromise_ = null;

    /** @type {EventQueue[]} */
    static queues_ = [];


    /**
     * @typedef Options
     * @property {?Boolean} waitAsync
     */

    /**
     * 
     * @param {Event} event 
     * @param {?Options} options 
     */
    constructor(event, options) {
        this.event_ = event;
        EventQueueBase.queues_.push(this);
        if (options?.waitAsync != null)
            this.waitAsync = options.waitAsync;
    }
    
    disposed_;

    dispose() {
        if (!!this.disposed_)
            return;
        this.disposed_ = true;

        const idx = EventQueueBase.queues_.indexOf(this);
        assert.ok(idx > -1);
        EventQueueBase.queues_.splice(idx, -1);

        this.onDispose();
    }

    onDispose() {

    }

    get event() { return this.event_; }

    get curTs() { return EvQSchd.curTime; }
    
    get curPollTs() { return EvQSchd.curPollTime; }

    get waitAsync() { return this.waitAsync_; }
    set waitAsync(value) { this.waitAsync_ = value; }


    onPoll(ts) {

    }
}

class EventQueue extends EventQueueBase
{
    constructor(event, options) {
        super(event, options);
    }
    
    enqueueAt(arg, ts) {
        const e = QEntry.newEntry(this, arg, ts);
        EvQSchd.queueItem(e);
    }
    
    enqueueIn(arg, time) {
        const e = QEntry.newEntry(this, arg, this.curTs + time);
        EvQSchd.queueItem(e);
    }

    enqueueNow(arg) {
        const e = QEntry.newEntry(this, arg, this.curTs);
        EvQSchd.queueItem(e);
    }
}

class EventRepeat extends EventQueueBase
{
    /** @type {?any} */
    arg_ = null;

    /** @type {Boolean} */
    looping_ = false;

    /** @type {Number} */
    period_ = 1;

    /** @type {Number} */
    maxQueuedRepeats_ = 0;

    /** @type {?Number} */
    prevRepeat_ = null;

    /** @type {Number} */
    queuedCount_ = 0;

    /**
     * @typedef Options
     * @property {?any} arg
     * @property {?Number} period
     * @property {?Boolean} looping
     * @property {?Number} maxQueuedRepeats
     * @property {?Boolean} waitAsync
     */

    /**
     * 
     * @param {Event} event 
     * @param {Options} options 
     */
    constructor(event, options) {
        super(event, options);
        this.arg_ = options?.arg ?? null;
        if (options?.period != null)
            this.period = options?.period;
        if (options?.looping != null)
            this.looping = options.looping;
        if (options?.maxQueuedRepeats != null)
            this.maxQueuedRepeats = options.maxQueuedRepeats;
    }
    

    get event() { return this.event_; }

    get curTs() { return EvQSchd.curTime; }
    
    get curPollTs() { return EvQSchd.curPollTime; }

    get period() { return this.period_; }
    set period(value) { this.period_ = value; }

    get maxQueuedRepeats() { return this.maxQueuedRepeats_; }
    set maxQueuedRepeats(value) { this.maxQueuedRepeats_ = value; }

    get looping() { return this.looping_; }
    set looping(value) { this.looping_ = value; }

    makeArg(ts) {
        return this.arg_;
    }

    requestOne() {
        if (this.queuedCount_ > 0)
            return;

        this.queuedCount_++;
    }
    
    requestAtLeast(n) {
        if (this.queuedCount_ >= n)
            return;

        this.queuedCount_ = n;
    }

    onPoll(ts) {
        if (!(this.looping || this.queuedCount_ > 0))
            return;
        
        let qCount = 1;
        let nTs = ts;
        if (this.prevRepeat_ != null) {
            const diff = ts - this.prevRepeat_;

            const count = Math.round(diff / this.period); // TODO

            qCount = count;
            nTs = this.prevRepeat_;
        }

        if (this.maxQueuedRepeats > 0 && qCount > this.maxQueuedRepeats) {
            qCount = this.maxQueuedRepeats;
            nTs = ts - (qCount * this.period);
        }

        for (let i = 0; i < qCount; i++, nTs += this.period) {
            const arg = this.makeArg(nTs);
            const e = QEntry.newEntry(this, arg, nTs);
            EvQSchd.queueItem(e);
        }
        
        this.prevRepeat_ = nTs;
        this.queuedCount_ = Math.max(0, this.queuedCount_ - qCount);
    }
}

const EvQSchd = new class EvQSchd extends Scheduler
{
    exAggr_ = new ExAggr();

    constructor() {
        super();
    }

    onPoll() {
        const ts = this.curPollTime;

        this.exAggr_.clear();

        for (const q of EventQueueBase.queues_) {
            try { q.onPoll(ts); }
            catch (ex) { this.exAggr_.add(ex); }
        }

        this.exAggr_.rethrow();
    }

    /**
     * 
     * @param {QEntry} item 
     */
    onProcess(item) {
        this.exAggr_.clear();

        const { waitAsync: wait, waitingPromise_: waiting } = item.queue;

        if (wait && waiting != null) {
            const wP = waiting;
            const wE = item;

            wP.finally(() => void this.queueItem(wE));
            
            return;
        }

        let promise = null;
        try {
            const {event, arg} = item;
            promise = event.post(arg);
        } catch (ex) { this.exAggr_.add(ex); }

        if (wait && promise != null) {
            const wQ = item.queue;
            const wP = promise;
            wQ.waitingPromise_ = wP;

            wP.finally(() => {
                if (wQ.waitingPromise_ == wP)
                    wQ.waitingPromise_ = null;
            });
        }
        
        QEntry.returnEntry(item);
        
        this.exAggr_.rethrow();
    }
}



export { EventQueue, EventRepeat };