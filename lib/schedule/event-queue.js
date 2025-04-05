import { binarySearchLow, dSbSLow } from "../utility/bin-search.js";
import ExAggr from "../utility/exaggr.js";
import { Event } from "./events.js";
import assert from "node:assert";
import { inspect } from "node:util";


class QueueTimer
{
    /** @type {?QueueTimer} */
    static realTime_;

    /** @type {QueueTimer[]} */
    static timers_ = [];

    /** @type {QueueTimer} */
    static get RealTime() {
        if (this.realTime_ == null)
            this.realTime_ = new QueueTimer();

        return this.realTime_;
    }

    /** @type {Number} */
    get ts() { return Math.trunc(performance.now()) / 1000; }

    getRealtime(ts) { return ts; }

    constructor() {
        QueueTimer.timers_.push(this); // TODO
    }

    /** @type {EventQueue[]} */
    queues_ = [];
}

class QEntry
{
    /** @type {EventQueue} */
    queue = null;
    /** @type {Event} */
    get event() { return this.queue.event_; }
    /** @type {any} */
    arg = null;
    /** @type {Number} */
    ts;


    toString() { return `${this.event}`; }

    /** @type {QEntry[]} */
    static Pool = [];

    /**
     * 
     * @param {EventQueue} queue 
     * @param {any} arg 
     * @param {Number} ts 
     * @returns {QEntry}
     */
    static newEntry(queue, arg, ts) {
        const e = this.Pool.pop() ?? new QEntry();
        e.queue = queue;
        e.ts = ts;
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

class EventQueue
{
    /** @type {QueueTimer} */
    timer_;

    /** @type {Event} */
    event_;

    /** @type {?Number} */
    minGap_ = null;
    
    /** @type {?Number} */
    recurring_ = null;

    /** @type {?Number} */
    prevPoll_ = null;
    /** @type {?Number} */
    nextPoll_ = null;

    /** @type {QEntry[]} */
    queued_ = [];

    /** @type {Boolean} */
    waitPromise_ = true;
    /** @type {?Promise} */
    waitingPromise_ = null;

    /** @type {?Number} */
    curEventTs_ = null;

    /**
     * @typedef Options
     * @property {Event} event
     * @property {?QueueTimer} timer
     * @property {?Number} minGap
     * @property {?Number} recurring
     * @property {?Boolean} waitPromise
     */

    /**
     * 
     * @param {Options} options 
     */
    constructor(options) {
        this.event_ = options.event;
        assert.ok(this.event_ instanceof Event);
        
        this.timer_ = options.timer ?? QueueTimer.RealTime;
        assert.ok(this.timer_ instanceof QueueTimer);

        if (options.minGap != null)
            this.minGap_ = options.minGap;

        if (options.recurring != null)
            this.recurring = options.recurring;

        if (options.waitPromise != null)
            this.waitPromise_ = options.waitPromise;

        this.timer_.queues_.push(this);
    }

    disposed_;

    dispose() {
        if (!!this.disposed_)
            return;
        this.disposed_ = true;

        const idx = this.timer_.queues_.indexOf(this);
        assert.ok(idx > -1);
        this.timer_.queues_.splice(idx, -1);
    }


    toString() { return `${this.event}`; }
    
    /**
     * The timer governing this queue
     */
    get timer() { return this.timer_; }

    get event() { return this.event_; }

    /**
     * The timestamp of {@link timer}
     */
    get ts() { return this.timer_.ts; }

    /**
     * When non-null, indicates the period at which the event automatically requeues
     */
    get recurring() { return this.recurring_; } // TODO
    
    /**
     * The timestamp of next entry in the queue
     */
    get nextPendingTs() { return this.nextPoll_; }

    get curEventTs() { return this.curEventTs_; }

    /**
     * When true, the queue should wait for previous async events
     * before continuing,
     * otherwise it may continue polling despite any pending promises.
     */
    get waitPromise() { return this.waitPromise_; }


    /**
     * 
     * @param {any} arg 
     * @param {Number} timeStamp 
     * @returns {Boolean}
     */
    requestBy(arg, timeStamp) {
        return this.#advancePoll_(arg, timeStamp);
    }



    /** @type {?Number} */
    get #nextPossiblePoll() {
        if (this.prevPoll_ == null)
            return null;
        else
            return this.prevPoll_ + (this.minGap_ ?? 0);
    }

    /**
     * Request that a poll occur within {@link timeSpan}
     * @param {any} arg 
     * @param {Number} timeSpan The delay before the poll occurs
     * @param {?Boolean} now Indicates that the poll may happen immediately, otherwise the poll should wait at least {@link timeSpan}
     */
    requestIn(arg, timeSpan, now) {
        const cur = this.ts;
        let ts = cur + timeSpan;
        if (!!now) {
            const prevNext = this.#nextPossiblePoll;
            
            ts = Math.min(ts, prevNext ?? cur);
        }

        return this.#advancePoll_(arg, ts);
    }

    /**
     * 
     * @param {any} arg 
     * @param {Number} ts 
     * @param {?Boolean} dedupe 
     * @returns {Boolean} 
     */
    #advancePoll_(arg, ts, dedupe) {
        let next = ts;

        let idx = dSbSLow(this.queued_, next, (a, b) => a.ts - b);
        if (!!dedupe) {
            let pIdx;
            if (idx < this.queued_.length && this.queued_[idx].ts == next)
                pIdx = idx;
            else
                pIdx = idx - 1;

            let min;
            if (pIdx < 0) {
                min = this.#nextPossiblePoll;
            } else {
                min = this.queued_[pIdx].ts;
                if (this.minGap_ != null)
                    min += this.minGap_;
            }

            if (min != null && next < min && (idx < this.queued_.length ? arg != this.queued_[idx] : true))
                return false;
        }

        let front = this.nextPoll_ == null || next < this.nextPoll_;
        this.nextPoll_ = next;
        
        const e = QEntry.newEntry(this, arg, next);
        this.queued_.splice(idx, null, e);

        if (front)
            QueueWorker.ensureBy(this.timer_.getRealtime(next));

        return true;
    }

