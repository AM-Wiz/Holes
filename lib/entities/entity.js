import assert from "node:assert";
import { FFZ } from "../math/bittricks.js";


const EntId = Number;


class EntTable
{
    /** @type {EntAspect[]} */
    aspects_ = [];

    liveTable_ = new Uint32Array(10);

    prevAllocIdx_ = 0;

    constructor() {

    }

    #grow() {
        // TODO grow
        throw new Error("Not implemented");
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
        
        // TODO send messages? Events?

        return id;
    }


    /**
     * Check if `id` is live
     * @param {EntId} id 
     */
    isLive(id) {
        const widx = id >>> 0x5;
        const bidx = id & 0x1f;

        const bit = (1 << bidx);

        return (this.liveTable_[widx] & bit) == bit;
    }


    /**
     * 
     * @param {EntAspectId} id 
     * @returns {EntAspect}
     */
    getAspect(id) {
        return this.aspects_[id];
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

    constructor() {
        this.aspectId_ = this.constructor.typeAspectId;
    }

    get aspectId() { return this.aspectId_; }





    static #aspectTypes_ = [null];
    
    static #nextId = 1;

    /**
     * @param {EntAspectType} aspectType
     * @param {Object} options
     */
    static register(aspectType, options) {
        assert.ok(aspectType.prototype instanceof EntAspect);
        assert.ok(aspectType.typeAspectId == undefined);

        aspectType.typeAspectId = EntAspect.#nextId++;

        assert.ok(aspectType.typeAspectId == this.#aspectTypes_.length);

        this.#aspectTypes_.push(aspectType);
    }

    /** @type {ReadonlyArray<EntAspectType>} */
    static get aspectTypes() { return this.#aspectTypes_; }
}




export {
    EntTable,
    EntAspect,
    EntId,
    EntAspectId,
};