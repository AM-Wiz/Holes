import { createNoise2D } from "simplex-noise";
import { getTotalTileIdx, TrnMap, TrnMapChunk } from "./trnmap.js";

import Alea from "alea";

import assert from "node:assert";
import { TrnPalette } from "./trn-tile.js";


const randomSeedGen_ = new Alea()

export const randomSeed = () => {
    const seed = randomSeedGen_.next();
    return `${seed}`;
}


export class TrnChannelContext
{
    /** @type {?TrnMap} */
    map_;
    /** @type {?TrnPalette} */
    palette_;

    /** @type {?TrnMap} */
    get map() { return this.map_; }
    /** @type {?TrnMap} */
    set map(value) { this.map_ = value; }

    /** @type {?TrnPalette} */
    get palette() { return this.palette_ ?? this.map_?.palette_; }
    /** @type {?TrnPalette} */
    set palette(value) { this.palette_ = value; }
}



export class TrnChannel
{

    /**
     * 
     * @param {Number} x 
     * @param {Number} y 
     * @param {TrnChannelContext} context 
     * @returns {Number}
     */
    at(x, y, context) { return 0; }



    mapZ(min, max) {
        if (this instanceof TrnMapZChannel)
            return new TrnMapZChannel(this, (max - min) * this.min + min, (max - min) * this.max + min);

        return new TrnMapZChannel(this, min, max);
    }

    
    combine(mode, others, options) {
        const channels = [];
        if (this instanceof TrnCombineChannel && this.mode_ == mode)
            channels.push(... this.channels_); // Flatten structure, add channels
        else
            channels.push(this); // Add this

        if (others instanceof TrnChannel)
            channels.push(others);
        else
            channels.push(... others);

        return new TrnCombineChannel(mode, channels, options);
    }
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
    
    /**
     * 
     * @override
     */
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
        min: 'min',
        max: 'max',
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

