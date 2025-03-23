import { ScreenBuffer, ScreenSymbol, ScreenColor } from "./screen.js";
import { I16V, UI16V } from "../math/vecmath.js";
import { CColor } from "./color.js";

import assert from "node:assert";

class Sprite
{
    /** @type {UI16V} */
    dim_ = new UI16V([1, 1]);

    /** @type {Uint16Array} */
    tiles_ = new Uint16Array(1).fill(0);

    /** @type {?ScreenColor} */
    color_ = null;


    /**
     * @typedef Options
     * @property {?ScreenColor} color
     * @property {?ArrayLike<Number>} dim
     * @property {?String|ScreenSymbol} tile
     * @property {?ArrayLike<String|ArrayLike<String|ScreenSymbol>>} tileTable
     */


    /**
     * 
     * @param {?Options} options 
     */
    constructor(options) {
        this.color_ = ScreenBuffer.getColorCode(options?.color ?? null);

        if (options?.dim != null)
            this.dim = options.dim;

        if (options?.tileTable != null) {
            assert.ok(options?.tileTable?.length != null);
            assert.ok(options?.tileTable[0]?.length != null);

            this.dim = [options.tileTable[0].length, options.tileTable.length];

            for (let y = 0; y < this.dim[1]; y++) {
                const r = options.tileTable[y];
                const rowI = this.dim[0] * (this.dim[1] - y - 1);
                assert.ok(r.length == this.dim[0]);
                if (typeof r === 'string') {
                    for (let x = 0; x < this.dim[0]; x++)
                        this.tiles_[rowI + x] = ScreenBuffer.getSymbolCode(r.codePointAt(x));
                } else {
                    for (let x = 0; x < this.dim[0]; x++)
                        this.tiles_[rowI + x] = ScreenBuffer.getSymbolCode(r[x]);
                }
            }
        } else if (options?.tile != null) {
            dim = [1, 1];
            this.tiles_[0] = ScreenBuffer.getSymbolCode(options.tile);
        }
    }

    /** @type {UI16V} */
    get dim() { return this.dim_; }
    set dim(value) {
        assert.ok(value[0] > 0 && value[1] > 0);
        
        if (this.dim_.equals(value))
            return;

        this.dim_.copyFrom(value);
        
        const newCap = this.dim_[0] * this.dim_[1];
        if (newCap > this.tiles_.length)
            this.tiles_ = new Uint16Array(newCap).fill(0);
    }

    /** @type {ScreenColor} */
    get color() { return this.color_; }
    set color(value) {
        this.color_ = value;
    }

    /**
     * 
     * @param {Number} y 
     * @returns {Number}
     */
    getTileRowIdx(y) {
        return this.dim_[0] * y;
    }

    /**
     * 
     * @param {Number} x 
     * @param {Number} y 
     * @returns {Number}
     */
    getTileIdx(x, y) {
        return x + this.dim_[0] * y;
    }

    /**
     * 
     * @param {Number|ArrayLike<Number>} coordX 
     * @param {?Number} coordY 
     * @returns {Number}
     */
    #getIndex(coordX, coordY) {
        if (typeof coordX === 'number' && typeof coordY === 'number')
            return this.getTileIdx(coordX, coordY);
        else if (typeof coordX === 'number')
            return coordX;
        else
            return getTileIdx(coordX[0], coordX[1]);
    }

    /**
     * 
     * @param {Number|ArrayLike<Number>} coordX 
     * @param {?Number} coordY 
     * @returns {ScreenSymbol}
     */
    getSymbol(coordX, coordY) {
        return this.tiles_[this.#getIndex(coordX, coordY)];
    }
    
    /**
     * 
     * @param {ScreenSymbol} value 
     * @param {Number|ArrayLike<Number>} coordX 
     * @param {?Number} coordY 
     */
    setSymbol(value, coordX, coordY) {
        this.tiles_[this.#getIndex(coordX, coordY)] = value;
    }
}


export {
    Sprite,
}