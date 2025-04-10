import { EntTable } from "./entity.js";
import { EntRender } from "./render.js";
import { EntTransforms } from "./transform.js";

import ScreenSpriteWriter from "../screen/sprite-writer.js";
import { ScreenBuffer } from "../screen/screen.js";
import { Camera } from "../camera.js";



class EntSpriteRenderer
{
    /** @type {ScreenSpriteWriter} */
    writer_ = new ScreenSpriteWriter({
        zTestEnabled: true,
        zWriteEnabled: true,
    });

    /** @type {Camera} */
    camera_;

    /** @type {EntTable} */
    entities_;

    /** @type {EntTransforms} */
    transforms_;
    
    /** @type {EntRender} */
    renderables_;

    topDepth_ = 0;
    bottomDepth_ = 0.5;


    /**
     * @typedef Options
     * @property {ScreenBuffer} buffer
     * @property {Camera} camera
     * @property {EntTable} entities
     */

    /**
     * 
     * @param {?Options} options
     */
    constructor(options) {
        if (options?.buffer)
            this.buffer = options.buffer;
        if (options?.camera)
            this.camera = options.camera;
        if (options?.entities)
            this.entities = options.entities;
    }

    get camera() { return this.camera_; }
    set camera(value) { this.camera_ = value; }

    get buffer() { return this.writer_.buffer; }
    set buffer(value) { this.writer_.buffer = value; }


    get entities() { return this.entities_; }
    set entities(value) {
        this.entities_ = value;
        this.transforms_ = this.entities_.getAspect(EntTransforms);
        this.renderables_ = this.entities_.getAspect(EntRender);
    }


    draw() {
        const [camx, camy] = this.camera.center;

        for (let eid = 0; eid <= this.entities_.maxEntityId; eid++) {
            if (!this.entities_.isLive(eid))
                continue;
            
            const sprite = this.renderables_.getSprite(eid);
            if (sprite == null)
                continue;

            const h = this.transforms_.getHeight(eid) + sprite.height;
            const nh = this.camera_.getNormHeight(h);
            
            if (!(nh > 0 && nh < 1))
                continue;

            const pos = this.transforms_.getTile(eid);

            this.writer_.sprite = sprite.sprite;
            this.writer_.zLevel = nh * this.topDepth_ + (1 - nh) * this.bottomDepth_;

            this.writer_.write(pos[0] - camx, pos[1] - camy);
        }
    }
};



export {
    EntSpriteRenderer,
};

export default EntSpriteRenderer;