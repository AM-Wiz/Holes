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
    darkGrey: 1,
    grey: 2,
    lightGrey: 3,
    white: 4,

    darkRed: 10,
    red: 11,

    darkGreen: 12,
    green: 13,

    darkYellow: 14,
    yellow: 15,

    darkBlue: 16,
    blue: 17,

    darkMagenta: 18,
    magenta: 19,

    darkCyan: 20,
    cyan: 21,

    default: 3,
}

/**
 * The set of widely supported escape sequences
 * Taken from picocolors
 * @readonly
 * @enum {String}
 */
const CColorCodes = {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    gray: "\x1b[90m",

    blackBright: "\x1b[90m",
    redBright: "\x1b[91m",
    greenBright: "\x1b[92m",
    yellowBright: "\x1b[93m",
    blueBright: "\x1b[94m",
    magentaBright: "\x1b[95m",
    cyanBright: "\x1b[96m",
    whiteBright: "\x1b[97m",

    bgBlack: "\x1b[40m",
    bgRed: "\x1b[41m",
    bgGreen: "\x1b[42m",
    bgYellow: "\x1b[43m",
    bgBlue: "\x1b[44m",
    bgMagenta: "\x1b[45m",
    bgCyan: "\x1b[46m",
    bgWhite: "\x1b[47m",

    bgBlackBright: "\x1b[100m",
    bgRedBright: "\x1b[101m",
    bgGreenBright: "\x1b[102m",
    bgYellowBright: "\x1b[103m",
    bgBlueBright: "\x1b[104m",
    bgMagentaBright: "\x1b[105m",
    bgCyanBright: "\x1b[106m",
    bgWhiteBright: "\x1b[107m",

    fgDefault: "\x1b[39m",
    bgDefault: "\x1b[49m",
}

/**
 * Maps color codes to foreground/background color codes
 * @type {Map<CColor, CColorCodes[]>}
 */
const colorCodeMap = new Map([
    [CColor.black, [CColorCodes.black, CColorCodes.bgBlack]],
    [CColor.darkGrey, [CColorCodes.blackBright, CColorCodes.bgBlackBright]],
    [CColor.grey, [CColorCodes.gray, CColorCodes.bgWhite]],
    [CColor.lightGrey, [CColorCodes.white, CColorCodes.bgWhiteBright]],
    [CColor.white, [CColorCodes.whiteBright, CColorCodes.bgWhiteBright]],
    
    [CColor.darkRed, [CColorCodes.red, CColorCodes.bgRed]],
    [CColor.red, [CColorCodes.redBright, CColorCodes.bgRedBright]],
    [CColor.darkGreen, [CColorCodes.green, CColorCodes.bgGreen]],
    [CColor.green, [CColorCodes.greenBright, CColorCodes.bgGreenBright]],
    [CColor.darkYellow, [CColorCodes.yellow, CColorCodes.bgYellow]],
    [CColor.yellow, [CColorCodes.yellowBright, CColorCodes.bgYellowBright]],
    [CColor.darkBlue, [CColorCodes.blue, CColorCodes.bgBlue]],
    [CColor.blue, [CColorCodes.blueBright, CColorCodes.bgBlueBright]],
    [CColor.darkMagenta, [CColorCodes.magenta, CColorCodes.bgMagenta]],
    [CColor.magenta, [CColorCodes.magentaBright, CColorCodes.bgMagentaBright]],
    [CColor.darkCyan, [CColorCodes.cyan, CColorCodes.bgCyan]],
    [CColor.cyan, [CColorCodes.cyanBright, CColorCodes.bgCyanBright]],
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

/**
 * Get the color code from the color-cube portion of ansi 256 color
 * @param {Number} r
 * @param {Number} g
 * @param {Number} b
 * @returns {Color256}
 */
const get256ColorCube = (r, g, b) => {
    return 16 + Math.trunc((r * 6 + g) * 6 + b);
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
    
    stream.write(CColorCodes.fgDefault);
    stream.write(CColorCodes.bgDefault);
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