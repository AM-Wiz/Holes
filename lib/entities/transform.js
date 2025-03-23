import { I16V } from "../math/vecmath.js";
import { VCoordSteps } from "../world-coord.js";
import { EntAspect, EntId } from "./entity.js";



class EntTransforms extends EntAspect
{
    /** @type {I16V[]} */
    positions_ = [];
    /** @type {Int16Array} */
    heights_ = new Int16Array(1);

    #ensureCap(id) {
        if (id < this.positions_.length)
            return;

        while (array.length <= id) {
            this.positions_.push(new I16V([0, 0]));
        }
    }

    /**
     * @param {EntId} id
     * @param {?I16V} result 
     * @returns {I16V}
     */
    getPos(id, result) {
        const p = this.positions_[id];

        if (p != null)
            return p?.clone(result);
        else if (result != null)
            return result.fill(0);
        else
            return new I16V([0, 0]);
    }

    setPos(id, value) {
        this.#ensureCap(id);
        
        let p = this.positions_[id];
        
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
        
        this.heights_ = EntTransforms.#getIntHeight(value);
    }
}

EntAspect.register(EntTransforms);




export {
    EntTransforms,
}