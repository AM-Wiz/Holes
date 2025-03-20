/* Taken from picocolors
 * https://github.com/alexeyraspopov/picocolors
 * Not included, as picocolors adds unwanted end tags to color regions,
 * where we simply want to be able to open color regions
 */

const p = process || {}, argv = p.argv || [], env = p.env || {};

/**
 * Taken from picocolors
 */
const isSupported =
    !(!!env.NO_COLOR || argv.includes("--no-color")) &&
    (!!env.FORCE_COLOR || argv.includes("--color") || p.platform === "win32" || ((p.stdout || {}).isTTY && env.TERM !== "dumb") || !!env.CI);

/**
 * Colors widely supported by the console
 * @readonly
 * @enum {number}
 */
const CColor = {
    black: 0,
    red: 1,
    green: 2,
    yellow: 3,
    blue: 4,
    magenta: 5,
    cyan: 6,
    white: 7,

    blackBright: 8 + 0,
    redBright: 8 + 1,
    greenBright: 8 + 2,
    yellowBright: 8 + 3,
    blueBright: 8 + 4,
    magentaBright: 8 + 5,
    cyanBright: 8 + 6,
    whiteBright: 8 + 7,
}

/**
 * Maps color codes to foreground/background color codes
 * @type {Map<CColor, CColorCodes[]>}
 */
const colorCodeMap = new Map([
    ...
    Object.values(CColor).map(c => {
        let [fg, bg] = [c, c];
        if (c >= CColor.blackBright)
            fg += 90 - CColor.blackBright, bg += 100 - CColor.blackBright;
        else
            fg += 30 - CColor.black, bg += 40 - CColor.black;

        return [c, [`\x1b[${fg}m`, `\x1b[${bg}m`]];
    }),
    ...
    (function* () {
        for (let index = 16; index < 256; index++) {
            yield [index, [`\x1b[38;5;${index}m`, `\x1b[48;5;${index}m`]];
        }
    })()
]);

/**
 * Get the ansi color sequence associated with a common color
 * @param {CColor} color 
 * @param {Boolean} fgOrBg 
 * @returns {String}
 */
const getCColorSeq = (color, fgOrBg) => {
    return colorCodeMap.get(color)[fgOrBg ? 0 : 1];
}


/**
 * Set the color of the following characters in the stream
 * @param {TextStreamWriter} stream The target stream
 * @param {?CColor} fgColor the foreground color
 * @param {?CColor} bgColor the background color
 */
const setColor = (stream, fgColor, bgColor) => {
    if (!isSupported)
        return;

    if (Number.isInteger(fgColor)) {
        const ccode = getCColorSeq(fgColor, true);

        stream.write(ccode);
    }
    
    if (Number.isInteger(bgColor)) {
        const ccode = getCColorSeq(bgColor, false);
        
        stream.write(ccode);
    }
}



/**
 * @typedef {Number} Color256
 */


const clip256ColorCubeChannel = (x) => Math.min(Math.trunc(x * 6), 5);

/**
 * Get the color code from the color-cube portion of ansi 256 color
 * @param {Number} r
 * @param {Number} g
 * @param {Number} b
 * @returns {Color256}
 */
const get256ColorCube = (r, g, b) => {
    r = clip256ColorCubeChannel(r), g = clip256ColorCubeChannel(g), b = clip256ColorCubeChannel(b);
    return 16 + (r * 6 + g) * 6  + b;
}

/**
 * Get the color code from the grey-scale portion of ansi 256 color
 * @param {Number} grey
 * @returns {Color256}
 */
const get256ColorGrey = (grey) => {
    return 232 + Math.trunc(grey * (255 - 232));
}


/**
 * Compute the alignment of a color with the grey-scale gradient
 * @param {Number} r
 * @param {Number} g
 * @param {Number} b
 */
const colorSine = (r, g, b) => {
    const x = 0.5773; // One axis or the grey-aligned normal-vector
    
    const ar = g - b, ag = b - r, ab = r - g; // Compute the cross product without x

    return x * (Math.sqrt(ar*ar + ag*ag + ab*ab)) // Compute the length of the cross product with the grey-aligned vector

    // TODO Can we eliminate the sqrt?
}

/**
 * Get the color code from either the color-cube or grey-scale portions of ansi 256 color
 * @param {Number} r
 * @param {Number} g
 * @param {Number} b
 * @returns {Color256}
 */
const get256Color = (r, g, b) => {
    if (colorSine(r, g, b) <= 0.05)
        return get256ColorGrey((r + g + b) / 3);
    else
        return get256ColorCube(r, g, b);
}

/**
 * Get the ansi color sequence associated with a color-code
 * @param {Color256} color 
 * @param {Boolean} fgOrBg 
 * @returns {String}
 */
const get256ColorSeq = (color, fgOrBg) => {
    return fgOrBg ? `\x1b[38;5;(${color})m` : `\x1b[48;5;(${color})m`;
};


/**
 * @param {TextStreamWriter} stream 
 * @param {Boolean} fOrB 
 * @param {Color256} code
 */
const write256Color = (stream, fOrB, code) => {
    stream.write(fOrB ? '\x1b[38;5;(' : '\x1b[48;5;(');
    stream.write(`${code}`); // TODO
    stream.write(')m');
}

/**
 * Set the color of the following characters in the stream
 * @param {TextStreamWriter} stream The target stream
 * @param {ArrayLike<Number>|Color256} fgColor
 * @param {ArrayLike<Number>|Color256} bgColor
 */
const setColor256 = (stream, fgColor, bgColor) => {
    if (!isSupported)
        return;

    const getColor_ = (color) => {
        if (typeof color === 'number')
            return color;
        else
            return get256Color(color[0], color[1], color[2]);
    }

    if (fgColor != null) {
        const ccode = getColor_(fgColor);

        write256Color(stream, true, ccode);
    }
    
    if (bgColor != null) {
        const ccode = getColor_(bgColor);
        
        write256Color(stream, false, ccode);
    }
}



/**
 * Reset the color of the following characters in the stream
 * @param {TextStreamWriter} stream The target stream
 */
const resetColor = (stream) => {
    if (!isSupported)
        return;
    
    stream.write(`\x1b[39m\x1b[49m`);
}


export {
    isSupported,
    
    CColor,
    getCColorSeq,

    get256Color,
    get256ColorCube,
    get256ColorGrey,
    get256ColorSeq,

    setColor256,

    setColor,
    resetColor,
};


export default {
    isSupported,

    CColor,
    getCColorSeq,

    get256Color,
    get256ColorCube,
    get256ColorGrey,
    get256ColorSeq,

    setColor256,

    setColor,
    resetColor,
};