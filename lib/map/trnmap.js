import assert from "node:assert";
import {I16V, UI16V}  from "../math/vecmath.js";

import {TrnTile, TrnPalette} from "./trn-tile.js"


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

    height_ = new Int16Array(TrnMapChunk.width * TrnMapChunk.width);
    tile_ = new Uint8Array(TrnMapChunk.width * TrnMapChunk.width);
    

    mapCoord_ = new I16V([0, 0]);
    totalCoord_ = new I16V([0, 0]);
    
    static width = 16;

    static maxHeight = 128;
    
    get mapCoord() { return this.mapCoord_; }
    set mapCoord(value) {
        this.mapCoord_.copyFrom(value);
        this.mapCoord_.mul(TrnMapChunk.width, this.totalCoord_);
    }
    get totalCoord() { return this.totalCoord_; }


    static #getNormHeight(uintHeight) {
        return uintHeight / 100;
    }
    
    static #getIntHeight(normHeight) {
        return Math.trunc(normHeight * 100);
    }

    static #getIdx_(coordX, coordY) {
        if (typeof coordX === 'number' && typeof coordY === 'number')
            return getTileIdx(coordX, coordY);
        else if (typeof coordX === 'number')
            return coordX;
        else if (coordX?.length === 2)
            return getTileIdx(coordX[0], coordX[1]);
        else
            assert.fail();
    };

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
        this.height_[TrnMapChunk.#getIdx_(coordX, coordY)] = TrnMapChunk.#getIntHeight(value);
    }

    /**
     * 
     * @param {Number|Uint16Array} coordX The x coordinate, or full coordinate pair
     * @param {?Number} coordY The y coordinate
     * @returns {Number} 
     */
    getTileId(coordX, coordY) {
        return this.tile_[TrnMapChunk.#getIdx_(coordX, coordY)];
    }
    
    /**
     * 
     * @param {Number} id 
     * @param {Number|Uint16Array} coordX The x coordinate, or full coordinate pair
     * @param {?Number} coordY The y coordinate
     */
    setTileId(id, coordX, coordY) {
        this.tile_[TrnMapChunk.#getIdx_(coordX, coordY)] = id;
    }

    fillTileId(id) {
        this.tile_.fill(id);
    }
    
    fillHeight(height) {
        this.height_.fill(TrnMapChunk.#getIntHeight(height));
    }
}

export class TrnMap
{
    constructor() {

    }

    /**
     * @type {TrnCoord}
     */
    dim_ = UI16V.from([16, 16]);
    /**
     * @type {(?TrnMapChunk)[]}
     */
    chunks_ = [];


    get dim() { return this.dim_; }
    set dim(value) {
        if (this.chunks_?.length > 0)
            throw new Error("Not implemented");

        this.dim_.copyFrom(value);
        this.chunks_ = Array.from({length: this.dim_[0] * this.dim_[1]});
    }

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