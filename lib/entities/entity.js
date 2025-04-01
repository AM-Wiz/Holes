import assert from "node:assert";
import { FFZ } from "../math/bittricks.js";


const EntId = Number;


class EntTable
{
    /** @type {EntAspect[]} */
    aspects_ = [];

    liveTable_ = new Uint32Array(10);

    prevAllocIdx_ = 0;
    maxEntityId_ = 0;


    /**
     * @typedef Options
     * @property {?Boolean} allAspects
     * @property {?ArrayLike<EntAspect|EntAspectType>} aspects
     */
    
    /**
     * @param {?Options} options 
     */
    constructor(options) {
        if (options?.aspects != null) {
            for (const a of options.aspects)
                this.registerAspect(a);
        }

        if (options?.allAspects) {
            for (const a of EntAspect.aspectTypes) {
                if (this.getAspect(a.typeAspectId) != null)
                    continue;

                this.registerAspect(a);
            }
        }
    }


    get maxEntityId() { return this.maxEntityId_; }


    #grow() {
        const nlt = new Uint32Array(this.liveTable_.length * 2);
        nlt.set(this.liveTable_);
        this.liveTable_ = nlt;
    }

    #findNewEntityIdBetween(wStart, wEnd) {
        for (let wIdx = wStart; wIdx < wEnd; wIdx++) {
            const word = this.liveTable_[wIdx];
            
            // Word is full, skip it
            if (word === 0xffff_ffff)
                continue;
            
            // Find the first zero bit
            const bIdx = FFZ(word);

            assert.ok((word & (1 << bIdx)) == 0);

            // Update prevAllocIdx to speed up future searches
            this.prevAllocIdx_ = wIdx;
            return wIdx << 0x5 | bIdx;
        }

        return null;
    }

    #findNewEntityId() {
         // Search after previous successful alloc (presumably free space will be near end of table)
        const pIdx = this.prevAllocIdx_;
        let nId = this.#findNewEntityIdBetween(pIdx, this.liveTable_.length);
        if (nId != null)
            return nId;

         // Search before previous successful alloc (just in case new holes have appeared)
        nId = this.#findNewEntityIdBetween(0, pIdx);
        if (nId != null)
            return nId;

        const endIdx = this.liveTable_.length;

        this.#grow();
        
         // Search newly allocated space (guaranteed to find a free spot)
        nId = this.#findNewEntityIdBetween(endIdx, this.liveTable_.length);

        assert.ok(nId != null);

        return nId;
    }

    /**
     * Allocate a new entity
     * @returns {EntityId} The id of the new entity
     */
    newEntity() {
        const id = this.#findNewEntityId();
        
        this.liveTable_[id >> 0x5] |= (1 << (id & 0x1f)) >>> 0;

        this.maxEntityId_ = Math.max(id, this.maxEntityId_);

        // TODO send messages? Events?

        return id;
    }


    /**
     * Check if `id` is live
     * @param {EntId} id 
     */
    isLive(id) {
        const bit = 1 << (id & 0x1f);

        return (this.liveTable_[id >>> 0x5] & bit) == bit;
    }


    #ensureAspectTable(id) {
        if (id < this.aspects_.length)
            return;

        this.aspects_.push(... Array.from({length: id - this.aspects_.length}));
    }

    /**
     * 
     * @param {EntAspectId|EntAspectType} id 
     * @returns {EntAspect}
     */
    getAspect(id) {
        if (id.typeAspectId != null)
            id = id.typeAspectId;

        return this.aspects_[id];
    }

    /**
     * 
     * @param {EntAspect|EntAspectType} aspect 
     */
    registerAspect(aspect) {
        let id;
        let type; // Resolve the aspect
        if (aspect instanceof Function && aspect.typeAspectId != null)
            [type, aspect, id] = [aspect, new aspect(), aspect.typeAspectId];
        else if (aspect instanceof EntAspect)
            [type, id] = [aspect.constructor, aspect.aspectId];

        if (aspect.table_ == this)
            return aspect;

        assert.ok(aspect.table_ == null);
        assert.ok(this.aspects_[id] == null);

        this.#ensureAspectTable(id);
        aspect.table_ = this;
        this.aspects_[id] = aspect;

        if (type.typeAspectStrongName)
            this[type.typeAspectStrongName] = aspect;

        return aspect;
    }
}


const EntAspectId = Number;

/**
 * @typedef {Function} EntAspectType
 */

class EntAspect
{
    /** @type {EntAspectId} */
    aspectId_;

    /** @type {EntTable} */
    table_;

    constructor() {
        this.aspectId_ = this.constructor.typeAspectId;
        assert.ok(this.aspectId_ != null);
    }

    get aspectId() { return this.aspectId_; }

    get table() { return this.table_; }



    /** @type {EntAspectType[]} */
    static #aspectTypes_ = [null];
    /** @type {Map<String, Number>} */
    static #aspectTypeMap_ = new Map();
    
    static #nextId = 1;


    /**
     * @typedef RegOptions
     * @property {?String} keyName
     * @property {?Boolean} strongName
     */

    /**
     * @param {EntAspectType} aspectType
     * @param {?RegOptions} options
     */
    static register(aspectType, options) {
        assert.ok(aspectType.prototype instanceof EntAspect);
        assert.ok(aspectType.typeAspectId == undefined);

        aspectType.typeAspectId = EntAspect.#nextId++;
        aspectType.typeAspectName = options?.keyName;
        aspectType.typeAspectStrongName = options?.strongName ? aspectType.typeAspectName : null;

        if (aspectType.typeAspectName != null)
            this.#aspectTypeMap_.set(aspectType.typeAspectName, aspectType.typeAspectId);

        assert.ok(aspectType.typeAspectId == this.#aspectTypes_.length);

        this.#aspectTypes_.push(aspectType);
    }

    /** @type {ReadonlyArray<EntAspectType>} */
    static get aspectTypes() { return this.#aspectTypes_; }

    static findAspect(aspect) {
        return this.#aspectTypeMap_.get(aspect);
    }
}




export {
    EntTable,
    EntAspect,
    EntId,
    EntAspectId,
};