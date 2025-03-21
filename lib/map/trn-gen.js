import { createNoise2D } from "simplex-noise";
import { TrnMap, TrnMapChunk } from "./trnmap.js";

import Alea from "alea";

import assert from "node:assert";


const randomSeedGen_ = new Alea()

export const randomSeed = () => {
    const seed = randomSeedGen_.next();
    return `${seed}`;
}


export class TrnChannel
{

}

export class TrnNoiseChannel extends TrnChannel
{
    /** @type {import("simplex-noise").NoiseFunction2D} */
    noise_;

    /** @type {Number} */
    scale_; 

    /**
     * @typedef TNCOptions
     * @property {?String} channelSeed
     * @property {?String} worldSeed
     * @property {?Number} scale
     */


    /**
     * @param {?TNCOptions} options
     */
    constructor(options) {
        super();

        let seed;
        if (options?.channelSeed != null)
            seed = options.channelSeed;
        else
            seed = randomSeed();

        if (options?.worldSeed != null)
            seed += options.worldSeed;

        const al = seed ? new Alea(seed) : new Alea();
        this.noise_ = createNoise2D(al);
        this.scale_ = options?.scale ?? 1;
    }
    
    at(x, y) {
        const n = this.noise_(x * this.scale_, y * this.scale_);
        
        return (n + 1) / 2;
    }
}


export class TrnCombineChannel extends TrnChannel
{
    static Modes = {
        avg: 'avg',
        add: 'add',
        sub: 'sub',
        mul: 'mul',
        div: 'div',
    };

    constructor(mode, channels, options) {
        super();
        this.channels_ = channels;
        this.mode_ = mode;
    }


    /** @type {TrnChannel[]} */
    channels_;

    /** @type {Modes} */
    mode_;

    at(x, y) {
        let result = this.channels_[0].at(x, y);
        switch (this.mode_) {
        case 'avg':
            for (let idx = 1; idx < this.channels_.length; idx++)
                result += this.channels_[idx].at(x, y);
            result /= this.channels_.length;
            break;
        case 'add':
            for (let idx = 1; idx < this.channels_.length; idx++)
                result += this.channels_[idx].at(x, y);
            break;
        case 'sub':
            for (let idx = 1; idx < this.channels_.length; idx++)
                result -= this.channels_[idx].at(x, y);
            break;
        case 'mul':
            for (let idx = 1; idx < this.channels_.length; idx++)
                result *= this.channels_[idx].at(x, y);
            break;
        case 'div':
            for (let idx = 1; idx < this.channels_.length; idx++)
                result /= this.channels_[idx].at(x, y);
            break;
        }

        return result;
    }
}

export class TrnMapZChannel extends TrnChannel
{
    /** @type {TrnChannel} */
    inner_;

    /** @type {Number} */
    min_;
    /** @type {Number} */
    max_;

    constructor (inner, min, max) {
        super();
        assert.ok(min < max);

        this.inner_ = inner;
        this.min_ = min;
        this.max_ = max;
    }
    
    at(x, y) {
        const c = this.inner_.at(x, y);

        return c * this.max_ + (1 - c) * this.min_;
    }
}

/**
 * @callback ACCallback
 * @param {TrnMapChunk} chunk
 * @param {I16V} totalCoord
 */

/**
 * 
 * @param {TrnMap|TrnMapChunk} map 
 * @param {ACCallback} func 
 */
const applyChunks = (map, func) => {
    if (map instanceof TrnMapChunk) {
        c = map;

        func(c, c.totalCoord);
    } else if (map instanceof TrnMap) {
        for (let y = 0; y < map.dim[1]; y++)
        for (let x = 0; x < map.dim[0]; x++) {
            const c = map.ensureChunk(x, y);
    
            func(c, c.totalCoord);
        }
    } else {
        assert.fail();
    }
};

export const HeightChannel = 'HEIGHT-CHANNEL';


/**
 * @readonly
 * @enum {String}
 */
export const HeightMode = {
    set: 'set',
    add: 'add',
    sub: 'sub',
    min: 'min',
    max: 'max',
};


