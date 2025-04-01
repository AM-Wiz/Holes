import { I16V } from "../math/vecmath.js";
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
     * @param {?I16V} result 
     * @returns {I16V}
     */
    getPos(id, result) {
        const p = this.positions_[id];

        if (p != null)
            return p.clone(result);
        else if (result != null)
            return result.fill(0);
        else
            return new I16V([0, 0]);
    }

    setPos(id, value) {
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