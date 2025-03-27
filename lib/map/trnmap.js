import assert from "node:assert";
import {I16V, UI16V}  from "../math/vecmath.js";

import {TrnTile, TrnPalette} from "./trn-tile.js"

import { MaxVCoord, MinVCoord, VCoordSteps } from "../world-coord.js";


export const TrnCoord = UI16V;

export const getTileRowIdx = (y) => {
    return TrnMapChunk.width * y;
};

export const getTileIdx = (x, y) => {
    return x + TrnMapChunk.width * y;
};


export const getTileChunkCoord = (x, y) => {
    return [x / TrnMapChunk.width, y / TrnMapChunk.width];
};

export const getChunkTileCoord = (x, y) => {
    return [x * TrnMapChunk.width, y * TrnMapChunk.width];
};


export class TrnMapChunk
{
    constructor() {
        
    }

    /**
     * The height of a layer
     * @type {Int16Array}
     */
    layerHeight_ = new Int16Array(TrnMapChunk.layerStride);
    /**
     * The total height of a tile
     * @type {Int16Array}
     */
    height_ = new Int16Array(TrnMapChunk.layerStride);
    /**
     * The tile id of a layer
     * @type {Uint8Array}
     */
    layerTile_ = new Uint8Array(TrnMapChunk.layerStride);
    
    /**
     * The number of layers in this chunk
     * @type {Number}
     */
    layerCount_ = 1;
    
    mapCoord_ = new I16V([0, 0]);
    totalCoord_ = new I16V([0, 0]);
    
    static width = 16;
    static layerStride = 16 * 16;

    static minHeight = MinVCoord;
    static maxHeight = MaxVCoord;
    
    /** @type {I16V} */
    get mapCoord() { return this.mapCoord_; }
    set mapCoord(value) {
        this.mapCoord_.copyFrom(value);
        this.mapCoord_.mul(TrnMapChunk.width, this.totalCoord_);
    }
    
    /** @type {I16V} */
    get totalCoord() { return this.totalCoord_; }

    /** @type {Number} */
    get layerCount() { return this.layerCount_; }

    /**
     * 
     * @param {Number} layer The first layer index to remove
     * @param {?Number} count The number of layers after `layer` to remove
     */
    removeLayers(layer, count) {
        count ??= 1;
        
        assert.ok(layer >= 0 && count >= 1 && layer + count <= this.layerCount_);
        assert.ok(this.layerCount_ > count);

        const cpyDst = TrnMapChunk.#getLayerOff_(layer);
        const cpySrc = TrnMapChunk.#getLayerOff_(layer + count);
        const cpyEnd = TrnMapChunk.#getLayerOff_(this.layerCount_);

        this.layerTile_.copyWithin(cpyDst, cpySrc, cpyEnd);
        this.layerHeight_.copyWithin(cpyDst, cpySrc, cpyEnd);
    }

    /**
     * 
     * @param {Number} layer The layer index to insert at
     * @param {?Number} count The number of layers to insert
     */
    insertLayers(layer, count) {
        count ??= 1;
        
        assert.ok(layer >= 0 && count >= 1 && layer <= this.layerCount_);
        
        const reqCap = TrnMapChunk.#getLayerOff_(this.layerCount_ + count);
        if (reqCap > this.layerHeight_.length) {
            const nlh = new Uint16Array(reqCap);
            nlh.set(this.layerHeight_);
            this.layerHeight_ = nlh;
            const nti = new Uint8Array(reqCap);
            nti.set(this.layerTile_);
            this.layerTile_ = nti;
        }

        const cpyDst = TrnMapChunk.#getLayerOff_(layer + count);
        const cpySrc = TrnMapChunk.#getLayerOff_(layer);
        const cpyEnd = TrnMapChunk.#getLayerOff_(this.layerCount_);

        this.layerTile_.copyWithin(cpyDst, cpySrc, cpyEnd);
        this.layerTile_.fill(0, cpySrc, cpyDst);
        this.layerHeight_.copyWithin(cpyDst, cpySrc, cpyEnd);
        this.layerHeight_.fill(0, cpySrc, cpyDst);
    }

