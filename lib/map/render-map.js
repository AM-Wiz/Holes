import { TrnMap, TrnMapChunk, TrnCoord, getTileRowIdx } from "./trnmap.js";
import { TrnPalette, TrnTile } from "./trn-tile.js";

import { Camera } from "../camera.js";

import { ScreenBuffer } from "../screen/screen.js";
import ScreenWriter from "../screen/screen-writer.js"
import { clipView, ClipRect } from "../screen/clip.js";
import { CColor } from "../screen/color.js";

import assert from "node:assert";
import { I16V } from "../math/vecmath.js";


class MapRenderer
{
    writer_ = new ScreenWriter({
        zTestEnabled: true,
        zWriteEnabled: true,
    });

    topDepth_ = 0;
    bottomDepth_ = 0.5;
    
    /** @type {Camera} */
    camera_;

    /** @type {?TrnMap} */
    map_;
    
    /** @type {?TrnPalette} */
    palette_;

    /**
     * The size of view-space
     * @type {TrnCoord}
     */
    viewSize_ = TrnCoord.from([0, 0]);

    /**
     * The origin of view-space
     * @type {I16V}
     */
    viewOff_ = I16V.from([0, 0]);


    /** @type {?TrnMapChunk} */
    curChunk_;

    /** @type {TrnCoord} */
    curChunkCoord_ = TrnCoord.from([0, 0]);


    clipScratch_ = new ClipRect();


    get buffer() { return this.writer_.buffer; }
    set buffer(value) { this.writer_.buffer = value; }


    /**
     * @callback TileResolverFunc
     * @param {Number} id,
     * @param {Number} brightness,
     */

    /** @type {TileResolverFunc} */
    tileResolverFunc_ = function() { assert.fail(); };
};


/**
 * 
 * @param {MapRenderer} mr 
 * @param {ScreenBuffer} buffer 
 */
const initScreen_ = (mr, buffer) => {
    mr.buffer = buffer;
}

/**
 * 
 * @param {MapRenderer} mr 
 * @param {?TrnMap} map 
 * @param {?TrnPalette} palette
 * @param {Camera} camera 
 * @param {?TrnCoord} viewOff 
 */
const initRenderer_ = (mr, map, palette, camera, viewOff) => {
    mr.map_ = map;
    mr.palette_ = palette ?? map?.palette;
    mr.camera_ = camera;
    mr.viewSize_.copyFrom(mr.buffer.dim); // TODO
    mr.viewOff_.fill(0);
    if (camera)
        mr.viewOff_.sub(camera.center, mr.viewOff_);
    if (viewOff)
        mr.viewOff_.sub(viewOff, mr.viewOff_);

    if (mr.palette_ != null) {
        mr.tileResolverFunc_ = function (tIdx, br) {
            this.writer_.color = this.palette_.getColor(tIdx, br);
            
            this.writer_.symbol = this.palette_.getSymbol(tIdx);
        };
    } else {
        mr.tileResolverFunc_ = function (tIdx, br) {
            mr.writer_.color = getGrey(br);
            
            mr.writer_.symbol = '%';
        };
    }
}


const greyGradient = [CColor.black, CColor.blackBright, CColor.blackBright, CColor.white, CColor.white, CColor.whiteBright, CColor.whiteBright];

const getGrey = (height) => {
    let greyCoord = (height + 1) / 2;
    greyCoord = Math.trunc(greyCoord * greyGradient.length);
    greyCoord = Math.max(0, Math.min(greyGradient.length - 1, greyCoord));

    assert.ok(greyCoord >= 0 && greyCoord < greyGradient.length);
    return greyGradient[greyCoord];
}


/**
 * @param {MapRenderer} mr
 * @returns {ClipRect}
 */
const clipChunkCoords_ = (mr) => {
    const cs = new I16V(mr.curChunkCoord_); // TODO optimize
    cs.mul(TrnMapChunk.width, cs);
    const ce = cs.add(TrnMapChunk.width);

    return clipView(cs, ce, mr.viewOff_, mr.viewSize_, mr.clipScratch_);
}


/**
 * @param {MapRenderer} mr
 * @returns {ClipRect}
 */
