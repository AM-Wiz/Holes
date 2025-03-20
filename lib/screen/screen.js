
import { isSupported as isColorSupported, setColor, resetColor, CColor, getCColorSeq } from "./color.js";

import { UI16V } from "../math/vecmath.js";

import { stdout as screenStream } from "node:process";
import { TextEncoder } from "node:util";

import assert from "node:assert";


const screenPadding = 1;

export const ScreenCoord = UI16V;


/**
 * @typedef {ArrayLike<Number>} ScreenCoordLike
 */


export const ScreenSymbol = Number;


/**
 * The charcode for empty space
 */
const spaceCharCode = ' '.charCodeAt(0);

/**
 * Maximum screen dimensions
 */
let maxScreenDim = Uint32Array.from([160, 80]);

let hasScreen = false;

/**
 * The screen size
 */
let realScreenSize = Uint32Array.from([80, 20]);
/**
 * The size of the screen buffer (slightly smaller than the screen)
 */
let bufferDim = Uint32Array.from([realScreenSize[0] - 2*screenPadding, realScreenSize[1] - 2*screenPadding]);

/**
 * The character used to pad the screen buffer within the screen
 */
const padCharCode = spaceCharCode;

/**
 * The current buffer capacity
 */
let screenBufferCap = bufferDim[0] * bufferDim[1];
/**
 * The screen text buffer.
 * Contains the character codes to be displayed
 */
let screenTextBuffer = new Uint16Array(screenBufferCap);
/**
 * The screen color buffer.
 * Contains the character colors to be displayed
 */
let screenColorBuffer = new Uint8Array(screenBufferCap);
/**
 * The screen z-buffer.
 * Contains the character 'depths'
 */
let screenZBuffer = new Uint8Array(screenBufferCap);

const zMax = 255;


const printBuff = new class PrintBuffer
{
    buffer = new Uint8Array(1000);
    cursor = 0;
    encoder = new TextEncoder();


    #ensureCapacity(capacity) {
        while (capacity > this.buffer.length) {
            const npar = new Uint8Array(this.buffer.length + 1000); // TODO optimize
            
            npar.set(this.buffer);
    
            this.buffer = npar;
        }
    }

    strip() {
        let dst = 0, src = 0, end = this.cursor;
        for (; src < end; src++) {
            const c = this.buffer[src];
            if (c == 0)
                continue;
            
            this.buffer[dst++] = c;
        }

        this.cursor = dst;
    }

    getSlice() { return new Uint8Array(this.buffer.buffer, 0, this.cursor); }
    
    /**
     * 
     * @param {ArrayLike<Number>|String} chunk 
     * @param {?Number} start 
     * @param {?Number} count 
     */
    pushChunk(chunk, start, count) {
        if (typeof chunk === 'string') {
            start = 0;
            count = chunk.length;

            this.#ensureCapacity(this.cursor + count * 2);

            const destAr = new Uint8Array(this.buffer.buffer, this.cursor, count);

            const { read, written } = this.encoder.encodeInto(chunk, destAr);

            assert.ok(read === count);
            
            this.cursor += written;
        } else if (chunk instanceof ArrayBuffer || chunk?.buffer instanceof ArrayBuffer) {
            let cBuff, stride, bufLen;

            if (chunk instanceof ArrayBuffer)
                [cBuff, stride, bufLen] = [chunk, 1, chunk.byteLength];
            else
                [cBuff, stride, bufLen] = [chunk.buffer, chunk.BYTES_PER_ELEMENT, chunk.length];
            
            start ??= 0;
            count ??= bufLen;
            
            assert.ok(Number.isInteger(count));
            
            assert.ok(cBuff instanceof ArrayBuffer);
            
            this.#ensureCapacity(this.cursor + count * stride);
            
            this.buffer.set(new Uint8Array(cBuff, start * stride, count * stride), this.cursor);

            this.cursor += count * stride;
        } else {
            assert.fail();
        }
    }


    pushMany(value, count) {
        const code = typeof value === 'number' ? value : value.charCodeAt(0);
        
        this.#ensureCapacity(this.cursor + count);

        this.buffer.fill(code, this.cursor, this.cursor + count);

        this.cursor += count;
    }
    
    /**
     * 
     * @param {CColor} color color
     */
    pushColor(color) {
        const cSeq = getCColorSeq(color, true);

        this.pushChunk(cSeq);
    }

    reset() {
        this.cursor = 0;
    }
};


/**
 * Clear the screen
 */
const clearScreen = () => {
    screenStream.write('\x1Bc');
}

const resetCursor = () => {
    screenStream.cursorTo(0, 0);
}

/**
 * Print the formatted screen buffer to the screen
 */
