import { ExAggr } from "../../utility/exaggr.js";


export class Event
{
    behaviors_ = [];


    /**
     * Broadcast the event to it's behaviors
     * @param {?any} arg The optional argument to the event
     */
    onEvent(arg) {
        this.onEventBehaviors(arg);
    }


    /**
     * Broadcasts the event to it's behaviors.
     * May be overridden to customize broadcast behavior.
     * @param {?any} arg The optional argument ot the event
     */
    onEventBehaviors(arg) {
        const exs = new ExAggr();

        for (let i = 0; i < this.behaviors_.length; i++) {
            const b = this.behaviors_[i];
            
            try { b.onEvent(this, arg); }
            catch (ex) { exs.add(ex); }
        }

        exs.rethrow();
    }


    addBehavior(behavior) {
        const idx = this.behaviors_.indexOf(behavior);
        if (!(idx <= -1))
            return;

        this.behaviors_.push(behavior);
    }
    
    removeBehavior(behavior) {
        const idx = this.behaviors_.indexOf(behavior);
        if (!(idx >= 0))
            return;

        this.behaviors_.splice(idx, 1);
    }
}


export class BhvrDep
{
    static before = false;
    static after = true;

    /** @type {Behavior} */
    to;
    /** @type {before|after} */
    relation;

    /**
     * 
     * @param {Behavior} to 
     * @param {before|after} relation 
     */
    constructor(to, relation) {
        this.to = to;
        this.relation = relation;
    }
};

export class Behavior
{
    /** @type {BhvrDep[]} */
    deps_ = [];

    /** @type {BhvrDep[]} */
    get deps() { return this.deps_; }
    /** @type {BhvrDep[]} */
    set deps(value) {
        // TODO filter for unique
        this.deps_ = value;
    }

    /**
     * 
     * @param {Event} event The event which was triggered
     * @param {?any} arg The optional argument ot the event
     */
    onEvent(event, arg) {

    }
};


/**
 * @callback MakeBhvrCallback
 * @param {Event} event
 * @param {?any} arg
 */

/**
 * @typedef MakeBhvrArgs
 * @property {?String} name
 * @property {MakeBhvrCallback} func
 * @property {?Event[]} events
 * @property {?BhvrDep[]} deps
 */

/**
 * Make a behavior from a set of options
 * @param {MakeBhvrArgs} options 
 * @returns {Behavior}
 */
export const MakeBhvr = (options) => {
    const bhvr = new class CustomBhvr extends Behavior
    {
        name = options.name;
        func_ = options.func;

        onEvent(event, arg) {
            this.func_(event, arg);
        }
    };

    if (options.deps) {
        bhvr.deps = [... options.deps];
    }

    if (options.events) {
        options.events.forEach(e => e.addBehavior(bhvr));
    }

    return bhvr;
};