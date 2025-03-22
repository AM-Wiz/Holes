import { I16V } from "../math/vecmath.js";
import { EntAspect, EntId } from "./entity.js";



class EntTransforms extends EntAspect
{
    /** @type {I16V[]} */
    positions_ = [];

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

        return p?.clone(result);
    }

    setPos(id, value) {
        this.#ensureCap(id);
        
        let p = this.positions_[id];
        
        p.copyFrom(value);
    }
}

EntAspect.register(EntTransforms);




export {
    EntTransforms,
}