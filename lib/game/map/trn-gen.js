import { createNoise2D } from "simplex-noise";
import { TrnMap, TrnMapChunk } from "./trnmap.js";

import Alea from "alea";


export class TrnNoiseChannel
{
    /** @type {import("simplex-noise").NoiseFunction2D} */
    noise_;

    scale_; 

    /**
     * @typedef TNCOptions
     * @property {?String} seed
     * @property {?Number} scale
     */


    /**
     * @param {?TNCOptions} options
     */
    constructor(options) {
        const al = options?.seed ? new Alea(options?.seed) : new Alea();
        this.noise_ = createNoise2D(al);
        this.scale_ = options?.scale ?? 1;
    }
    
    at(x, y) {
        return this.noise_(x * this.scale_, y * this.scale_);
    }
};


/**
 * 
 * @param {TrnMap|TrnMapChunk} map 
 * @param {TrnNoiseChannel} channel 
 */
export const randomHeight = (map, channel) => {
    const applyChunk = (chunk) => {
        const offX = chunk.totalCoord[0], offY = chunk.totalCoord[1];

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