import assert from "node:assert";
import { ScreenBuffer, ScreenSymbol } from "../screen/screen.js";

import { CColor } from "../screen/color.js";

/** @typedef {ScreenSymbol} TileSymbol */
export const TileSymbol = ScreenSymbol;

/** @typedef {Uint8Array} TileColorData */
const TileColorData = Uint8Array;

/**
 * 
 * @param {TileColorData} tc 
 * @param {Number} brightness 
 * @returns {CColor}
 */
const getTileColor_ = (tc, brightness) => {
    let idx = brightness;
    idx = Math.trunc(idx * tc.length);
    idx = Math.min(tc.length - 1, Math.max(0, idx));

    return tc.at(idx);
}

export class TileColor
{
    /** @type {TileColorData} */
    data_;

    /**
     * @param {CColor|CColor[]} colors 
     */
    constructor(colors) {
        if (Array.isArray(colors))
            this.data_ = Uint8Array.from([... colors]);
        else
            this.data_ = Uint8Array.from([colors]);
    }

    getColor(brightness) {
        return getTileColor_(this.data_, brightness);
    }

    static default = new TileColor(CColor.whiteBright);
}

export class TrnTile
{
    /** @type {TileSymbol} */
    symbol_;

    /** @type {TileColor} */
    colors_;

    /** @type {?String} */
    name_;


    /**
     * @typedef TTOptions
     * @property {TileSymbol} symbol
     * @property {?TileColor|CColor} color
     * @property {?String} name
     */

    /**
     * 
     * @param {TTOptions} options 
     */
    constructor(options) {
        this.symbol_ = ScreenBuffer.getSymbolCode(options?.symbol ?? 'X');
        if (options?.color instanceof TileColor)
            this.colors_ = options.color;
        else
            this.colors_ = new TileColor(options.color);
        this.name_ = options.name ?? null;
    }

    /** @type {TileSymbol} */
    get symbol() { return this.symbol_; }

    /** @type {TileColor} */
    get color() { return this.colors_; }
    
    /** @type {?String} */
    get name() { return this.name_; }


    toString() {
        return this.name_ != null ? this.name_ : `tile "${this.symbol_}"`;
    }
}


export class TrnPalette
{
    /** @type {TrnTile[]} */
    tiles_ = [];
    
    /** @type {TileColorData[]} */
    tileColors_ = [];
    
    /** @type {Uint16Array} */
    tileSymbols_ = new Uint16Array(0);

    /** @type {Map<String, Number>} */
    tileMap_ = new Map();

    constructor() {

    }

    /**
     * @param {ArrayLike<TrnTile>} tiles 
     */
    static from(tiles) {
        const p = new TrnPalette();

        p.tiles_ = [... tiles];
        p.tileColors_ = Array.from({length: tiles.length});
        p.tileSymbols_ = Uint16Array.from({length: tiles.length});

        for (let i = 0; i < tiles.length; i++) {
            const t = tiles[i];
            p.tileColors_[i] = t.colors_.data_;
            p.tileSymbols_[i] = t.symbol;

            if (t.name != null)
                p.tileMap_.set(t.name, i);
        }

        return p;
    }


    get length () { return this.tiles_.length; }

    /**
     * 
     * @param {String} name 
     * @returns {?Number}
     */
    findTile(name) {
        return this.tileMap_.get(name) ?? null;
    }

    #resolveId(id) {
        if (typeof id === 'number')
            return id;
        else if (typeof id === 'string')
            return this.findTile(id);
        else
            assert.fail();
    }

    /**
     * 
     * @param {String|Number} id 
     * @returns {TrnTile}
     */
    getTile(id) {
        id = this.#resolveId(id);
        return id == null ? null : this.tiles_[id];
    }

    /**
     * 
     * @param {Number} id 
     * @param {Number} brightness 
     * @returns {CColor}
     */
    getColor(id, brightness) {
        const tca = this.tileColors_[id];
        return getTileColor_(tca, brightness);
    }
    
    /**
     * 
     * @param {Number} id 
     * @returns {TileSymbol}
     */
    getSymbol(id) {
        return this.tileSymbols_[id];
    }
}