const clipMapCoords_ = (mr) => {
    const cs = new I16V([0, 0]);
    const ce = mr.map_.dim.mul(TrnMapChunk.width);

    const result = clipView(cs, ce, mr.viewOff_, mr.viewSize_, mr.clipScratch_);
    if (!result.any)
        return result;
    
    result.ixS = Math.trunc(result.ixS / TrnMapChunk.width), result.ixE = Math.trunc(result.ixE / TrnMapChunk.width);
    result.ixE += 1;
    
    result.iyS = Math.trunc(result.iyS / TrnMapChunk.width), result.iyE = Math.trunc(result.iyE / TrnMapChunk.width);
    result.iyE += 1;

    return result;
}

/**
 * @param {MapRenderer} mr
 * @param {TrnMapChunk} chunk 
 * @param {?I16V} chunkCoord
 */
const renderMapChunk_ = (mr, chunk, chunkCoord) => {
    mr.curChunk_ = chunk;
    if (chunkCoord)
        mr.curChunkCoord_.copyFrom(chunkCoord);
    else
        mr.curChunkCoord_.fill(0);

    const cc = clipChunkCoords_(mr);
    if (!cc.any)
        return;
    
    const {ixS: xStart, ixE: xEnd, iyS: yStart, iyE: yEnd, vxS: vxOff, vyS: vyOff} = cc;
    for (let y = yStart; y < yEnd; y++) {
        const ttrIdx = getTileRowIdx(y);
        const srIdx = mr.buffer.rowIndex(y + vyOff) + vxOff;

        assert.ok((vxOff + xEnd) <= mr.writer_.size[0]);
        assert.ok((y + vyOff) <= mr.writer_.size[1]);
        
        for (let x = xStart; x < xEnd; x++) {
            const h = mr.curChunk_.getHeight(ttrIdx + x);

            let nh = mr.camera_.getNormHeight(h);
            if (nh > 0 && nh < 1) {
                const tIdx = mr.curChunk_.getTileId(ttrIdx + x);

                const brdoff = 0.25;
                const br = 1 * nh + brdoff * (1 - nh);

                mr.tileResolverFunc_(tIdx, br);
            } else {
                nh = Math.min(1, Math.max(0, nh));

                mr.writer_.color = nh >= 1 ? CColor.cyanBright : CColor.blue;
                
                mr.writer_.symbol = nh >= 1 ? '˄' : '˅';
            }
            
            mr.writer_.zNorm = nh * mr.topDepth_ + (1 - nh) * mr.bottomDepth_;
            mr.writer_.writeAt(srIdx + x);
        }
    }
}


/**
 * @param {MapRenderer} mr
 */
const renderMapWhole_ = (mr) => {
    const cm = clipMapCoords_(mr, {});
    if (!cm.any)
        return;

    const {ixS: xStart, ixE: xEnd, iyS: yStart, iyE: yEnd} = cm;

    for (let cy = yStart; cy < yEnd; cy++) {
        for (let cx = xStart; cx < xEnd; cx++) {
            const c = mr.map_.getChunk(cx, cy);
            if (c == null)
                continue;

            renderMapChunk_(mr, c, c.mapCoord_);
        }
    }
}





const mr = new MapRenderer();

/**
 * @typedef RenderMapOptions
 * @property {?TrnPalette} palette The optional palette, if not supplied, the palette of the map will be used
 * @property {?TrnCoord} viewOrigin The optional view origin, if not supplied `[0, 0]` is assumed
 */

/**
 * Render the map to the screen
 * @param {TrnMap|TrnMapChunk} map The map to render
 * @param {ScreenBuffer} buffer The screen buffer to render to
 * @param {Camera} camera The camera to render the map through
 * @param {RenderMapOptions} options 
 */
export const renderMap = (map, buffer, camera, options) => {
    initScreen_(mr, buffer);
    if (map instanceof TrnMapChunk) {
        initRenderer_(mr, null, options?.palette, camera, options?.viewOrigin);
        renderMapChunk_(mr, map, null);
    } else if (map instanceof TrnMap) {
        initRenderer_(mr, map, options?.palette, camera, options?.viewOrigin);
        renderMapWhole_(mr);
    } else {
        throw new Error("Input was not a map");
    }
};