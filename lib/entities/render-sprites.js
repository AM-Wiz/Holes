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
     * 
     * @param {ScreenBuffer} buffer 
     */
    constructor(buffer) {
        this.buffer = buffer;
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

        for (let eid = 0; eid < array.length; eid++) {
            if (!this.entities_.isLive(eid))
                return;

            const h = this.transforms_.getHeight(eid);
            const nh = this.camera_.getNormHeight(h);
            
            if (!(nh > 0 && nh < 1))
                continue;
            
            const sprite = this.renderables_.getSprite(eid);
            if (sprite == null)
                return;

            const pos = this.transforms_.getPos(eid);

            this.writer_.sprite_ = sprite.sprite;
            this.writer_.zLevel = nh * this.topDepth_ + (1 - nh) * this.bottomDepth_;

            this.writer_.write(camx - pos[0], camy - pos[1]);
        }
    }
};



export {
    EntSpriteRenderer,
};

export default EntSpriteRenderer;