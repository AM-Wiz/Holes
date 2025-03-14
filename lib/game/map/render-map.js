
import { UI16V } from "../../math/vecmath.js";

import { TrnMap, TrnMapChunk, TrnCoord, getTileRowIdx } from "./trnmap.js";
import { TrnPalette } from "./trn-tile.js";

import { Camera } from "../camera.js";

import { getScreenRowIndex, getScreenSize, ScreenWriter } from "../../screen/screen.js";
import { Color } from "../../screen/color.js";


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
    curCBegin_ = TrnCoord.from([0, 0]);
    
    /** @type {TrnCoord} */
    curCEnd_ = TrnCoord.from([0, 0]);
    
    /** @type {TrnCoord} */
    curCCoord_ = TrnCoord.from([0, 0]);
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


const grayGradient = [Color.black, Color.black, Color.darkGrey, Color.grey, Color.lightGrey, Color.white, Color.white];

const getGrey = (height) => {
    let greyCoord = (height + 1) / 2;
    greyCoord = Math.trunc(greyCoord * grayGradient.length);
    greyCoord = Math.max(0, Math.min(grayGradient.length - 1, greyCoord));

    return grayGradient[greyCoord];
}

/**
 * @param {MapRenderer} mr
 * @param {TrnMapChunk} chunk 
 */
const renderMapChunk_ = (mr, chunk) => {
    mr.curChunk_ = chunk;

    mr.writer_.symbol = '%';
    
    for (let y = 0; y < TrnMapChunk.width; y++) {
        const ttrIdx = getTileRowIdx(y);
        const srIdx = getScreenRowIndex(y);

        for (let x = 0; x < TrnMapChunk.width; x++) {
            const h = mr.curChunk_.getNormHeight(ttrIdx + x);

            mr.writer_.color = getGrey(h);
    
            mr.writer_.zNorm = h * mr.topDepth_ + (1 - h) * mr.bottomDepth_;
    
            mr.writer_.writeAt(srIdx + x);
        }
    }
}


/**
 * @param {MapRenderer} map
 */
const renderMapWhole_ = (mr) => {
    throw new Error("Not implemented");
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
        renderMapChunk_(mr, map);
    } else if (map instanceof TrnMap) {
        initRenderer_(mr, map, options?.palette, camera, options?.viewOrigin);
        renderMapWhole_(mr);
    } else {
        throw new Error("Input was not a map");
    }
};