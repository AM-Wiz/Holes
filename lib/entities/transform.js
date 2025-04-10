import { F32V, I16V } from "../math/vecmath.js";
import { VCoordSteps } from "../world-coord.js";
import { EntAspect, EntId } from "./entity.js";



class EntTransforms extends EntAspect
{
    /** @type {?I16V[]} */
    positions_ = [];
    /** @type {Int16Array} */
    heights_ = new Int16Array(1);

    #ensureCap(id) {
        if (id < this.positions_.length)
            return;

        const newCap = id + 1;


        this.positions_.push(... Array.from({length: newCap - this.positions_.length}));
        const nh = new Int16Array(newCap);
        nh.set(nh);
        this.heights_ = nh;
    }


    static heightQuanta = 1 / VCoordSteps;


    /**
     * @param {EntId} id 
     * @param {F32V} result 
     * @returns {F32V}
     */
    get(id, result) {
        result ??= new F32V(3);

        const p = this.positions_[id];

        if (p != null)
            result.set(p, 0);
        else
            result.fill(0, 0, 2);

        result[2] = this.getHeight(id);
        
        return result;
    }
    
    /**
     * @param {EntId} id 
     * @param {F32V} value
     */
    set(id, value) {
        this.#ensureCap(id);
        
        let p = this.positions_[id];
        if (p == null)
            p = this.positions_[id] = new I16V([0, 0]);
        
        p.copyFrom(value);

        this.heights_[id] = EntTransforms.#getIntHeight(value[2]);
    }

    /**
     * @param {EntId} id
     * @param {?I16V} result 
     * @returns {I16V}
     */
    getTile(id, result) {
        result ??= new I16V(2);

        const p = this.positions_[id];
        
        if (p != null)
            result.set(p, 0);
        else
            result.fill(0, 0, 2);

        return result;
    }

    setTile(id, value) {
        this.#ensureCap(id);
        
        let p = this.positions_[id];
        if (p == null)
            p = this.positions_[id] = new I16V([0, 0]);
        
        p.copyFrom(value);
    }
    
    static #getNormHeight(uintHeight) {
        return uintHeight / VCoordSteps;
    }
    
    static #getIntHeight(normHeight) {
        return Math.trunc(normHeight * VCoordSteps);
    }
    
    
    getHeight(id) {
        const p = this.heights_[id];

        return EntTransforms.#getNormHeight(p ?? 0);
    }

    setHeight(id, value) {
        this.#ensureCap(id);
        
        this.heights_[id] = EntTransforms.#getIntHeight(value);
    }
}

EntAspect.register(EntTransforms, {
    keyName: 'transforms',
    strongName: true,
});




export {
    EntTransforms,
}