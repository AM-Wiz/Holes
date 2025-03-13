import {ExAggr} from "./exaggr.js";

/**
 * @template TCB The type of the callback
 */
export class SafeCallbacks
{
    /** @type {Boolean} */
    unique_ = false;

    /** @type {TCB[]} */
    callbacks_ = [];

    /** @type {?TCB[]} */
    callbacksSafe_ = null;

    /** @type {ExAggr} */
    exAggr_ = new ExAggr();


    /**
     * @typedef SCOptions
     * @property {Boolean} unique
     * @property {TCB[]} callbacks
     */

    /**
     * 
     * @param {?SCOptions} options 
     */
    constructor(options) {
        this.unique_ = options?.unique ?? false;

        if (options?.callbacks) {
            this.callbacks_.add(...options?.callbacks);
        }
    }



    /**
     * 
     * @param {TCB} cb 
     * @returns {Boolean}
     */
    add(cb) {
        if (this.unique_) {
            const idx = this.callbacks_.indexOf(cb);

            if (idx >= 0)
                return false;
        }

        this.#preserveSafe_();
        this.callbacks_.push(cb);

        return true;
    }
    
    /**
     * 
     * @param {TCB} cb 
     * @returns {Boolean}
     */
    remove(cb) {
        const idx = this.callbacks_.indexOf(cb);

        if (idx < 0)
            return false;

        this.#preserveSafe_();
        this.callbacks_.splice(idx, 1);

        return true;
    }

    #preserveSafe_() {
        if (this.callbacksSafe_ == null)
            return;

        if (this.callbacksSafe_ !== this.callbacks_)
            return;

        this.callbacksSafe_ = [... this.callbacks_];
    }

    beginInvoke() {
        this.exAggr_.clear();
        this.callbacksSafe_ = this.callbacks_;
    }
    endInvoke() {
        this.callbacksSafe_ = null;
        this.exAggr_.rethrow();
    }

    invoke(... args) {
        this.beginInvoke();

        for (let idx = 0; idx < this.callbacksSafe_.length; idx++) {
            const cb = this.callbacksSafe_[idx];
            
            try { cb(... args); }
            catch (ex) { this.exAggr_.add(ex); }
        }

        this.endInvoke();
    }
}