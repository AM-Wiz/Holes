import { Scheduler } from "../schedule/scheduler.js";
import ExAggr from "../utility/exaggr.js";
import { GameTickEvent } from "./game-tick.js";
import assert from "node:assert";


const PlayMode = new class PlayMode
{
    PauseMode = 0;
    PlayMode = 1;
    TurnMode = 2;

    isPlaying_ = false;

    mode_ = 0;

    

    get mode() { return this.mode_; }

    get isPlaying() { return this.isPlaying_; }

    pause() {
        this.mode_ = this.PauseMode;
        this.#onModeChange();
    }
    
    play() {
        this.mode_ = this.PlayMode;
        this.#onModeChange();
    }
    
    takeTurns() {
        this.mode_ = this.TurnMode;
        this.#onModeChange();
    }
    
    #onModeChange() {
        GameTickEvent.eventQueue_.looping = this.mode == this.PlayMode;
    }
};


class PlayAction
{
    static StatusIdle = 0;
    static StatusStarting = 1;
    static StatusActive = 2;
    static StatusEnding = 3;

    status_ = 0;

    get isActive() { return this.status_ == PlayAction.StatusActive; }

    activate() {
        assert.ok(this.status_ == PlayAction.StatusIdle);
        this.#transStatus(PlayAction.StatusStarting);
    }
    
    ensureActive() {
        if (this.status_ == PlayAction.StatusStarting || this.status_ == PlayAction.StatusActive)
            return;

        this.#transStatus(PlayAction.StatusStarting);
    }


    finish() {
        assert.ok(this.status_ == PlayAction.StatusActive);
        this.#transStatus(PlayAction.StatusEnding);
    }
    
    cancel() {
        if (this.status_ == PlayAction.StatusActive) {
            this.#transStatus(PlayAction.StatusEnding);
        } else if (this.status_ == PlayAction.StatusStarting) {
            this.status_ = PlayAction.StatusIdle;
            return;
        } else {
            return;
        }
    }

    #transStatus(status) {
        this.status_ = status;
        PlayActSchd.onDirtyStatus_(this);
    }


    onStart() {

    }

    onEnd() { // TODO add additional states for 'overridden' actions

    }
}


const PlayActSchd = new class PlayActSchd extends Scheduler
{
    activeStack_ = [];
    activeSet_ = [];


    onDirty_() {
        this.requestPoll();
    }


    exAggr = new ExAggr();

    onPoll() {
        this.exAggr.clear();

        this.#flushActivation_();

        this.#requestTick_();

        this.exAggr.rethrow();
    }

    #requestTick_() {
        if (PlayMode.mode == PlayMode.PauseMode)
            return;

        if (this.activeSet_.length > 0) {
            GameTickEvent.requestTick();
        }
    }

    #flushActivation_() {
        let any = false;
        for (let idx = 0; idx < this.activationQueue_.length; idx++) {
            const act = this.activationQueue_[idx];
            if (act.status_ == PlayAction.StatusStarting) {
                act.status_ = PlayAction.StatusActive;
                this.activeStack_.push(act);
                try { act.onStart(); }
                catch(ex) { this.exAggr.add(ex); }

                any = true;
            } else if (act.status_ == PlayAction.StatusEnding) {
                act.status_ = PlayAction.StatusIdle;
                const idx = this.activeStack_.indexOf(act);
                assert.ok(idx > -1);
                this.activeStack_.splice(idx, 1);

                try { act.onEnd(); }
                catch(ex) { this.exAggr.add(ex); }
                
                any = true;
            }
        }

        this.activationQueue_.splice(0, Infinity);

        if (any) {
            this.#recalcSet_();
        }
    }

    activationQueue_ = [];

    onDirtyStatus_(action) {
        this.activationQueue_.push(action);
        this.onDirty_();
    }


    #recalcSet_() {
        this.activeSet_.splice(0, Infinity);

        if (this.activeStack_.length > 0)
            this.activeSet_.push(this.activeStack_[this.activeStack_ - 1]);
    }
}






export { PlayMode, PlayAction };
