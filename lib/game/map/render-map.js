import { TrnMap, TrnMapChunk, TrnCoord, getTileRowIdx } from "./trnmap.js";
import { TrnPalette } from "./trn-tile.js";

import { Camera } from "../camera.js";

import { getScreenRowIndex, getScreenSize, ScreenWriter } from "../../screen/screen.js";
import { Color } from "../../screen/color.js";

import assert from "node:assert";


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
     * @type {TrnCoord}
     */
    viewOff_ = TrnCoord.from([0, 0]);


    /** @type {?TrnMapChunk} */
    curChunk_;

    /** @type {TrnCoord} */
    curChunkCoord_ = TrnCoord.from([0, 0]);
};


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
    mr.viewSize_.copyFrom(getScreenSize());
    mr.viewOff_.fill(0);
}


const greyGradient = [Color.black, Color.black, Color.darkGrey, Color.grey, Color.lightGrey, Color.white, Color.white];

const getGrey = (height) => {
    let greyCoord = (height + 1) / 2;
    greyCoord = Math.trunc(greyCoord * greyGradient.length);
    greyCoord = Math.max(0, Math.min(greyGradient.length - 1, greyCoord));

    assert.ok(greyCoord >= 0 && greyCoord < greyGradient.length);
    return greyGradient[greyCoord];
}


/**
 * @typedef CCCoords
 * @property {Boolean} any
 * @property {Number} vxOff
 * @property {Number} vyOff
 * @property {Number} xStart
 * @property {Number} xEnd
 * @property {Number} yStart
 * @property {Number} yEnd
 */


/**
 * @param {MapRenderer} mr
 * @param {Object} result
 * @returns {CCCoords}
 */
const clipChunkCoords_ = (mr, result) => {
    let [bcxb, bcyb] = mr.curChunkCoord_;
    bcxb *= TrnMapChunk.width, bcyb *= TrnMapChunk.width;
    let [bcxe, bcye] = [bcxb + TrnMapChunk.width, bcyb + TrnMapChunk.width];

    const [vxb, vyb] = mr.viewOff_;
    const [vxe, vye] = mr.viewSize_; // TODO

    let [txb, tyb] = [bcxb, bcyb];
    let [txe, tye] = [bcxe, bcye];

    txb = Math.max(txb, vxb), txe = Math.min(txe, vxe);
    tyb = Math.max(tyb, vyb), tye = Math.min(tye, vye);
    
    result.any = (txb < txe && tyb < tye);
    if (!result.any) {
        return result;
    }

    result.vxOff = txb, result.vyOff = tyb;

    result.xStart = txb - bcxb;
    result.xEnd = txe - bcxb;
    
    result.yStart = tyb - bcyb;
    result.yEnd = tye - bcyb;

    return result;
}

/**
 * @param {MapRenderer} mr
 * @param {TrnMapChunk} chunk 
 * @param {*} chunkCoord
 */
const renderMapChunk_ = (mr, chunk, chunkCoord) => {
    mr.curChunk_ = chunk;
    if (chunkCoord)
        mr.curChunkCoord_.copyFrom(chunkCoord);
    else
        mr.curChunkCoord_.fill(0);

    const cc = clipChunkCoords_(mr, {});

    if (!cc.any)
        return;

    mr.writer_.symbol = '%';
    
    const {xStart, xEnd, yStart, yEnd, vxOff, vyOff} = cc;
    for (let y = yStart; y < yEnd; y++) {
        const ttrIdx = getTileRowIdx(y);
        const srIdx = getScreenRowIndex(y + vyOff) + vxOff;

        assert.ok((vxOff + xEnd) < mr.writer_.size[0]);
        assert.ok((y + vyOff) < mr.writer_.size[1]);

        for (let x = xStart; x < xEnd; x++) {
            const h = mr.curChunk_.getNormHeight(ttrIdx + x);

            mr.writer_.color = getGrey(h);
    
            mr.writer_.zNorm = h * mr.topDepth_ + (1 - h) * mr.bottomDepth_;
    
            mr.writer_.writeAt(srIdx + x);
        }
    }
}


/**
 * @param {MapRenderer} mr
 */
const renderMapWhole_ = (mr) => {
    for (let cy = 0, cyEnd = mr.map_.dim[1]; cy < cyEnd; cy++) {
        for (let cx = 0, cxEnd = mr.map_.dim[0]; cx < cxEnd; cx++) {
            const c = mr.map_.getChunk([cx, cy]);
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
 * @param {Camera} camera The camera to render the map through
 * @param {RenderMapOptions} options 
 */
export const renderMap = (map, camera, options) => {
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