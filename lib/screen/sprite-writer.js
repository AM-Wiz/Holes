import { I16V, UI16V } from "../math/vecmath.js";
import { CColor } from "./color.js";

import { Sprite } from "./sprite.js";

import { ScreenBuffer } from "./screen.js";
import ScreenWriter from "./screen-writer.js";
import { ClipRect, clipView } from "./clip.js";

import assert from "node:assert";



class ScreenSpriteWriter
{
    /** @type {ScreenWriter} */
    writer_ = new ScreenWriter();

    /** @type {?Sprite} */
    sprite_ = null;
    /** @type {Number} */
    zLevel_ = 0;


    /**
     * @typedef Options
     * @property {?ScreenBuffer} buffer
     * @property {?Sprite} sprite
     * @property {?Number} zLevel
     * @property {?Boolean} zTestEnabled
     * @property {?Boolean} zWriteEnabled
     */

    /**
     * 
     * @param {?Options} options 
     */
    constructor(options) {
        if (options?.buffer != null)
            this.buffer = options?.buffer;
        if (options?.sprite != null)
            this.sprite = options.sprite;
        if (options?.zLevel != null)
            this.zLevel = options.zLevel;
        if (options?.zTestEnabled != null)
            this.zTestEnabled = options.zTestEnabled;
        if (options?.zWriteEnabled != null)
            this.zWriteEnabled = options.zWriteEnabled;
    }


    /** @type {ScreenBuffer} */
    get buffer() { return this.writer_.buffer; }
    set buffer(value) {
        this.writer_.buffer = value;
    }
    
    /** @type {Sprite} */
    get sprite() { return this.sprite_; }
    set sprite(value) {
        this.sprite_ = value;
    }

    /** @type {Number} */
    get zLevel() { return this.zLevel_; }
    set zLevel(value) {
        this.zLevel_ = value;
    }
    
    /**
     * When true, the writer should z-test tiles before writing them
     * @type {Boolean}
     */
    get zTestEnabled() { return this.writer_.zTestEnabled; }
    set zTestEnabled(value) { this.writer_.zTestEnabled = value; }

    /**
     * When true, the writer should write it's z-value,
     * otherwise the writer should not write any z-value
     * @type {Boolean}
     */
    get zWriteEnabled() { return this.writer_.zWriteEnabled; }
    set zWriteEnabled(value) { this.writer_.zWriteEnabled = value; }


    /** @type {ClipRect} */
    clipScratch_ = new ClipRect();

    /**
     * @param {Number} cx
     * @param {Number} cy
     * @returns {ClipRect} 
     */
    #clipSpriteCoords_ (cx, cy){
        return clipView([0, 0], this.sprite_.dim, [cx, cy], this.writer_.size, this.clipScratch_);
    }


    /**
     * 
     * @param {Number} x 
     * @param {Number} y 
     * @returns {Boolean}
     */
    write(x, y) {
        const cc = this.#clipSpriteCoords_(x, y);
        if (!cc.any)
            return false;
        
        this.writer_.zNorm = this.zLevel_;
        
        this.writer_.color = this.sprite_.color ?? CColor.white;

        const {ixS: xStart, ixE: xEnd, iyS: yStart, iyE: yEnd, vxS: vxOff, vyS: vyOff} = cc;
        for (let y = yStart; y < yEnd; y++) {
            const ttrIdx = this.sprite.getTileRowIdx(y);
            const srIdx = this.buffer.rowIndex(y + vyOff) + vxOff;

            assert.ok((vxOff + xEnd) <= this.writer_.size[0]);
            assert.ok((y + vyOff) <= this.writer_.size[1]);
            
            for (let x = xStart; x < xEnd; x++) {
                const sym = this.sprite.getSymbol(ttrIdx + x);
                if (sym == 0)
                    continue;

                this.writer_.symbol = sym;

                this.writer_.writeAt(srIdx + x);
            }
        }

        return true;
    }
}


export default ScreenSpriteWriter;


export {
    ScreenSpriteWriter,
};