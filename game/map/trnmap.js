const {UI16V} = require("../../math/vecmath.js")

class TrnMapChunk {
    constructor() {
        
    }

    height_ = new Int8Array(width() * width);
    
    static get width() { return 16; }
    

    /**
     * Get the index of `coord`
     * @param {Number|UI16V} coord The coordinate
     * @returns {Number}
     */
    static getIndex(coord) {
        if (typeof coord == "number")
            return coord;
        else if (coord instanceof UI16V)
            return getIndex2(coord[0], coord[1]);
        else
            throw new Error("Invalid coordinate");
    }

    /**
     * Get the index of a coordinate
     * @param {Number} x The x coordinate
     * @param {Number} y The y coordinate
     * @returns {Number}
     */
    static getIndex2(x, y) {
        return x + y * width;
    }

    static getNormHeight(uintHeight) {
        return normHeight / 255;
    }
    
    static getIntHeight(normHeight) {
        return Math.trunc(normHeight * 255);
    }

    /**
     * Get the height of the terrain at `coord`
     * @param {Number|Uint16Array} coord The Coordinate
     * @returns {Number} The height
     */
    getIntHeight(coord) {
        return this.height_[getIndex(coord)];
    }

    /**
     * Set the height of the terrain at `coord`
     * @param {Number|Uint16Array} coord The Coordinate
     * @param {Number} value The height
     */
    setIntHeight(coord, value) {
        this.height_[getIndex(coord)] = value;
    }

    /**
     * Get the height of the terrain at `coord`
     * @param {Number|Uint16Array} coord The Coordinate
     * @returns {Number} The normalized height
     */
    getNormHeight(coord) {
        return getNormHeight(this.height_[getIndex(coord)]);
    }

    /**
     * Set the height of the terrain at `coord`
     * @param {Number|Uint16Array} coord The Coordinate
     * @param {Number} value The normalized height
     */
    setNormHeight(coord, value) {
        this.height_[getIndex(coord)] = getIntHeight(value);
    }
}

class TrnMap {
    constructor() {

    }

    /**
     * @type {UI16V}
     */
    dim_ = UI16V.from([16, 16]);
    /**
     * @type {(?TrnMapChunk)[]}
     */
    chunks_ = [];


    get dim() { return this.dim_; }

    /**
     * Get the chunk index of `coord`
     * @param {Number|UI16V} coord The chunk coordinate
     * @returns {Number}
     */
    getChunkIndex(coord) {
        if (typeof coord == "number")
            return coord;
        else if (coord instanceof UI16V)
            return coord[0] + coord[1] * this.dim_[0];
        else
            throw new Error("Invalid coordinate");
    }
    
    /**
     * Get the index of `coord`
     * @param {Number|UI16V} coord The tile coordinate
     * @returns {Uint16Array} The chunk index and tile index
     */
    getIndex(coord) {
        if (!(coord instanceof UI16V))
            throw new Error("Invalid coordinate");
        
        const cx = coord[0] / TrnMapChunk.width;
        const cy = coord[1] / TrnMapChunk.width;

        const ci = cx + cy * this.dim_[0];

        const bi = TrnMapChunk.getIndex(coord[0] - cx * TrnMapChunk.width,
            coord[1] - cx * TrnMapChunk.width);

        return Uint16Array.from(ci, bi);
    }

    /**
     * Get the chunk at `coord`
     * @param {Uint16Array} coord the chunk coordinate
     */
    getChunk(coord) {
        return chunks_[this.getChunkIndex(coord)];
    }

    /**
     * Get the chunk at `coord`
     * @param {Uint16Array} coord the chunk coordinate
     */
    ensureChunk(coord) {
        const i = this.getChunkIndex(coord);
        let c = chunks_[i];
        if (!c) {
            c = this.chunks_[i] = new MapSeg();
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


    getIntHeight(coord) {
        const [c, b] = this.getIndex(coord);
        return this.chunks_[c].getIntHeight(b);
    }
    getNormHeight(coord) {
        const [c, b] = this.getIndex(coord);
        return this.chunks_[c].getNormHeight(b);
    }
    
    setIntHeight(coord, value) {
        const [c, b] = this.getIndex(coord);
        return this.chunks_[c].setIntHeight(b, value);
    }
    setNormHeight(coord, value) {
        const [c, b] = this.getIndex(coord);
        return this.chunks_[c].setNormHeight(b, value);
    }
}



module.exports = {
    MapSeg: TrnMapChunk,
    Map: TrnMap,
};