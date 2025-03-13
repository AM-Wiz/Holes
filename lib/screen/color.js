/* Taken from picocolors
 * https://github.com/alexeyraspopov/picocolors
 * Not included, as picocolors adds unwanted end tags to color regions,
 * where we simply want to be able to open color regions
 */

const p = process || {}, argv = p.argv || [], env = p.env || {};

/**
 * Taken from picocolors
 */
export const isSupported =
    !(!!env.NO_COLOR || argv.includes("--no-color")) &&
    (!!env.FORCE_COLOR || argv.includes("--color") || p.platform === "win32" || ((p.stdout || {}).isTTY && env.TERM !== "dumb") || !!env.CI);

/**
 * Colors widely supported by the console
 * @readonly
 * @enum {number}
 */
export const Color = {
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
 * @type {Map<Color, CColorCodes[]>}
 */
const colorCodeMap = new Map([
    [Color.black, [CColorCodes.black, CColorCodes.bgBlack]],
    [Color.darkGrey, [CColorCodes.blackBright, CColorCodes.bgBlackBright]],
    [Color.grey, [CColorCodes.gray, CColorCodes.bgWhite]],
    [Color.lightGrey, [CColorCodes.white, CColorCodes.bgWhiteBright]],
    [Color.white, [CColorCodes.whiteBright, CColorCodes.bgWhiteBright]],
    
    [Color.darkRed, [CColorCodes.red, CColorCodes.bgRed]],
    [Color.red, [CColorCodes.redBright, CColorCodes.bgRedBright]],
    [Color.darkGreen, [CColorCodes.green, CColorCodes.bgGreen]],
    [Color.green, [CColorCodes.greenBright, CColorCodes.bgGreenBright]],
    [Color.darkYellow, [CColorCodes.yellow, CColorCodes.bgYellow]],
    [Color.yellow, [CColorCodes.yellowBright, CColorCodes.bgYellowBright]],
    [Color.darkBlue, [CColorCodes.blue, CColorCodes.bgBlue]],
    [Color.blue, [CColorCodes.blueBright, CColorCodes.bgBlueBright]],
    [Color.darkMagenta, [CColorCodes.magenta, CColorCodes.bgMagenta]],
    [Color.magenta, [CColorCodes.magentaBright, CColorCodes.bgMagentaBright]],
    [Color.darkCyan, [CColorCodes.cyan, CColorCodes.bgCyan]],
    [Color.cyan, [CColorCodes.cyanBright, CColorCodes.bgCyanBright]],
]);


/**
 * Set the color of the following characters in the stream
 * @param {TextStreamWriter} stream The target stream
 * @param {?Color} fgColor the foreground color
 * @param {?Color} bgColor the background color
 */
export const setColor = (stream, fgColor, bgColor) => {
    if (!isSupported)
        return;

    if (Number.isInteger(fgColor)) {
        const ccode = colorCodeMap.get(fgColor)[0];

        stream.write(ccode);
    }
    
    if (Number.isInteger(bgColor)) {
        const ccode = colorCodeMap.get(bgColor)[1];
        
        stream.write(ccode);
    }
}

/**
 * Reset the color of the following characters in the stream
 * @param {TextStreamWriter} stream The target stream
 */
export const resetColor = (stream) => {
    if (!isSupported)
        return;
    
    stream.write(CColorCodes.fgDefault);
    stream.write(CColorCodes.bgDefault);
}




export default {
    isSupported,
    Color,
    setColor,
    resetColor,
};