/**
 * @typedef RSTOptions
 * @property {?Number} minHeight
 * @property {?Number} maxHeight
 * @property {?HeightMode} heightMode
 * @property {?Boolean} minThreshold
 * @property {?Boolean} maxThreshold
 * @property {?Number} tileId
 * @property {ArrayLike<Number>} tileIds
 * @property {?TrnChannel} mask
 * @property {?TrnChannel|(HeightChannel)} channel
 */

/**
 * 
 * @param {TrnMap|TrnMapChunk} map 
 * @param {RSTOptions} options
 */
export const randomSplatTiles = (map, options) => {
    let mask = (x, y) => true;
    if (options.mask != null) {
        const mask_ = options.mask;
        const [minT, maxT] = [options.minThreshold, options.maxThreshold];
        if (options.minThreshold != null && options.maxThreshold != null)
            mask = (x, y) => { const m = mask_.at(x, y); return m > minT && m < maxT; };
        else if (options.minThreshold != null)
            mask = (x, y) => { const m = mask_.at(x, y); return m > minT; };
        else if (options.maxThreshold != null)
            mask = (x, y) => { const m = mask_.at(x, y); return m < maxT; };
        else
            assert.fail("Invalid mask");
    }

    let channel = (x, y) => 0;
    if (options.channel != null) {
        const channel_ = options.channel;

        if (channel_ === HeightChannel)
            throw new Error("Not implemented")
        else if (channel_.at != null)
            channel = (x, y) => channel_.at(x, y);
        else
            assert.fail("Invalid channel");
    }

    let setHeight = (chunk, tx, ty, x, y) => { };
    if (options.maxHeight != null) {
        const [minHeight, maxHeight] = [options.minHeight ?? 0, options.maxHeight];

        const getHeight = (tx, ty) => {
            const c = channel(tx, ty);
            
            const h = c * maxHeight + (1 - c) * minHeight;

            return h;
        }

        if (options.heightMode === 'add') {
            setHeight = (chunk, tx, ty, x, y) => {
                const h = getHeight(tx, ty);
                const cur = chunk.getHeight(x, y);
                chunk.setHeight(cur + h, x, y);
            };
        } else if (options.heightMode === 'sub') {
            setHeight = (chunk, tx, ty, x, y) => {
                const h = getHeight(tx, ty);
                const cur = chunk.getHeight(x, y);
                chunk.setHeight(cur - h, x, y);
            };
        } else if (options.heightMode === 'min') {
            setHeight = (chunk, tx, ty, x, y) => {
                const h = getHeight(tx, ty);
                const cur = chunk.getHeight(x, y);
                chunk.setHeight(Math.min(cur, h), x, y);
            };
        } else if (options.heightMode === 'max') {
            setHeight = (chunk, tx, ty, x, y) => {
                const h = getHeight(tx, ty);
                const cur = chunk.getHeight(x, y);
                chunk.setHeight(Math.max(cur, h), x, y);
            };
        } else {
            setHeight = (chunk, tx, ty, x, y) => {
                const h = getHeight(tx, ty);
                chunk.setHeight(h, x, y);
            };
        }
    }

    applyChunks(map, (chunk) => {
        const offX = chunk.totalCoord[0], offY = chunk.totalCoord[1];

        for (let y = 0; y < TrnMapChunk.width; y++)
        for (let x = 0; x < TrnMapChunk.width; x++) {
            let [tx, ty] = [offX + x, offY + y];

            if (!mask(tx, ty))
                continue;

            setHeight(chunk, tx, ty, x, y);

            if (options.tileId != null) {
                chunk.setTileId(options.tileId, x, y);
            } else if (options.tileIds != null) {
                throw new Error("Not implemented");
            }
        }
    });
}


/**
 * @typedef FTOptions
 * @property {?Number} tileId
 * @property {?Number} height
 */


/**
 * 
 * @param {TrnMap|TrnMapChunk} map 
 * @param {FTOptions} options 
 */
export const fillTiles = (map, options) => {
    if (typeof options.tileId === 'number')
        applyChunks(map, (chunk) => void chunk.fillTileId(options.tileId) );

    if (typeof options.height === 'number')
        applyChunks(map, (chunk) => void chunk.fillHeight(options.height) );
}