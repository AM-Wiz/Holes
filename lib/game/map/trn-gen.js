import { createNoise2D } from "simplex-noise";
import { TrnMap, TrnMapChunk } from "./trnmap.js";

import Alea from "alea";


export class TrnNoiseChannel
{
    /** @type {import("simplex-noise").NoiseFunction2D} */
    noise_ = createNoise2D();

    /**
     * @param {?String} seed 
     */
    constructor(seed) {
        const al = seed ? new Alea(seed) : new Alea();
        this.noise_ = createNoise2D(al);
    }
    
    at(x, y) {
        return this.noise_(x, y);
    }
};


/**
 * 
 * @param {TrnMap|TrnMapChunk} map 
 * @param {TrnNoiseChannel} channel 
 */
export const randomHeight = (map, channel) => {
    const applyChunk = (chunk) => {
        const offX = map.totalCoord[0], offY = map.totalCoord[1];

        for (let y = 0; y < TrnMapChunk.width; y++)
        for (let x = 0; x < TrnMapChunk.width; x++) {
            const h = channel.at(offX + x, offY + y);
            
            chunk.setNormHeight([x, y], h);
        }
    }

    if (map instanceof TrnMapChunk) {
        applyChunk(map);
    } else {
        for (let y = 0; y < map.dim[1]; y++)
        for (let x = 0; x < map.dim[0]; x++) {
            const c = map.ensureChunk([x, y]);

            applyChunk(c);
        }
    }
}