    onBeginPoll_(ts) {
        if (this.nextPoll_ == null)
            return false;

        if (ts < this.nextPoll_)
            return false;

        this.prevPoll_ = ts;
        return true;
    }

    flushEntriesUpTo_(ts, into) {
        let qIdx = 0;
        for (; qIdx < this.queued_.length; qIdx++) {
            const entry = this.queued_[qIdx];
            if (!(entry.ts <= ts))
                break;

            into.push(entry);
        }

        let lastTs = null;
        if (qIdx > 0)
            lastTs = this.queued_[qIdx - 1].ts;
        else
            lastTs = this.prevPoll_ ?? ts;

        this.queued_.splice(0, qIdx);
        
        this.nextPoll_ = this.queued_[0] ?? null;
        
        if (this.recurring != null) {
            this.requestBy(null, lastTs + this.recurring);
        }
    }
}


const QueueWorker = new class QueueWorker
{
    prevPoll_ = null;
    nextScheduledPoll_ = null;

    exAggr_ = new ExAggr();

    /** @type {QEntry[]} */
    entryScratch_ = [];

    /** @type {QEntry[]} */
    waitingPromises_ = [];

    get ts() {
        return QueueTimer.RealTime.ts;
    }

    ensureBy(ts) {
        if (this.nextScheduledPoll_ != null && !(ts < this.nextScheduledPoll_))
            return;

        this.nextScheduledPoll_ = ts;

        const cur = this.ts;
        const diff = ts - cur;

        const diffMs = diff * 1000;

        this.boundPoll ??= this.pollOnce.bind(this);
        if (diffMs < 1)
            setImmediate(this.boundPoll);
        else
            setTimeout(this.boundPoll, diffMs);
    }

    requestImmediate() {
        this.ensureBy(0);
    }


    boundPoll;

    pollOnce() {
        this.exAggr_.clear();

        this.nextScheduledPoll_ = null;

        const entries = this.entryScratch_;
        entries.splice(0, Infinity);

        this.#flushNew(entries);
        this.#flushWaiting(entries);

        if (entries.length > 0)
            this.#post(entries);

        this.#ensureNext();

        this.exAggr_.rethrow();
    }



    #ensureNext() {
        let next = null;

        for (const t of QueueTimer.timers_) {
            for (const q of t.queues_) {
                const n = t.getRealtime(q.nextPendingTs);
                if (n == null)
                    continue;

                if (next == null || n < next)
                    next = n;
            }
        }

        if (next == null)
            return;

        this.ensureBy(next);
    }

    #flushWaiting(entries) {
        let dst = 0, src = 0;
        for (; src < this.waitingPromises_.length; src++) {
            const waiting = this.waitingPromises_[dst];
            if (waiting.queue.waitingPromise_ != null) {
                this.waitingPromises_[src] = waiting;
                dst++;
            } else {
                entries.push(waiting);
            }
        }

        this.waitingPromises_.splice(dst, Infinity);
    }

    #flushNew(entries) {
        for (const t of QueueTimer.timers_) {
            const ts = t.ts;

            for (const q of t.queues_) {
                if (!q.onBeginPoll_())
                    continue;
    
                q.flushEntriesUpTo_(ts, entries);
            }
        }
    }

    /**
     * 
     * @param {ArrayLike<QEntry>} entries 
     */
    #post(entries) {
        entries.sort((a, b) => a.ts - b.ts);

        for (const entry of entries) {
            if (entry.queue.waitPromise && entry.queue.waitingPromise_ != null) {
                this.waitingPromises_.push(entry);

                continue;
            }

            entry.queue.curEventTs_ = entry.ts;

            let promise = null;
            try { promise = entry.event.post(entry.arg); }
            catch (ex) { this.exAggr_.add(ex); }

            entry.queue.curEventTs_ = null;

            if (entry.queue.waitPromise && promise != null) {
                const wQ = entry.queue;
                wQ.waitingPromise_ = promise;

                promise.finally(() => {
                    assert.ok(wQ.waitingPromise_ == promise);
                    wQ.waitingPromise_ = null;
                    this.requestImmediate();
                });
            }
            
            QEntry.returnEntry(entry);
        }
    }
}




export { EventQueue, QueueTimer };
export default EventQueue;