    static #getNormHeight(uintHeight) {
        return uintHeight / VCoordSteps;
    }
    
    static #getIntHeight(normHeight) {
        return Math.trunc(normHeight * VCoordSteps);
    }

    static #getIdx_(coordX, coordY, layer) {
        let idx;
        if (typeof coordX === 'number' && typeof coordY === 'number')
            idx = getTileIdx(coordX, coordY);
        else if (typeof coordX === 'number')
            idx = coordX;
        else if (coordX?.length === 2)
            idx = getTileIdx(coordX[0], coordX[1]);
        else
            assert.fail();

        if (layer != null)
            idx += this.#getLayerOff_(layer);

        return idx;
    };

    static #getLayerOff_(layer) {
        return layer * this.layerStride;
    }

    /**
     * Get the height of the terrain at `coord`
     * @param {Number|Uint16Array} coordX The x coordinate, or full coordinate pair
     * @param {?Number} coordY The y coordinate
     * @returns {Number} The normalized height
     */
    getHeight(coordX, coordY) {
        return TrnMapChunk.#getNormHeight(this.height_.at(TrnMapChunk.#getIdx_(coordX, coordY)));
    }

    /**
     * Set the height of the terrain at `coord`
     * @param {Number} value The normalized height
     * @param {Number|Uint16Array} coordX The x coordinate, or full coordinate pair
     * @param {?Number} coordY The y coordinate
     */
    setHeight(value, coordX, coordY) {
        const tIdx = TrnMapChunk.#getIdx_(coordX, coordY);
        value = TrnMapChunk.#getIntHeight(value);
        const dif = value - this.height_[tIdx];
        if (dif == 0) {
            return;
        } else if (dif < 0) {
            let h = -dif;
            for (let l = 0; l < this.layerCount_ && h > 0; l++) {
                const idx = tIdx + TrnMapChunk.#getLayerOff_(l);
                const lh = this.layerHeight_[idx];
                const rem = Math.min(lh, h);

                this.layerHeight_[idx] -= rem;
                h -= rem;
            }

            // Strip layers
        } else {
            this.layerHeight_[tIdx] += value - this.height_[tIdx];

            // Add to top layer
        }
        
        this.#recalcHeight(tIdx);
    }

    #recalcHeight(tIdx) {
        let h = 0;
        for (let l = 0; l < this.layerCount_; l++)
            h += this.layerHeight_[tIdx + TrnMapChunk.#getLayerOff_(l)];

        this.height_[tIdx] = Math.min(h, TrnMapChunk.maxHeight);
    }

    getLayerHeight(coordX, coordY, layer) {
        return TrnMapChunk.#getNormHeight(this.layerHeight_.at(TrnMapChunk.#getIdx_(coordX, coordY, layer)));
    }
    
    setLayerHeight(value, coordX, coordY, layer) {
        const tIdx = TrnMapChunk.#getIdx_(coordX, coordY);
        this.layerHeight_[tIdx + TrnMapChunk.#getLayerOff_(l)] = TrnMapChunk.#getIntHeight(Math.max(0, value));

        this.#recalcHeight(tIdx);
    }
    
    /**
     * 
     * @param {Number} tIdx The tile index to compact
     * @param {Boolean} merge Merge adjacent layers that are identical
     * @param {Number} bedId 
     * @returns The new depth of the tile
     */
    #compactColumn(tIdx, merge, bedId) {
        let pTile = -1;
        let src, dst;
        for (src = 0, dst = 0; src < this.layerCount_; src++) {
            const soff = tIdx + TrnMapChunk.#getLayerOff_(src);
            if (this.layerHeight_[soff] < 1)
                continue; // Layer is empty, just skip it

            if (merge) {
                if (this.layerTile_[soff] == pTile) {
                    // Layer is same type as previous layer, merge them
                    const poff = tIdx + TrnMapChunk.#getLayerOff_(dst - 1);
                    this.layerHeight_[poff] += this.layerHeight_[soff];
    
                    continue;
                } else {
                    pTile = this.layerTile_[soff];
                }
            }


            if (src != dst) {
                // Copy from src to dst
                const doff = tIdx + TrnMapChunk.#getLayerOff_(dst);

                this.layerHeight_[doff] = this.layerHeight_[soff];
                this.layerTile_[doff] = this.layerTile_[soff];
            }

            dst++;
        }

        // Clear remaining entries
        for (let l = dst + 1; l < this.layerCount_; l++) {
            const doff = tIdx + TrnMapChunk.#getLayerOff_(l);
            this.layerTile_[doff] = bedId;
            this.layerHeight_[doff] = 0;
        }

        this.#recalcHeight(tIdx);

        return dst;
    }

    /**
     * 
     * @param {?Number|Uint16Array} coordX The x coordinate, or full coordinate pair
     * @param {?Number} coordY The y coordinate
     * @param {?{ trim: ?Boolean, merge: ?Boolean, bedId: ?Number }} options 
     */
    compact(coordX, coordY, options) {
        const merge = options?.merge ?? false;
        const bedId = options?.bedId ?? 0;

        if (coordX || coordY == null) {
            let depth = 0;
            for (let tIdx = 0; tIdx < TrnMapChunk.layerStride; tIdx++) {
                depth = Math.max(depth, this.#compactColumn(tIdx, merge, bedId));
            }

            if (options?.trim) {
                this.layerCount_ = Math.max(1, depth);
            }
        } else {
            const tIdx = TrnMapChunk.#getIdx_(coordX, coordY);

            this.#compactColumn(tIdx, merge, bedId);

            assert.ok(!(options?.trim));
        }
    }


    
    fillHeight(height) {
        this.height_.fill(TrnMapChunk.#getIntHeight(height));
    }

    /**
     * 
     * @param {Number|Uint16Array} coordX The x coordinate, or full coordinate pair
     * @param {?Number} coordY The y coordinate
     * @returns {Number} 
     */
    getTileId(coordX, coordY, layer) {
        return this.layerTile_[TrnMapChunk.#getIdx_(coordX, coordY, layer)];
    }
    
    /**
     * 
     * @param {Number} id 
     * @param {Number|Uint16Array} coordX The x coordinate, or full coordinate pair
     * @param {?Number} coordY The y coordinate
     */
    setTileId(id, coordX, coordY, layer) {
        this.layerTile_[TrnMapChunk.#getIdx_(coordX, coordY, layer)] = id;
    }

    fillTileId(id) {
        this.layerTile_.fill(id);
    }
}

export class TrnMap
{
    /**
     * @type {TrnCoord}
     */
    dim_ = UI16V.from([0, 0]);
    /**
     * @type {(?TrnMapChunk)[]}
     */
    chunks_ = [];

    /**
     * @type {?TrnPalette}
     */
    palette_ = null;

    /**
     * @typedef Options
     * @property {UI16V} dim
     * @property {TrnPalette} palette
     */

    /**
     * @param {?Options} options 
     */
    constructor(options) {
        if (options?.dim != null)
            this.dim = options.dim;
        if (options?.palette != null)
            this.palette = options.palette;
    }

    /** @type {UI16V} */
    get dim() { return this.dim_; }
    set dim(value) {
        if (this.chunks_?.length > 0)
            throw new Error("Not implemented");

        this.dim_.copyFrom(value);
        this.chunks_ = Array.from({length: this.dim_[0] * this.dim_[1]});
    }

    /** @type {TrnPalette} */
    get palette() { return this.palette_; }
    set palette(value) { this.palette_ = value; }

    /**
     * Get the chunk index of `coord`
     * @param {Number|ArrayLike<Number>} coordX the chunk x coordinate, or full coordinate
     * @param {?Number} coordY the chunk y coordinate
     * @returns {Number}
     */
    getChunkIndex(coordX, coordY) {
        if (typeof coordX === 'number' && typeof coordY === 'number')
            return coordX + coordY * this.dim_[0];
        else if (typeof coordX === 'number')
            return coordX;
        else if (coordX?.length === 2)
            return coordX[0] + coordX[1] * this.dim_[0];
        else
            assert.fail();
    };
    
    #getChunkCoord(coordX, coordY) {
        if (typeof coordX === 'number' && typeof coordY === 'number')
            return [coordX, coordY];
        else if (typeof coordX === 'number')
            throw new Error("Not implemented");
        else if (coordX?.length === 2)
            return TrnCoord.from(coordX);
        else
            assert.fail();
    };
    
    /**
     * Get the chunk at `coord`
     * @param {Number|ArrayLike<Number>} coordX the chunk x coordinate, or full coordinate
     * @param {?Number} coordY the chunk y coordinate
     */
    getChunk(coordX, coordY) {
        return this.chunks_[this.getChunkIndex(coordX, coordY)];
    }

    /**
     * Get the chunk at `coord`
     * @param {Number|ArrayLike<Number>} coordX the chunk x coordinate, or full coordinate
     * @param {?Number} coordY the chunk y coordinate
     */
    ensureChunk(coordX, coordY) {
        const i = this.getChunkIndex(coordX, coordY);
        let c = this.chunks_[i];
        if (!c) {
            c = this.chunks_[i] = new TrnMapChunk();
            c.mapCoord = this.#getChunkCoord(coordX, coordY);
        }

        return c;
    }
    
    /**
     * Set the chunk at `coord`
     * @param {TrnMapChunk} chunk The chunk
     * @param {Number|ArrayLike<Number>} coordX the chunk x coordinate, or full coordinate
     * @param {?Number} coordY the chunk y coordinate
     */
    setChunk(chunk, coordX, coordY) {
        const i = this.getChunkIndex(coordX, coordY);
        this.chunks_[i] = chunk;
        c.mapCoord = this.#getChunkCoord(coordX, coordY);
    }
}