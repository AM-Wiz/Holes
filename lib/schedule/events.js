import assert from "node:assert";
import { ExAggr } from "../utility/exaggr.js";


export class Event
{
    /** @type {Behavior[]} */
    behaviors_ = [];

    /** @type {?Uint16Array} */
    behaviorOrderVers_ = null;
    /** @type {?Behavior[]} */
    orderedBhvrs_ = null;


    constructor() {
        
    }


    /**
     * Broadcast the event to it's behaviors
     * @param {?any} arg The optional argument to the event
     */
    post(arg) {
        this.onEvent(arg);
    }
    
    /**
     * Broadcast the event to it's behaviors
     * @param {?any} arg The optional argument to the event
     */
    queuePost(arg) {
        setImmediate(() => {
            this.onEvent(arg);
        });
    }

    /**
     * Broadcast the event to it's behaviors
     * @param {?any} arg The optional argument to the event
     */
    onEvent(arg) {
        this.onEventBehaviors(arg);
    }


    #sortBehaviors() {
        if (this.behaviorOrderVers_ != null) {
            let any = false;
            for (let i = 0; i < this.behaviors_.length; i++)
                any |= (this.behaviors_[i].depVer_ & 0xffff) != this.behaviorOrderVers_[i];

            if (!any)
                return this.orderedBhvrs_;
        }

        /** @type {Map<Behavior, Number>} */
        const map = new Map(this.behaviors_.map((a, i) => [a, i]));
        /** @type {{b:Behavior, c:Number, r:Number[]}[]} */
        const bs = this.behaviors_.map(a => {return {b:a, c:0, r:[]}});
        for (let idx = 0; idx < bs.length; idx++) {
            for (const dep of bs[idx].b.deps_) {
                const tidx = map.get(dep.to);
                if (tidx == undefined)
                    continue;

                if (dep.relation == BhvrDep.after)
                    bs[idx].c++, bs[tidx].r.push(idx);
                else
                    bs[tidx].c++, bs[idx].r.push(tidx);
            }
        }

        const q = [];
        for (let i = 0; i < bs.length; i++) {
            if (bs[i].c < 1)
                q.push(i);
        }
        
        const os = [];
        while (q.length > 0) {
            const i = q.pop();
            os.push(i);

            for (const depn of bs[i].r) {
                if (--bs[depn].c < 1) {
                    q.push(depn);
                }
            }
        }

        if (os.length != bs.length)
            throw new Error("Behavior order contained a loop");

        this.behaviorOrderVers_ = Uint16Array.from(this.behaviors_.map(a => (a.depVer_ & 0xffff)));
        this.orderedBhvrs_ = os.map(idx => this.behaviors_[idx]);

        return this.orderedBhvrs_;
    }

    #onBehaviorsDirty() {
        this.behaviorOrderVers_ = null;
        this.orderedBhvrs_ = null;
    }

    /**
     * Broadcasts the event to it's behaviors.
     * May be overridden to customize broadcast behavior.
     * @param {?any} arg The optional argument ot the event
     */
    onEventBehaviors(arg) {
        const exs = new ExAggr();

        const ordered = this.#sortBehaviors();
        for (const b of ordered) {
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
        this.#onBehaviorsDirty();
    }
    
    removeBehavior(behavior) {
        const idx = this.behaviors_.indexOf(behavior);
        if (!(idx >= 0))
            return;

        this.behaviors_.splice(idx, 1);
        this.#onBehaviorsDirty();
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
     * @param {?before|after} relation 
     */
    constructor(to, relation) {
        this.to = to;
        this.relation = relation ?? BhvrDep.after;
    }
};

export class Behavior
{
    /** @type {BhvrDep[]} */
    deps_ = [];
    /** @type {Number} */
    depVer_ = 0;

    /** @type {Boolean} */
    enabled_ = true;

    constructor() {
        
    }

    static #toDep(maybeDep) {
        if (maybeDep instanceof BhvrDep)
            return maybeDep;
        else if (maybeDep instanceof Behavior)
            return new BhvrDep(maybeDep, BhvrDep.after);
        else
            assert.fail();
    }

    /** @type {BhvrDep[]} */
    get deps() { return this.deps_; }
    /** @param {ArrayLike<BhvrDep|Behavior>} value */
    set deps(value) {
        // TODO filter for unique
        const ds = [];

        for (const dep of value)
            ds.push(Behavior.#toDep(dep));

        this.deps_ = ds;
        this.depVer_++;
    }

    /**
     * 
     * @param {BhvrDep|Behavior} dep 
     * @returns {Boolean}
     */
    addDep(dep) {
        dep = Behavior.#toDep(dep);
        
        let idx = this.deps_.findIndex((a) => a.to === dep.to);
        if (idx > -1) {
            const {relation: pRel} = this.deps_[idx];
            if (pRel !== dep.relation)
                throw new Error("Conflicting constraint");
            else
                return false;
        }

        this.deps_.push(dep);
        this.depVer_++;
        return true;
    }


    /** @type {Boolean} */
    get enabled() { return this.enabled_; }
    /** @type {Boolean} */
    set enabled(value) { this.enabled_ = value; }

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
 * @property {?Boolean} enabled
 * @property {?Object} state
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
        state = undefined;

        onEvent(event, arg) {
            this.func_(event, arg);
        }

        toString() {
            return `${this.name}`;
        }
    };

    if (options.deps != null)
        bhvr.deps = [... options.deps];

    if (options.enabled != null)
        bhvr.enabled = options.enabled;

    if (options.events != null)
        options.events.forEach(e => e.addBehavior(bhvr));

    if (options.state != null)
        bhvr.state = options.state;

    return bhvr;
};