import ExAggr from "../utility/exaggr.js";
import assert from "node:assert";
import TinyQueue from "tinyqueue";


class SchdItem
{
    /** @type {Scheduler} */
    scheduler;
    /** @type {Number} */
    time;

    constructor(scheduler, time) {
        this.scheduler = scheduler ?? null;
        this.time = time ?? null;
    }
}


class Scheduler
{
    /** @type {Boolean} */
    waitPromise_ = true;
    /** @type {?Promise} */
    waitingPromise_ = null;

    /** @type {?Number} */
    minPollGap_ = 1 / 1000;
    /** @type {?Number} */
    nextWaitingPoll_ = null;

    /** @type {Scheduler[]} */
    static schedulers_ = [];

    constructor() {
        Scheduler.schedulers_.push(this);
        SchdWorker.requestImmediate();
    }

    disposed_;

    dispose() {
        if (!!this.disposed_)
            return;
        this.disposed_ = true;

        const idx = Scheduler.schedulers_.indexOf(this);
        assert.ok(idx > -1);
        Scheduler.schedulers_.splice(idx, -1);

        this.onDispose();
    }

    onDispose() {

    }


    get curTime() { return SchdWorker.curTime; }

    get curPollTime() { return SchdWorker.curPollTime; }

    get minPollGap() { return this.minPollGap_; }
    set minPollGap(value) { this.minPollGap_ = value; } // TODO advance schedule
    
    requestPoll() {
        this.nextWaitingPoll_ = 0;

        this.#onRequestPoll_();
    }
    
    requestPollBy(ts) {
        this.nextWaitingPoll_ = ts;

        this.#onRequestPoll_();
    }

    #onRequestPoll_() {
        SchdWorker.ensureBy(this.nextWaitingPoll_);
    }

    queueItem(item) {
        if (this.disposed_)
            return;

        SchdWorker.enqueue(item);
    }

    process_(item) {
        if (this.disposed_)
            return;

        this.onProcess(item);
    }


    poll_() {
        this.nextWaitingPoll_ = null;
        
        if (this.disposed_)
            return;

        this.onPoll();
    }

    onPoll() {

    }

    /**
     * 
     * @param {SchdItem} item 
     * @returns {?Promise}
     */
    onProcess(item) {

    }
}


const SchdWorker = new class SchdWorker
{
    /** @type {?Number} */
    prevPoll_ = null;
    /** @type {?Number} */
    nextScheduledPoll_ = null;
    /** @type {?Number} */
    curPollTime_ = null;

    exAggr_ = new ExAggr();

    /** @type {SchdItem[]} */
    entryScratch_ = [];

    /** @type {SchdItem[]} */
    queue_ = [];
    /** @type {TinyQueue<SchdItem>} */
    waitingQ_ = new TinyQueue([],
        (a, b) => a.time - b.time
    );

    /** @type {Number} */
    get curTime() {
        return Math.trunc(performance.now()) / 1000;
    }

    /** @type {?Number} */
    get curPollTime() {
        return this.curPollTime_;
    }

    enqueue(item) {
        this.queue_.push(item);
        this.ensureBy(item.time);
    }

    ensureBy(time) {
        if (this.nextScheduledPoll_ != null && !(time < this.nextScheduledPoll_))
            return;

        this.nextScheduledPoll_ = time;

        const cur = this.curTime;
        const diff = time - cur;

        const diffMs = diff * 1000;

        if (diffMs < 1)
            setImmediate(this.#boundPoll);
        else
            setTimeout(this.#boundPoll, diffMs);
    }

    requestImmediate() {
        this.ensureBy(0);
    }


    boundPoll_;

    get #boundPoll() { return this.boundPoll_ ??= this.pollOnce.bind(this); }

    pollOnce() {
        this.exAggr_.clear();

        this.curPollTime_ = this.curTime;
        this.nextScheduledPoll_ = null;

        this.#pollSchd();
        
        const entries = this.entryScratch_;
        entries.splice(0, Infinity);

        this.#flushOld(entries);
        this.#flushNew(entries);

        if (entries.length > 0)
            this.#post(entries);

        this.#ensureNext();
        this.curPollTime_ = null;

        this.exAggr_.rethrow();
    }


    #pollSchd() {
        for (const s of Scheduler.schedulers_) {
            try { s.poll_(); }
            catch (ex) { this.exAggr_.add(ex); }
        }
    }

    #ensureNext() {
        let next = null;

        for (const s of Scheduler.schedulers_) {
            let n = null;

            if (s.nextWaitingPoll_ != null)
                n = s.nextWaitingPoll_;

            if (s.minPollGap != null) {
                const minN = this.curPollTime_ + s.minPollGap;
                if (n == null)
                    n = minN;
                else
                    n = Math.min(n, minN);
            }

            if (n == null)
                continue;
            
            if (next == null || n < next)
                next = n;
        }
        
        if (next == null)
            return;

        this.ensureBy(next);
    }

    #flushOld(entries) {
        while (true) {
            const i = this.waitingQ_.peek();
            if (i == null || !(i.time <= this.curPollTime_))
                break;

            this.waitingQ_.pop();
            entries.push(i);
        }
    }

    #flushNew(entries) {
        for (const i of this.queue_) {
            if (!(i.time <= this.curPollTime_))
                this.waitingQ_.push(i);
            else
                entries.push(i);
        }
        this.queue_.splice(0, Infinity);
    }

    /**
     * 
     * @param {ArrayLike<SchdItem>} entries 
     */
    #post(entries) {
        entries.sort((a, b) => a.time - b.time);

        for (const entry of entries) {
            if (entry.scheduler.waitPromise && entry.scheduler.waitingPromise_ != null) {
                const wP = entry.scheduler.waitingPromise_;
                const wE = entry;

                wP.finally(() => void SchdWorker.enqueue(wE));
                
                continue;
            }

            let promise = null;
            try { promise = entry.scheduler.process_(entry); }
            catch (ex) { this.exAggr_.add(ex); }

            if (entry.scheduler.waitPromise && promise != null) {
                const wQ = entry.scheduler;
                wQ.waitingPromise_ = promise;

                promise.finally(() => {
                    assert.ok(wQ.waitingPromise_ == promise);
                    wQ.waitingPromise_ = null;
                });
            }
        }
    }
}


export {Scheduler, SchdItem};