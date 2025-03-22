import { UI16V } from "../math/vecmath.js";

import assert from "node:assert";
import { stdout as screenStream_ } from "node:process";

import { isSupported as isColorSupported_, resetColor, CColor, getColorUtf8 } from "./color.js";

export const ScreenCoord = UI16V;


/**
 * @typedef {ArrayLike<Number>} ScreenCoordLike
 */


export const ScreenSymbol = Number;

export const ScreenColor = Number;


/**
 * The charcode for empty space
 */
export const spaceCharCode = ' '.codePointAt(0);

/**
 * The character used to pad the screen buffer within the screen
 */
export const padCharCode = spaceCharCode;

export const lineCharCode = '\n'.codePointAt(0);

export const zMax = 255;



export const Screen = new class ScreenTag
{
    /**
     * Maximum screen dimensions
     */
    maxScreenDim = UI16V.from([160, 80]);
    
    hasScreen = false;

    isColorSupported = isColorSupported_;

    screenStream = screenStream_;
    
    /**
     * The screen size
     */
    realScreenSize = UI16V.from([80, 20]);

    refresh() {
        let anyChange = false;
    
        // Check if the 'screen' size has changed
        const realSize = [screenStream_.columns, screenStream_.rows];
    
        const screenFound = Number.isInteger(realSize[0]) && Number.isInteger(realSize[1]);
        
        if (screenFound != this.hasScreen) {
            this.hasScreen = screenFound;
    
            anyChange = true;
        }
    
        if (this.hasScreen) {
            this.realScreenSize.copyFrom(realSize);
        } else {
            // TODO
        }
    
        return anyChange;
    }
}

const defaultBufferPadding = 1;

export class ScreenBuffer
{
    screenPadding = defaultBufferPadding;

    realScreenSize = UI16V.from([1, 1]);

    /**
     * The size of the screen buffer (slightly smaller than the screen)
     */
    bufferDim = UI16V.from([1, 1]);
    
    /**
     * The screen text buffer.
     * Contains the character codes to be displayed
     */
    screenTextBuffer = new Uint16Array([0]);
    /**
     * The screen color buffer.
     * Contains the character colors to be displayed
     */
    screenColorBuffer = new Uint8Array([0]);
    /**
     * The screen z-buffer.
     * Contains the character 'depths'
     */
    screenZBuffer = new Uint8Array([0]);
 


    get size() { return this.bufferDim; }


    symbolIndex(x, y) { return x + this.bufferDim[0] * y; }
    rowIndex(y) { return this.bufferDim[0] * y; }


    getSymbolAt(i) { return this.screenTextBuffer[i]; }
    setSymbolAt(value, i) { this.screenTextBuffer[i] = value; }

    getColorAt(i) { return this.screenColorBuffer[i]; }
    setColorAt(value, i) { this.screenColorBuffer[i] = value; }

    
    /**
     * Get the color code for `color`
     * @param {?CColor|Number} color The `Color`
     * @returns {?Number} The integral color code for `color`
     */
    static getColorCode(color) {
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
     * Get the ascii code for `symbol`
     * @param {?String|ScreenSymbol} symbol The symbol
     * @returns {?ScreenSymbol} The ascii code for the symbol
     */
    static getSymbolCode (symbol) {
        if (Number.isInteger(symbol)) {
            // Is already a character code
        } else if (typeof symbol === "string") {
            symbol = symbol.codePointAt(0);
        } else if (symbol == null) {
            // No symbol specified
            symbol = null;
        } else {
            assert.fail();
        }
    
        return symbol;
    }

    /**
     * Get the integer z value
     * @param {?Number} unormZ The normalized z value
     * @returns {?Number}
     */
    static getUintZ(unormZ) {
        if (typeof unormZ === 'number') {
            unormZ = Math.trunc(unormZ * zMax);
        } else if (unormZ == null) {
            unormZ = null;
        } else {
            assert.fail();
        }

        return unormZ;
    }

    /**
     * 
     * @param {?Number} uintZ 
     * @returns {?Number}
     */
    static getNormZ(uintZ) {
        if (typeof uintZ === 'number') {
            uintZ = uintZ / zMax;
        } else if (uintZ == null) {
            uintZ = null;
        } else {
            assert.fail();
        }

        return uintZ;
    }

    getZUintAt(i) { return this.screenZBuffer[i]; }
    setZUintAt(value, i) { this.screenZBuffer[i] = value; }
    getZAt(i) { return ScreenBuffer.getNormZ(this.screenZBuffer[i]); }
    setZAt(value, i) { this.screenZBuffer[i] = ScreenBuffer.getUintZ(value); }
    testZAt(value, i) { return ScreenBuffer.getUintZ(value) < this.screenZBuffer[i]; }
    testSetZAt(value, i) {
        value = ScreenBuffer.getUintZ(value);

        if (!(value < this.screenZBuffer[i]))
            return false;

        this.screenZBuffer[i] = value;
        return true;
    }


    
    refresh() {
        let anyChange = false;

        if (Screen.hasScreen && !this.realScreenSize.equals(Screen.realScreenSize)) {
            // Store screen size
            this.realScreenSize.copyFrom(Screen.realScreenSize);
    
            // Update buffer dimensions including padding
            this.bufferDim[0] = Math.min(this.realScreenSize[0], Screen.maxScreenDim[0]) - 2*this.screenPadding;
            this.bufferDim[1] = Math.min(this.realScreenSize[1], Screen.maxScreenDim[1]) - 2*this.screenPadding;
    
            // Ensure buffer has capacity for new dimensions
            const reqBufCap = this.bufferDim[0] * this.bufferDim[1];
            if (reqBufCap > this.screenTextBuffer.length) {
                this.screenTextBuffer = new Uint16Array(reqBufCap).fill(spaceCharCode);
                this.screenColorBuffer = new Uint8Array(reqBufCap).fill(CColor.whiteBright);
                this.screenZBuffer = new Uint8Array(reqBufCap).fill(zMax);
            }
    
            anyChange = true;
        }

        return anyChange;
    }

    
    clearZ() {
        this.screenZBuffer.fill(zMax);
    }

    clear() {
        this.screenTextBuffer.fill(spaceCharCode);
        this.screenColorBuffer.fill(CColor.whiteBright);
        this.screenZBuffer.fill(zMax);
    }
}