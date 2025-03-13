
import { isSupported as isColorSupported, setColor, resetColor, Color } from "./color.js";

import { UI16V } from "../math/vecmath.js";

import { stdout as screenStream } from "node:process";
const screenPadding = 1;

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
let screenSize = Uint32Array.from([80, 20]);
/**
 * The size of the screen buffer (slightly smaller than the screen)
 */
let bufferDim = Uint32Array.from([screenSize[0] - 2*screenPadding, screenSize[1] - 2*screenPadding]);

/**
 * The character used to pad the screen buffer within the screen
 */
const padCharCode = spaceCharCode;
/**
 * A character sequence which will be used to pad the top of the screen
 */
let buffTopPad = new Uint32Array(bufferDim[0]).fill(padCharCode);
/**
 * A character sequence which will be used to pad the left of the screen
 */
let buffLeftPad = new Uint32Array(1).fill(padCharCode);

/**
 * The current buffer capacity
 */
let screenBufferCap = bufferDim[0] * bufferDim[1];
/**
 * The screen text buffer.
 * Contains the character codes to be displayed
 */
let screenTextBuffer = new Uint8Array(screenBufferCap);
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

/**
 * Clear the screen
 */
const clearScreen = () => {
    screenStream.write('\x1Bc');
}

/**
 * Print the formatted screen buffer to the screen
 */
const printScreen = () => {
    if (!hasScreen)
        throw new Error("Screen not available");

    screenStream.cork();

    clearScreen();

    let curColor = Color.white;
    setColor(screenStream, curColor); // Initialize the color

     // Add the top padding
    screenStream.write(buffTopPad, 'ascii');
    screenStream.write('\n');

    for (let y = 0, yEnd = bufferDim[1]; y < yEnd; y++) {
        const rowI = (yEnd - y - 1) * bufferDim[0];

        screenStream.write(buffLeftPad, 'ascii'); // Write the left pad

        let prevSegI = rowI;
        let curSegI = rowI;

        // Called during the loop to print segments with contiguous coloration
        const dumpSeg = () => {
            if (!(prevSegI < curSegI)) // No chars to write, skip
                return;

            // Get the segment to write
            const seg = new DataView(screenTextBuffer.buffer, prevSegI, curSegI - prevSegI);

            // Write the segment
            screenStream.write(seg, 'ascii');

            // Update our segment start-point
            prevSegI = curSegI;
        };

        // Loop through chars, check for differently-colored segments
        for (let x = 0, xEnd = bufferDim[0]; x < xEnd; x++, curSegI++) {
            if (isColorSupported && curColor != screenColorBuffer[curSegI]) {
                // Differently colored segment found
                dumpSeg(); // Dump the prior segment
                
                // Update the color of the following segment
                curColor = screenColorBuffer[curSegI];
                setColor(screenStream, curColor);
            }
        }

        // Dump any remaining segment
        dumpSeg();

        // End the row
        screenStream.write('\n');
    }

    // Reset the color so that any following text is not colored
    resetColor(screenStream);

    screenStream.uncork();
};

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
    
    if (hasScreen && !(realSize[0] == screenSize[0] && realSize[1] == screenSize[1])) {
        // Store screen size
        screenSize[0] = realSize[0], maxScreenDim[0];
        screenSize[1] = realSize[1], maxScreenDim[1];

        // Update buffer dimensions including padding
        bufferDim[0] = Math.min(screenSize[0], maxScreenDim[0]) - 2*screenPadding;
        bufferDim[1] = Math.min(screenSize[1], maxScreenDim[1]) - 2*screenPadding;

        // Create our top-pad sequence (will be reused many times)
        buffTopPad = new Uint32Array(bufferDim[0]).fill(padCharCode);
    
        // Ensure buffer has capacity for new dimensions
        const reqBufCap = bufferDim[0] * bufferDim[1];
        if (reqBufCap > screenBufferCap) {
            screenBufferCap = reqBufCap;
            screenTextBuffer = new Uint8Array(screenBufferCap);
            screenColorBuffer = new Uint8Array(screenBufferCap);
            screenZBuffer = new Uint8Array(screenBufferCap);
        }

        anyChange = true;
    }

    return anyChange;
}

/**
 * Get the ascii code for `symbol`
 * @param {?String|Number} symbol The symbol
 * @returns {?Number} The ascii code for the symbol
 */
const getAsciiCode = (symbol) => {
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
};

/**
 * Get the color code for `color`
 * @param {?Color|Number} color The `Color`
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
};

/**
 * 
 * @param {Number|UI16V} coord The coordinate
 * @returns {Number}
 */
const getBufferIndex = (coord) => {
    if (Number.isInteger(coord)) {
        
    } else if (coord instanceof UI16V) {
        coord = coord[0] + coord[1] * bufferDim[1];
    } else {
        throw new Error();
    }

    return coord;
};

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
};

/**
 * Change the symbol at `coord` to `symbol` with `color`
 * @param {Number|UI16V} coord The coordinate of the write
 * @param {?Number|String} symbol The symbol, or null ot leave the symbol alone
 * @param {?Color} color The color of the symbol, or null to leave the color alone
 * @param {?Number} z The z-level of the symbol, or null to write unconditionally
 */
const writeBuffer = (coord, symbol, color, z) => {
    // Check our coordinates
    if (!(coord[0] >= 0 && coord[0] < bufferDim[0]) || !(coord[1] >= 0 && coord[1] < bufferDim[1]))
        return;
    
    // Get the index
    const idx = getBufferIndex(coord);

    z = getUintZ(z);

    // Resolve the symbol-ascii code
    symbol = getAsciiCode(symbol);
    
    // Resolve the color code
    color = getColorCode(color);
    
    if (z !== null) {
        // Z-test the input
        if (!(z < screenZBuffer[idx]))
            return;
        
        screenZBuffer[idx] = z;
    }

    if (symbol !== null)
        screenTextBuffer[idx] = symbol;
    
    if (color !== null)
        screenColorBuffer[idx] = color;
};

/**
 * Clear the screen buffer with a symbol
 * @param {?Number|String} symbol The symbol to clear the buffer with
 * @param {?Color} color The color to clear the buffer with
 */
const clearBuffer = (symbol, color, z) => {
    symbol = getAsciiCode(symbol) || spaceCharCode;

    color = getColorCode(color) || Color.default;

    z = getUintZ(z) || zMax;
    
    screenTextBuffer.fill(symbol);

    screenColorBuffer.fill(color);

    screenZBuffer.fill(z);
};


export default {
    printScreen,
    clearScreen,
    refreshScreen,

    writeBuffer,
    clearBuffer,
    screenSize: () => bufferDim,
};