
import { I16V } from "../../math/vecmath.js";
import { EntAspect, EntId } from "./entity.js";






class EntTransforms extends EntAspect
{
    /** @type {I16V[]} */
    positions_ = [];


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
        if (this.positions_.length < id - 1)
            throw new Error("Not implemented"); // TODO grow

        let p = this.positions_[id];
        if (p == null)
            p = this.positions_[id] = new I16V([0, 0]);

        p.copyFrom(value);
    }
}

EntAspect.register(EntTransforms);



