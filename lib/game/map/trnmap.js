import assert from "node:assert";
import {I16V, UI16V}  from "../../math/vecmath.js";

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

    static #getIdx_(coordx, coordy) {
        if (typeof coordx === 'number' && typeof coordy === 'number')
            return getTileIdx(coordx, coordy);
        else if (typeof coordx === 'number')
            return coordx;
        else if (coordx?.length === 2)
            return getTileIdx(coordx[0], coordx[1]);
        else
            assert.fail();
    };

    /**
     * Get the height of the terrain at `coord`
     * @param {Number|Uint16Array} coordx The Coordinate
     * @returns {Number} The normalized height
     */
    getHeight(coordx, coordy) {
        return TrnMapChunk.#getNormHeight(this.height_.at(TrnMapChunk.#getIdx_(coordx, coordy)));
    }

    /**
     * Set the height of the terrain at `coord`
     * @param {Number} value The normalized height
     * @param {Number|Uint16Array} coordx The Coordinate
     */
    setHeight(value, coordx, coordy) {
        this.height_[TrnMapChunk.#getIdx_(coordx, coordy)] = TrnMapChunk.#getIntHeight(value);
    }

    getTileId(coordx, coordy) {
        return this.tile_[TrnMapChunk.#getIdx_(coordx, coordy)];
    }
    
    setTileId(id, coordx, coordy) {
        this.tile_[TrnMapChunk.#getIdx_(coordx, coordy)] = id;
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
     * @param {Number|TrnCoord} coordx The chunk coordinate
     * @returns {Number}
     */
    getChunkIndex(coordx, y) {
        if (typeof coordx === 'number' && typeof y === 'number')
            return coordx + y * this.dim_[0];
        else if (typeof coordx === 'number')
            return coordx;
        else if (coordx?.length === 2)
            return coordx[0] + coordx[1] * this.dim_[0];
        else
            assert.fail();
    };
    
    #getChunkCoord(coordx, y) {
        if (typeof coordx === 'number' && typeof y === 'number')
            return [coordx, y];
        else if (typeof coordx === 'number')
            throw new Error("Not implemented");
        else if (coordx?.length === 2)
            return TrnCoord.from(coordx);
        else
            assert.fail();
    };
    
    /**
     * Get the chunk at `coord`
     * @param {Uint16Array} coord the chunk coordinate
     */
    getChunk(coordx, coordy) {
        return this.chunks_[this.getChunkIndex(coordx, coordy)];
    }

    /**
     * Get the chunk at `coord`
     * @param {Uint16Array} coord the chunk coordinate
     */
    ensureChunk(coordx, coordy) {
        const i = this.getChunkIndex(coordx, coordy);
        let c = this.chunks_[i];
        if (!c) {
            c = this.chunks_[i] = new TrnMapChunk();
            c.mapCoord = this.#getChunkCoord(coordx, coordy);
        }

        return c;
    }
    
    /**
     * Set the chunk at `coord`
     * @param {Uint16Array} coord The chunk coordinate
     * @param {MapSeg} chunk The chunk
     */
    setChunk(chunk, coordx, coordy) {
        const i = this.getChunkIndex(coordx, coordy);
        this.chunks_[i] = chunk;
    }
}