    /**
     * 
     * @override
     */
    at(x, y, context) {
        let result = this.channels_[0].at(x, y, context);
        switch (this.mode_) {
        case 'avg':
            for (let idx = 1; idx < this.channels_.length; idx++)
                result += this.channels_[idx].at(x, y, context);
            result /= this.channels_.length;
            break;
        case 'add':
            for (let idx = 1; idx < this.channels_.length; idx++)
                result += this.channels_[idx].at(x, y, context);
            break;
        case 'sub':
            for (let idx = 1; idx < this.channels_.length; idx++)
                result -= this.channels_[idx].at(x, y, context);
            break;
        case 'mul':
            for (let idx = 1; idx < this.channels_.length; idx++)
                result *= this.channels_[idx].at(x, y, context);
            break;
        case 'div':
            for (let idx = 1; idx < this.channels_.length; idx++)
                result /= this.channels_[idx].at(x, y, context);
            break;
        case 'min':
            for (let idx = 1; idx < this.channels_.length; idx++)
                result = Math.min(result, this.channels_[idx].at(x, y, context));
            break;
        case 'max':
            for (let idx = 1; idx < this.channels_.length; idx++)
                result = Math.max(result, this.channels_[idx].at(x, y, context));
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
    
    /**
     * @override
     */
    at(x, y, context) {
        const c = this.inner_.at(x, y, context);

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
export const applyChunks = (map, func) => {
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

export class HeightChannel extends TrnChannel
{
    /** @type {?Number} */
    layer_ = null;


    /**
     * @typedef Options
     * @property {?Number} layer
     */

    /**
     * 
     * @param {?Options} options 
     */
    constructor(options) {
        super();
        this.layer_ = options?.layer ?? null;
    }

    
    /**
     * 
     * @param {Number} x 
     * @param {Number} y 
     * @param {TrnChannelContext} context 
     * @returns {Number}
     */
    at(x, y, context) {
        const chunk = context?.map_?.getChunkTotal(x, y);
        if (chunk == null)
            return 0;

        
        const idx = getTotalTileIdx(x, y);

        let h;
        if (this.layer_ != null)
            h = chunk.getLayerHeight(idx, null, this.layer_);
        else
            h = chunk.getHeight(idx);

        return h;
    }
}


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
 * @typedef RandomSplatTilesOptions
 * @property {?Number} minHeight
 * @property {?Number} maxHeight
 * @property {?HeightMode} heightMode
 * @property {?Boolean} minThreshold
 * @property {?Boolean} maxThreshold
 * @property {?Number} tileId
 * @property {ArrayLike<Number>} tileIds
 * @property {?TrnChannel} mask
 * @property {?TrnChannel|(HeightChannel)} channel
 * @property {?Number} layer
 */

/**
 * 
 * @param {TrnMap|TrnMapChunk} map 
 * @param {RandomSplatTilesOptions} options
 */
export const randomSplatTiles = (map, options) => {
    let layer = options.layer ?? 0;

    const context = new TrnChannelContext();
    context.map = map instanceof TrnMap ? map : null;

    /**
     * 
     * @param {Number} x 
     * @param {Number} y 
     * @returns {Boolean}
     */
    let mask = (x, y) => true;
    if (options.mask != null) {
        const mask_ = options.mask;
        const [minT, maxT] = [options.minThreshold, options.maxThreshold];
        if (options.minThreshold != null && options.maxThreshold != null)
            mask = (x, y) => { const m = mask_.at(x, y, context); return m > minT && m < maxT; };
        else if (options.minThreshold != null)
            mask = (x, y) => { const m = mask_.at(x, y, context); return m > minT; };
        else if (options.maxThreshold != null)
            mask = (x, y) => { const m = mask_.at(x, y, context); return m < maxT; };
        else
            assert.fail("Invalid mask");
    }

    /**
     * 
     * @param {Number} x 
     * @param {Number} y 
     * @returns {Number}
     */
    let channel = (x, y) => 0;
    if (options.channel != null) {
        const channel_ = options.channel;

        if (channel_.at != null)
            channel = (x, y) => channel_.at(x, y, context);
        else
            assert.fail("Invalid channel");
    }

    /**
     * 
     * @param {TrnMapChunk} chunk 
     * @param {Number} tx 
     * @param {Number} ty 
     * @param {Number} x 
     * @param {Number} y 
     */
    let setHeight = (chunk, tx, ty, x, y) => { };
    if (options.maxHeight != null) {
        const [minHeight, maxHeight] = [options.minHeight ?? 0, options.maxHeight];

        /**
         * 
         * @param {Number} tx 
         * @param {Number} ty 
         * @returns {Number}
         */
        const getMixHeight = (tx, ty) => {
            const c = channel(tx, ty);
            
            const h = c * maxHeight + (1 - c) * minHeight;

            return h;
        }

        /**
         * 
         * @type {Function}
         * @param {Number} mix
         * @param {Number} cur
         * @returns {Number}
         */
        let mixHeight = (mix, cur) => mix;
        let hasMix = false;
        if (options.heightMode === 'add') {
            mixHeight = (mix, cur) => cur + mix;
            hasMix = true;
        } else if (options.heightMode === 'sub') {
            mixHeight = (mix, cur) => cur - mix;
            hasMix = true;
        } else if (options.heightMode === 'min') {
            mixHeight = (mix, cur) => Math.min(cur, mix);
            hasMix = true;
        } else if (options.heightMode === 'max') {
            mixHeight = (mix, cur) => Math.max(cur, mix);
            hasMix = true;
        }
        
        /**
         * 
         * @param {Number} h 
         * @param {TrnMapChunk} chunk 
         * @param {Number} x 
         * @param {Number} y 
         */
        let setSrcHeight = (h, chunk, x, y) => void chunk.setHeight(h, x, y);
        let getSrcHeight = (chunk, x, y) => chunk.getHeight(x, y);
        if (layer != null) {
            setSrcHeight = (h, chunk, x, y) => void chunk.setLayerHeight(h, x, y, layer);
            getSrcHeight = (chunk, x, y) => chunk.getLayerHeight(x, y, layer);
        }

        if (hasMix) {
            setHeight = (chunk, tx, ty, x, y) => {
                let h = getMixHeight(tx, ty);
                let cur = getSrcHeight(chunk, x, y);
                h = mixHeight(h, cur);
                h = Math.max(0, h);
                setSrcHeight(h, chunk, x, y);
            };
        } else {
            setHeight = (chunk, tx, ty, x, y) => {
                let h = getMixHeight(tx, ty);
                h = Math.max(0, h);
                setSrcHeight(h, chunk, x, y);
            };
        }

    }

    /**
     * 
     * @param {TrnMapChunk} chunk 
     * @param {Number} x 
     * @param {Number} y 
     */
    let setTiles = (chunk, x, y) => { };
    if (options.tileId != null) {
        const tId_ = options.tileId;
        setTiles = (chunk, x, y) => chunk.setTileId(tId_, x, y, layer);
    } else if (options.tileIds != null) {
        throw new Error("Not implemented");
    }

    applyChunks(map, (chunk) => {
        const offX = chunk.totalCoord[0], offY = chunk.totalCoord[1];

        for (let y = 0; y < TrnMapChunk.width; y++)
        for (let x = 0; x < TrnMapChunk.width; x++) {
            let [tx, ty] = [offX + x, offY + y];

            if (!mask(tx, ty))
                continue;

            setHeight(chunk, tx, ty, x, y);

            setTiles(chunk, x, y);
        }
    });
}


/**
 * @typedef FillTileOptions
 * @property {?Number} tileId
 * @property {?Number} height
 * @property {?Number} layerStart
 * @property {?Number} layerEnd
 */


/**
 * 
 * @param {TrnMap|TrnMapChunk} map 
 * @param {FillTileOptions} options 
 */
export const fillTiles = (map, options) => {
    if (typeof options.tileId === 'number')
        applyChunks(map, (chunk) => void chunk.fillTileId(options.tileId, options.layerStart, options.layerEnd) );

    if (typeof options.height === 'number')
        applyChunks(map, (chunk) => void chunk.fillHeight(options.height, options.layerStart, options.layerEnd) );
}



/**
 * @typedef CompactTilesOptions
 * @property {?Number} bedId
 * @property {?Boolean} trim
 * @property {?Boolean} merge
 */

/**
 * 
 * @param {TrnMap|TrnMapChunk} map 
 * @param {?CompactTilesOptions} options 
 */
export const compactTiles = (map, options) => {
    applyChunks(map, (chunk) => {
        chunk.compact(null, null, options);
    });
};


/**
 * 
 * @param {TrnMap|TrnMapChunk} map 
 * @param {Number} count 
 */
export const pushDownTileLayers = (map, count) => {
    applyChunks(map, (chunk) => {
        chunk.insertLayers(0, count);
    });
};


/**
 * 
 * @param {TrnMap|TrnMapChunk} map 
 */
export const clearTiles = (map) => {
    applyChunks(map, (chunk) => {
        chunk.removeLayers(0);
        chunk.fillHeight(0);
        chunk.fillTileId(0);
    });
};