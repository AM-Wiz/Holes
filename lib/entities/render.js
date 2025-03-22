import { I16V } from "../math/vecmath.js";
import { Sprite } from "../screen/sprite.js";
import { EntAspect, EntId } from "./entity.js";
import { EntTransforms } from "./transform.js";

import assert from "node:assert";

class EntSprite
{
    /** @type {Sprite} */
    sprite_;

    get dim() { return this.sprite_.dim; }
    get sprite() { return this.sprite_; }
};


class EntRender extends EntAspect
{
    /** @type {(?EntSprite)[]} */
    sprites_ = [];

    
    #ensureCap(id) {
        if (id < this.sprites_.length)
            return;

        while (array.length <= id) {
            this.sprites_.push(null);
        }
    }

    
    /**
     * @param {EntId} id
     * @returns {EntSprite}
     */
    getSprite(id) {
        const p = this.positions_[id];

        return p?.clone(result);
    }

    setSprite(id, value) {
        this.#ensureCap(id);
        
        assert.ok(value == null || value instanceof EntSprite);

        this.sprites_[id] = value;
    }
}

EntAspect.register(EntRender);

export {
    EntSprite,
    EntRender,
}