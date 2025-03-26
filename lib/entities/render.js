import { I16V } from "../math/vecmath.js";
import { Sprite } from "../screen/sprite.js";
import { EntAspect, EntId } from "./entity.js";
import { EntTransforms } from "./transform.js";

import assert from "node:assert";

class EntSprite
{
    /** @type {Sprite} */
    sprite_;
    
    /** @type {Number} */
    height__ = 0;


    /**
     * @typedef Options
     * @property {?Sprite} sprite
     * @property {?Number} height
     */

    /**
     * 
     * @param {Options} options 
     */
    constructor(options) {
        if (options?.sprite != null)
            this.sprite_ = options.sprite;
        if (options?.height != null)
            this.height = options.height;
        
        assert.ok(this.sprite_ instanceof Sprite);
    }
    
    get dim() { return this.sprite_.dim; }
    
    /** @type {Number} */
    get height() { return this.height_; }
    set height(value) { this.height_ = value; }

    get sprite() { return this.sprite_; }
};


class EntRender extends EntAspect
{
    /** @type {(?EntSprite)[]} */
    sprites_ = [];

    
    #ensureCap(id) {
        if (id < this.sprites_.length)
            return;

        this.sprites_.push(... Array.from({length: id + 1 - this.sprites_.length}));
    }

    
    /**
     * @param {EntId} id
     * @returns {?EntSprite}
     */
    getSprite(id) {
        return this.sprites_[id] ?? null;
    }

    setSprite(id, value) {
        this.#ensureCap(id);
        
        assert.ok(value == null || value instanceof EntSprite);

        this.sprites_[id] = value;
    }
}

EntAspect.register(EntRender, {
    keyName: 'renderables',
    strongName: true,
});

export {
    EntSprite,
    EntRender,
}