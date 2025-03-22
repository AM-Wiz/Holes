import { Screen, ScreenBuffer, spaceCharCode, padCharCode, lineCharCode } from './screen.js';

import { isSupported as isColorSupported, resetColor, CColor, getColorUtf8 } from "./color.js";

import { UI16V } from "../math/vecmath.js";

import { TextEncoder } from "node:util";

import assert from "node:assert";

import { encodeInto8, countBytes8 } from "../utility/encode.js"; 


const printBuff = new class PrintBuffer
{
    buffer = new Uint8Array(1000);
    cursor = 0;
    encoder = new TextEncoder();


    #ensureCapacity(extraCap) {
        const capacity = this.cursor + extraCap;
        if (capacity < this.buffer.length)
            return;

        let newCap = this.buffer.length;
        while (newCap < capacity) {
            newCap += 1000;
        }

        const npar = new Uint8Array(newCap); // TODO optimize
        
        npar.set(this.buffer);

        this.buffer = npar;
    }

    getSlice() { return new Uint8Array(this.buffer.buffer, 0, this.cursor); }
    

    /**
     * 
     * @param {String} text 
     */
    pushText(text) {
        assert.ok(typeof text === 'string');
        
        this.#ensureCapacity(text.length * encodeInto8.minSafeByteCount);

        const destAr = new Uint8Array(this.buffer.buffer, this.cursor, text.length);
        
        const { read, written } = this.encoder.encodeInto(text, destAr);

        assert.ok(read == text.length);

        this.cursor += written;
    }
    
    /**
     * 
     * @param {Uint8Array} utf8 
     * @param {?Number} start 
     * @param {?Number} count 
     */
    pushPreformatted(utf8, start, count) {
        assert.ok(utf8 instanceof Uint8Array);

        start ??= 0;
        count ??= utf8.length;
        
        this.#ensureCapacity(count);
        this.buffer.set(new Uint8Array(utf8.buffer, utf8.byteOffset + start, count), this.cursor);
        
        this.cursor += count;
    }

    /**
     * 
     * @param {ArrayLike<Number>} codePoints 
     * @param {?Number} start 
     * @param {?Number} count 
     */
    pushCodePoints(codePoints, start, count) {
        assert.ok(codePoints instanceof Uint16Array);
        
        start ??= 0;
        count ??= codePoints.length;
        
        this.#ensureCapacity(count * encodeInto8.minSafeByteCount);

        for (let src = start, srcEnd = start + count; src < srcEnd; src++) {
            const written = encodeInto8(codePoints[src], this.buffer, this.cursor);
            this.cursor += written;
        }
    }
    
    /**
     * 
     * @param {Number} codePoint 
     */
    pushCodePoint(codePoint) {
        assert.ok(typeof codePoint === 'number');
        
        this.#ensureCapacity(encodeInto8.minSafeByteCount);

        const written = encodeInto8(codePoint, this.buffer, this.cursor);
        this.cursor += written;
    }

    /**
     * 
     * @param {String|Number} value 
     * @param {Number} count 
     */
    pushMany(value, count) {
        const code = typeof value === 'number' ? value : value.codePointAt(0);
        
        const vLen = countBytes8(code);
        this.#ensureCapacity(this.cursor + count * vLen);

        if (vLen == 1) {
            this.buffer.fill(code, this.cursor, this.cursor + count);
        } else {
            throw new Error("Not implemented");
        }

        this.cursor += count * vLen;
    }
    
    /**
     * 
     * @param {CColor} color color
     */
    pushColor(color) {
        const cSeq = getColorUtf8(color, true);

        this.pushPreformatted(cSeq);
    }

    reset() {
        this.cursor = 0;
    }
};


/**
 * Clear the screen
 */
export const clearScreen = () => {
    Screen.screenStream.write('\x1Bc');
}

export const resetCursor = () => {
    Screen.screenStream.cursorTo(0, 0);
}

/**
 * Print the formatted screen buffer to the screen
 * @param {ScreenBuffer} buffer
 */
export const printScreen = (buffer) => {
    if (!Screen.hasScreen)
        throw new Error("Screen not available");

    printBuff.reset();

    const [dx, dy] = buffer.bufferDim;

    let segColor = CColor.whiteBright;
    printBuff.pushColor(segColor); // Initialize the color

    // Add the top padding
    printBuff.pushMany(padCharCode, dx + 2* buffer.screenPadding);
    printBuff.pushCodePoint(lineCharCode);


    let prevSegI = 0, curSegI = 0;

    // Called during the loop to print segments with contiguous coloration
    const dumpSeg = () => {
        if (!(prevSegI < curSegI)) // No chars to write, skip
            return;

        printBuff.pushColor(segColor);
        // Write the segment
        printBuff.pushCodePoints(buffer.screenTextBuffer, prevSegI, curSegI - prevSegI);

        // Update our segment start-point
        prevSegI = curSegI;
    };

    for (let y = 0; y < dy; y++) {
        const rowI = (dy - y - 1) * dx;

        prevSegI = rowI, curSegI = rowI;
        
        printBuff.pushMany(padCharCode, 1); // Write the left pad

        // Loop through chars, check for differently-colored segments
        for (let x = 0; x < dx; x++, curSegI++) {
            const curColor = buffer.getColorAt(curSegI);

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
        printBuff.pushCodePoint(lineCharCode);
    }

    resetCursor();

    const pbSlice = printBuff.getSlice();

    Screen.screenStream.write(pbSlice, 'utf-8');
    
    // Reset the color so that any following text is not colored
    resetColor(Screen.screenStream);
}
