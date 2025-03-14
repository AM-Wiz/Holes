import {UI16V}  from "../../math/vecmath.js";

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

    height_ = new Int8Array(TrnMapChunk.width * TrnMapChunk.width);

    mapCoord_ = new UI16V([0, 0]);
    totalCoord_ = new UI16V([0, 0]);
    
    static width = 16;
    
    get mapCoord() { return this.mapCoord_; }
    set mapCoord(value) {
        this.mapCoord_.copyFrom(value);
        this.mapCoord_.mul(TrnMapChunk.width, this.totalCoord_);
    }
    get totalCoord() { return this.totalCoord_; }


    static getNormHeight(uintHeight) {
        return uintHeight / 255;
    }
    
    static getIntHeight(normHeight) {
        return Math.trunc(normHeight * 255);
    }

    static #getIdx_(coordx, y) {
        if (typeof coordx === 'number' && typeof y === 'number')
            return getTileIdx(coordx, y);
        else if (typeof coordx === 'number')
            return coordx;
        else
            return getTileIdx(coordx[0], coordx[1]);
    };

    /**
     * Get the height of the terrain at `coord`
     * @param {Number|Uint16Array} coord The Coordinate
     * @returns {Number} The height
     */
    getIntHeight(coord) {
        return this.height_.at(TrnMapChunk.#getIdx_(coord));
    }

    /**
     * Set the height of the terrain at `coord`
     * @param {Number|Uint16Array} coord The Coordinate
     * @param {Number} value The height
     */
    setIntHeight(coord, value) {
        this.height_[TrnMapChunk.#getIdx_(coord)] = value;
    }

    /**
     * Get the height of the terrain at `coord`
     * @param {Number|Uint16Array} coord The Coordinate
     * @returns {Number} The normalized height
     */
    getNormHeight(coord) {
        return TrnMapChunk.getNormHeight(this.height_.at(TrnMapChunk.#getIdx_(coord)));
    }

    /**
     * Set the height of the terrain at `coord`
     * @param {Number|Uint16Array} coord The Coordinate
     * @param {Number} value The normalized height
     */
    setNormHeight(coord, value) {
        this.height_[TrnMapChunk.#getIdx_(coord)] = TrnMapChunk.getIntHeight(value);
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

    /**
     * Get the chunk index of `coord`
     * @param {Number|TrnCoord} coord The chunk coordinate
     * @returns {Number}
     */
    getChunkIndex(coord) {
        if (typeof coord == "number")
            return coord;
        else if (coord instanceof TrnCoord)
            return coord[0] + coord[1] * this.dim_[0];
        else
            throw new Error("Invalid coordinate");
    }
    
    /**
     * Get the chunk at `coord`
     * @param {Uint16Array} coord the chunk coordinate
     */
    getChunk(coord) {
        return this.chunks_[this.getChunkIndex(coord)];
    }

    /**
     * Get the chunk at `coord`
     * @param {Uint16Array} coord the chunk coordinate
     */
    ensureChunk(coord) {
        const i = this.getChunkIndex(coord);
        let c = this.chunks_[i];
        if (!c) {
            c = this.chunks_[i] = new TrnMapChunk();
            c.mapCoord = coord;
        }

        return c;
    }
    
    /**
     * Set the chunk at `coord`
     * @param {Uint16Array} coord The chunk coordinate
     * @param {MapSeg} chunk The chunk
     */
    setChunk(coord, chunk) {
        const i = this.getChunkIndex(coord);
        this.chunks_[i] = chunk;
    }
}