const printScreen = () => {
    if (!hasScreen)
        throw new Error("Screen not available");

    printBuff.reset();

    let segColor = CColor.white;
    printBuff.pushColor(segColor); // Initialize the color

    // Add the top padding
    printBuff.pushMany(padCharCode, bufferDim[0]);
    printBuff.pushChunk('\n');


    let prevSegI, curSegI;

    // Called during the loop to print segments with contiguous coloration
    const dumpSeg = () => {
        if (!(prevSegI < curSegI)) // No chars to write, skip
            return;

        printBuff.pushColor(segColor);
        // Write the segment
        printBuff.pushChunk(screenTextBuffer, prevSegI, curSegI - prevSegI);

        // Update our segment start-point
        prevSegI = curSegI;
    };

    for (let y = 0, yEnd = bufferDim[1]; y < yEnd; y++) {
        const rowI = (yEnd - y - 1) * bufferDim[0];

        prevSegI = rowI, curSegI = rowI;
        
        printBuff.pushMany(padCharCode, 1); // Write the left pad

        // Loop through chars, check for differently-colored segments
        for (let x = 0, xEnd = bufferDim[0]; x < xEnd; x++, curSegI++) {
            const curColor = screenColorBuffer.at(curSegI);

            if (isColorSupported && segColor != curColor) {
                // Differently colored segment found
                dumpSeg(); // Dump the prior segment
                
                // Update the color of the following segment
                segColor = curColor;
            }
        }

        // Dump any remaining segment
        dumpSeg();

        // End the row
        printBuff.pushChunk('\n');
    }

    resetCursor();

    printBuff.strip();
    const pbSlice = printBuff.getSlice();

    screenStream.write(pbSlice, 'utf-8');
    
    // Reset the color so that any following text is not colored
    resetColor(screenStream);
}

/**
 * Refresh the screen state
 * @returns true if the screen properties changed
 */
const refreshScreen = () => {
    let anyChange = false;
    
    // Check if the 'screen' size has changed
    const realSize = [screenStream.columns, screenStream.rows];

    const screenFound = Number.isInteger(realSize[0]) && Number.isInteger(realSize[1]);
    
    if (screenFound != hasScreen) {
        hasScreen = screenFound;

        anyChange = true;
    }

    if (!hasScreen) {
        // TODO
    }
    
    if (hasScreen && !(realSize[0] == realScreenSize[0] && realSize[1] == realScreenSize[1])) {
        // Store screen size
        realScreenSize[0] = realSize[0], maxScreenDim[0];
        realScreenSize[1] = realSize[1], maxScreenDim[1];

        // Update buffer dimensions including padding
        bufferDim[0] = Math.min(realScreenSize[0], maxScreenDim[0]) - 2*screenPadding;
        bufferDim[1] = Math.min(realScreenSize[1], maxScreenDim[1]) - 2*screenPadding;

        // Ensure buffer has capacity for new dimensions
        const reqBufCap = bufferDim[0] * bufferDim[1];
        if (reqBufCap > screenBufferCap) {
            screenBufferCap = reqBufCap;
            screenTextBuffer = new Uint16Array(screenBufferCap).fill(spaceCharCode);
            screenColorBuffer = new Uint8Array(screenBufferCap).fill(CColor.default);
            screenZBuffer = new Uint8Array(screenBufferCap).fill(zMax);
        }

        anyChange = true;
    }

    return anyChange;
}

const clearScreenZBuffer = () => {
    screenZBuffer.fill(zMax);
}


/**
 * Get the ascii code for `symbol`
 * @param {?String|ScreenSymbol} symbol The symbol
 * @returns {?ScreenSymbol} The ascii code for the symbol
 */
const getSymbolCode = (symbol) => {
    if (Number.isInteger(symbol)) {
        // Is already a character code
    } else if (typeof symbol === "string") {
        symbol = symbol.charCodeAt(0);
    } else if (symbol == null) {
        // No symbol specified
        symbol = null;
    } else {
        throw new Error();
    }

    return symbol;
}

/**
 * Get the color code for `color`
 * @param {?CColor|Number} color The `Color`
 * @returns {?Number} The integral color code for `color`
 */
const getColorCode = (color) => {
    if (Number.isInteger(color)) {
        // Is already a color code
    } else if (color == null) {
        // No color specified
        color = null;
    } else {
        throw new Error();
    }

    return color;
}

/**
 * Get the integer z value
 * @param {?Number} unormZ The normalized z value
 * @returns {?Number}
 */
const getUintZ = (unormZ) => {
    if (typeof unormZ === 'number') {
        unormZ = Math.trunc(unormZ * zMax);
    } else if (unormZ == null) {
        unormZ = null;
    } else {
        throw new Error();
    }

    return unormZ;
}

/**
 * 
 * @param {?Number} uintZ 
 * @returns {?Number}
 */
