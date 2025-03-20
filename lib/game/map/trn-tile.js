import { getSymbolCode, ScreenSymbol } from "../../screen/screen.js";

import { CColor } from "../../screen/color.js";

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


    /**
     * @typedef TTOptions
     * @property {TileSymbol} symbol
     * @property {?TileColor|CColor} color
     */

    /**
     * 
     * @param {TTOptions} options 
     */
    constructor(options) {
        this.symbol_ = getSymbolCode(options?.symbol ?? 'X');
        if (options?.color instanceof TileColor)
            this.colors_ = options.color;
        else
            this.colors_ = new TileColor(options.color);
    }

    /** @type {TileSymbol} */
    get symbol() { return this.symbol_; }

    /** @type {TileColor} */
    get color() { return this.colors_; }
}


export class TrnPalette
{
    /** @type {TrnTile[]} */
    tiles_ = [];
    
    /** @type {TileColorData[]} */
    tileColors_ = [];
    
    /** @type {Uint16Array} */
    tileSymbols_ = new Uint16Array(0);


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
        }

        return p;
    }


    get length () { return this.tiles_.length; }

    getTile(id) {
        return this.tiles_[id];
    }

    getColor(id, brightness) {
        const tca = this.tileColors_[id];
        return getTileColor_(tca, brightness);
    }
    
    getSymbol(id) {
        return this.tileSymbols_.at(id);
    }
}
