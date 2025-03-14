import { getSymbolCode, ScreenSymbol } from "../../screen/screen.js";

import { Color } from "../../screen/color.js";

export const TileSymbol = ScreenSymbol;

const TileColorData = Uint8Array;

/**
 * 
 * @param {TileColorData} tc 
 * @param {Number} brightness 
 * @returns {Color}
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
    colors_;

    /**
     * @param {Color|Color[]} colors 
     */
    constructor(colors) {
        if (Array.isArray(colors))
            this.colors_ = Uint8Array.from([... colors]);
        else
            this.colors_ = Uint8Array.from([colors]);
    }

    getColor(brightness) {
        return getTileColor_(this.colors_, brightness);
    }

    static default = new TileColor(Color.white);
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
     * @property {?TileColor} color
     */

    /**
     * 
     * @param {TTOptions} options 
     */
    constructor(options) {
        this.symbol_ = getSymbolCode(options?.symbol ?? 'X');
        this.colors_ = options?.color ?? Color.default;
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
    
    /** @type {Uint8Array} */
    tileSymbols_ = [];





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
