

const uglyFFZ = (word) => {
    // Because js was designed by window lickers,
    // ~x results in a "32-bit" signed value, breaking log2.
    // As a result, we have to mask off the first bit, and test it manually.

    // Invert the word so we can use FFS to implement
    word = ~word;

    // Manually check 'sign-bit'
    if ((word & 0x8000_0000) != 0)
        return 0x1f;

    // Get the FFS of the word with the nuisancesome sign-bit removed
    return Math.trunc(Math.log2((word) & (~0x8000_0000)));
}



export {
    uglyFFZ,
};