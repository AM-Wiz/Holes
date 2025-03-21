import assert from "node:assert";

/**
 * The Maximum number of bytes in a utf8 coding
 */
const maxByteCount8 = 4;

/**
 * 
 * @param {Number} cp 
 * @param {ArrayLike<Number>} buffer 
 * @param {?Number} offset 
 * @returns Number
 */
const encodeInto8 = (cp, buffer, offset) => {
    offset ??= 0;

    if (cp <= 0x7f) {
        buffer[offset + 0] = cp;
        return 1;
    } else if (cp <= 0x7ff) {
        buffer[offset + 1] = ((cp >>  0) & 0x3f) | 0x80;
        buffer[offset + 0] = ((cp >>  6) & 0x1f) | 0xc0;
        return 2;
    } else if (cp <= 0xffff) {
        buffer[offset + 2] = ((cp >>  0) & 0x3f) | 0x80;
        buffer[offset + 1] = ((cp >>  6) & 0x3f) | 0x80;
        buffer[offset + 0] = ((cp >> 12) & 0x0f) | 0xe0;
        return 3;
    } else if (cp <= 0x10ffff) {
        buffer[offset + 3] = ((cp >>  0) & 0x3f) | 0x80;
        buffer[offset + 2] = ((cp >>  6) & 0x3f) | 0x80;
        buffer[offset + 1] = ((cp >> 12) & 0x3f) | 0x80;
        buffer[offset + 0] = ((cp >> 18) & 0x07) | 0xf0;
        return 4;
    } else {
        assert.fail();
    }
}

encodeInto8.minSafeByteCount = maxByteCount8;

/**
 * 
 * @param {Number} cp 
 * @returns Number
 */
const countBytes8 = (cp) => {
    if (cp <= 0x7f)             return 1;
    else if (cp <= 0x7ff)       return 2;
    else if (cp <= 0xffff)      return 3;
    else if (cp <= 0x10ffff)    return 4;
    else                        return undefined;
}


const encodeAsInt8 = (c) => { // TODO test
    let n = c.codePointAt(0);
    if (n < 0x7f)
        return n;

    let r = 0;
    let i = 7;
    for (; n >= 0x3f; n >>= 6, i--)
        r = (r << 8) | ((n & 0x3f) | 0x80);
    r = (r << 8) | ((n) | ((~((1 << i) - 1)) & 0xff));
    return r;
}





export {
    countBytes8,
    encodeInto8,
    maxByteCount8,
}

export default {
    countBytes8,
    encodeInto8,
    maxByteCount8,
    // encodeAsInt8,
}