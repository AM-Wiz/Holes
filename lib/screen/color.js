import picocol from "picocolors";

export const isSupported = picocol.isColorSupported;

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
 * Taken from picocolor
 */
const colorCodes = {
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

const colorCodeMap = new Map([
    [Color.black, [colorCodes.black, colorCodes.bgBlack]],
    [Color.darkGrey, [colorCodes.blackBright, colorCodes.bgBlackBright]],
    [Color.grey, [colorCodes.gray, colorCodes.bgWhite]],
    [Color.lightGrey, [colorCodes.white, colorCodes.bgWhiteBright]],
    [Color.white, [colorCodes.whiteBright, colorCodes.bgWhiteBright]],
    
    [Color.darkRed, [colorCodes.red, colorCodes.bgRed]],
    [Color.red, [colorCodes.redBright, colorCodes.bgRedBright]],
    [Color.darkGreen, [colorCodes.green, colorCodes.bgGreen]],
    [Color.green, [colorCodes.greenBright, colorCodes.bgGreenBright]],
    [Color.darkYellow, [colorCodes.yellow, colorCodes.bgYellow]],
    [Color.yellow, [colorCodes.yellowBright, colorCodes.bgYellowBright]],
    [Color.darkBlue, [colorCodes.blue, colorCodes.bgBlue]],
    [Color.blue, [colorCodes.blueBright, colorCodes.bgBlueBright]],
    [Color.darkMagenta, [colorCodes.magenta, colorCodes.bgMagenta]],
    [Color.magenta, [colorCodes.magentaBright, colorCodes.bgMagentaBright]],
    [Color.darkCyan, [colorCodes.cyan, colorCodes.bgCyan]],
    [Color.cyan, [colorCodes.cyanBright, colorCodes.bgCyanBright]],
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
    
    stream.write(colorCodes.fgDefault);
    stream.write(colorCodes.bgDefault);
}