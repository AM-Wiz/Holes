import { ScreenBuffer, spaceCharCode, padCharCode, lineCharCode, zMax } from "./screen.js";

import { CColor } from "./color.js";


class ScreenWriter
{
    /** @type {ScreenBuffer} */
    buffer_ = null;
    /** @type {Boolean} */
    zTestEnabled_ = false;
    /** @type {Boolean} */
    zWriteEnabled_ = false;
    /** @type {?ScreenSymbol} */
    symbol_ = spaceCharCode;
    /** @type {?CColor} */
    color_ = CColor.whiteBright;
    /** @type {Number} */
    z_ = zMax;


    /**
     * @typedef SWOptions
     * @property {?ScreenBuffer} buffer
     * @property {?Boolean} zTestEnabled
     * @property {?Boolean} zWriteEnabled
     * @property {?ScreenSymbol|String} symbol
     * @property {?CColor} color
     * @property {?Number} zNorm
     * @property {?Number} zUint
     */

    /**
     * @param {?SWOptions} options
     */
    constructor(options) {
        if (options?.buffer != null)
            this.buffer = options.buffer;
        if (options?.zTestEnabled != null)
            this.zTestEnabled = options.zTestEnabled;
        if (options?.zWriteEnabled != null)
            this.zWriteEnabled = options.zWriteEnabled;
        if (options?.symbol != null)
            this.symbol = options.symbol;
        if (options?.color != null)
            this.color = options.color;
        if (options?.zNorm != null)
            this.zNorm = options.zNorm;
        if (options?.zUint != null)
            this.zUint = options.zUint;
    }

    /**
     * When true, the writer should z-test tiles before writing them
     * @type {ScreenBuffer}
     */
    get buffer() { return this.buffer_; }
    set buffer(value) { this.buffer_ = value; }

    /**
     * When true, the writer should z-test tiles before writing them
     * @type {Boolean}
     */
    get zTestEnabled() { return this.zTestEnabled_; }
    set zTestEnabled(value) { this.zTestEnabled_ = value; }

    /**
     * When true, the writer should write it's z-value,
     * otherwise the writer should not write any z-value
     * @type {Boolean}
     */
    get zWriteEnabled() { return this.zWriteEnabled_; }
    set zWriteEnabled(value) { this.zWriteEnabled_ = value; }

    /**
     * The symbol to write
     * @type {?ScreenSymbol|String}
     */
    get symbol() { return this.symbol_; }
    set symbol(value) { this.symbol_ = ScreenBuffer.getSymbolCode(value); }

    /**
     * The color to write
     * @type {?CColor}
     */
    get color() { return this.color_; }
    set color(value) { this.color_ = ScreenBuffer.getColorCode(value); }

    /**
     * The integer z-value to use
     * @type {Number}
     */
    get zUint() { return this.z_; }
    set zUint(value) { this.z_ = value; }

    /**
     * The normalized real z-value to use
     * @type {Number}
     */
    get zNorm() { return ScreenBuffer.getNormZ(this.z_); }
    set zNorm(value) { this.z_ = ScreenBuffer.getUintZ(value); }

    /**
     * Reset the writer to default properties
     */
    reset() {
        this.zTestEnabled_ = false;
        this.zWriteEnabled_ = false;
        this.symbol_ = spaceCharCode;
        this.color_ = CColor.whiteBright;
        this.z_ = zMax;
    }
    
    /**
     * The logical size of the screen
     * @type {ScreenCoord}
     */
    get size() { return this.buffer_.bufferDim; }


    /**
     * Write the entire screen
     */
    fill() {
        if (this.zTestEnabled_) {
            const endI = this.size[0] * this.size[1];

            for (let i = 0; i < endI; i++) {
                if (!(this.z_ < this.buffer.screenZBuffer.at(i)))
                    continue;

                if (this.zWriteEnabled_)
                    this.buffer.screenZBuffer[i] = this.z_;

                if (this.symbol_ != null)
                    this.buffer.screenTextBuffer[i] = this.symbol_;
                
                if (this.color_ != null)
                    this.buffer.screenColorBuffer[i] = this.color_;
            }

        } else {
            this.buffer.screenTextBuffer.fill(this.symbol_);
    
            this.buffer.screenColorBuffer.fill(this.color_);
        
            this.buffer.screenZBuffer.fill(this.z_);
        }
    }
    
    
    /**
     * Write the tile at `coord`
     * @param {Number} x 
     * @param {Number} y 
     * @returns {Boolean}
     */
    write(x, y) {
        const idx = this.buffer.symbolIndex(x, y);

        return this.writeAt(idx);
    }
    
    /**
     * Write the tile at `idx`
     * @param {Number} idx The index to write
     * @returns {Boolean}
     */
    writeAt(idx) {
        if (this.zTestEnabled_) {
            if (!(this.z_ < this.buffer.screenZBuffer.at(idx)))
                return false;
        }

        if (this.zWriteEnabled_)
            this.buffer.screenZBuffer[idx] = this.z_;

        if (this.symbol_ != null)
            this.buffer.screenTextBuffer[idx] = this.symbol_;
        
        if (this.color_ != null)
            this.buffer.screenColorBuffer[idx] = this.color_;

        return true;
    }


    /**
     * 
     * @param {Number} xMin 
     * @param {Number} xMax 
     * @param {Number} yMin 
     * @param {Number} yMax 
     */
    #writeRegion(xMin, xMax, yMin, yMax) {
        const xCount = xMax - xMin + 1;

        const [dx, dy] = this.size;

        for (let y = yMin; y <= yMax; y++) {
            const rowI = y * dx;
            const baseI = rowI + xMin;
            const endI = baseI + xCount;
            
            if (this.zTestEnabled_) {
                for (let idx = baseI; idx < endI; idx++) {
                    if (!(this.z_ < this.buffer.screenZBuffer.at(idx)))
                        continue;

                    if (this.zWriteEnabled_)
                        this.buffer.screenZBuffer[idx] = this.z_;

                    if (this.symbol_ != null)
                        this.buffer.screenTextBuffer[idx] = this.symbol_;
                    
                    if (this.color_ != null)
                        this.buffer.screenColorBuffer[idx] = this.color_;
                }
            } else {
                if (this.zWriteEnabled_)
                    this.buffer.screenZBuffer.fill(this.z_, baseI, endI);
                
                if (this.symbol_ != null)
                    this.buffer.screenTextBuffer.fill(this.symbol_, baseI, endI);
                
                if (this.color_ != null)
                    this.buffer.screenColorBuffer.fill(this.color_, baseI, endI);
            }
        }
    }

    /**
     * Write all tiles in between `first` and `second`, inclusively
     * @param {ScreenCoordLike} first The first coordinate to write
     * @param {ScreenCoordLike} second The second coordinate to write
     */
    writeRect(first, second) {
        const xMin = Math.min(first[0], second[0]), xMax = Math.max(first[0], second[0]);
        const yMin = Math.min(first[1], second[1]), yMax = Math.max(first[1], second[1]);
        
        this.#writeRegion(xMin, xMax, yMin, yMax);
    }
    
    writeRow(y) {
        this.#writeRegion(0, this.buffer.bufferDim[0], y, y);
    }
    
    writeCol(x) {
        this.#writeRegion(x, x, 0, this.buffer.bufferDim[1]);
    }
}

export default ScreenWriter;

export {
    ScreenWriter,
};