const getNormZ = (uintZ) => {
    if (typeof uintZ === 'number') {
        uintZ = uintZ / zMax;
    } else if (uintZ == null) {
        uintZ = null;
    } else {
        throw new Error();
    }

    return uintZ;
}


const getScreenSize = () => bufferDim;

const getScreenRowIndex = (y) => y * bufferDim[0];


class ScreenWriter
{
    /** @type {Boolean} */
    zTestEnabled_ = false;
    /** @type {Boolean} */
    zWriteEnabled_ = false;
    /** @type {?ScreenSymbol} */
    symbol_ = spaceCharCode;
    /** @type {?CColor} */
    color_ = CColor.default;
    /** @type {Number} */
    z_ = zMax;


    /**
     * @typedef SWOptions
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
    set symbol(value) { this.symbol_ = getSymbolCode(value); }

    /**
     * The color to write
     * @type {?CColor}
     */
    get color() { return this.color_; }
    set color(value) { this.color_ = getColorCode(value); }

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
    get zNorm() { return getNormZ(this.z_); }
    set zNorm(value) { this.z_ = getUintZ(value); }

    /**
     * Reset the writer to default properties
     */
    reset() {
        this.zTestEnabled_ = false;
        this.zWriteEnabled_ = false;
        this.symbol_ = spaceCharCode;
        this.color_ = CColor.default;
        this.z_ = zMax;
    }
    
    /**
     * The logical size of the screen
     * @type {ScreenCoord}
     */
    get size() { return getScreenSize(); }


    /**
     * Write the entire screen
     */
    fill() {
        if (this.zTestEnabled_) {
            const endI = bufferDim[0] * bufferDim[1];

            for (let i = 0; i < endI; i++) {
                if (!(this.z_ < screenZBuffer.at(i)))
                    continue;

                if (this.zWriteEnabled_)
                    screenZBuffer[i] = this.z_;

                if (this.symbol_ != null)
                    screenTextBuffer[i] = this.symbol_;
                
                if (this.color_ != null)
                    screenColorBuffer[i] = this.color_;
            }

        } else {
            screenTextBuffer.fill(this.symbol_);
    
            screenColorBuffer.fill(this.color_);
        
            screenZBuffer.fill(this.z_);
        }
    }
    
    
    /**
     * Write the tile at `coord`
     * @param {ScreenCoordLike} coord The coordinate to write
     * @returns {Boolean}
     */
    write(coord) {
        const idx = coord[0] + coord[1] * bufferDim[0];

        return this.writeAt(idx);
    }
    
    /**
     * Write the tile at `idx`
     * @param {Number} idx The index to write
     * @returns {Boolean}
     */
    writeAt(idx) {
        if (this.zTestEnabled_) {
            if (!(this.z_ < screenZBuffer.at(idx)))
                return false;
        }

        if (this.zWriteEnabled_)
            screenZBuffer[idx] = this.z_;

        if (this.symbol_ != null)
            screenTextBuffer[idx] = this.symbol_;
        
        if (this.color_ != null)
            screenColorBuffer[idx] = this.color_;

        return true;
    }


    #writeRegion(xMin, xMax, yMin, yMax) {
        const xCount = xMax - xMin + 1;

        for (let y = yMin; y <= yMax; y++) {
            const rowI = y * bufferDim[0];
            const baseI = rowI + xMin;
            const endI = baseI + xCount;
            
            if (this.zTestEnabled_) {
                for (let idx = baseI; idx < endI; idx++) {
                    if (!(this.z_ < screenZBuffer.at(idx)))
                        continue;

                    if (this.zWriteEnabled_)
                        screenZBuffer[idx] = this.z_;

                    if (this.symbol_ != null)
                        screenTextBuffer[idx] = this.symbol_;
                    
                    if (this.color_ != null)
                        screenColorBuffer[idx] = this.color_;
                }
            } else {
                if (this.zWriteEnabled_)
                    screenZBuffer.fill(this.z_, baseI, endI);
                
                if (this.symbol_ != null)
                    screenTextBuffer.fill(this.symbol_, baseI, endI);
                
                if (this.color_ != null)
                    screenColorBuffer.fill(this.color_, baseI, endI);
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
        this.#writeRegion(0, bufferDim[0], y, y);
    }
    
    writeCol(x) {
        this.#writeRegion(x, x, 0, bufferDim[1]);
    }
}


export {
    getSymbolCode,
    
    ScreenWriter,

    printScreen,
    clearScreen,
    refreshScreen,
    clearScreenZBuffer,

    getScreenSize,
    getScreenRowIndex,
};


export default {
    getSymbolCode,

    ScreenWriter,

    printScreen,
    clearScreen,
    refreshScreen,
    clearScreenZBuffer,

    getScreenSize,
    getScreenRowIndex,
};