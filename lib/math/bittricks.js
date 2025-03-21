

let FFZ = (word) => {
    // Invert the word so we can use FFS to implement
    word = (~word);

    return FFS(word);
}

let FFS = (word) => {
    // Coerce the word to an unsigned value
    word = word >>> 0;

    // Get the integer-log2
    let i = Math.trunc(Math.log2(word));

    // Clamp the result in case of no zeros in input (will return -Inf)
    i = Math.max(0, i);

    return i;
}


export {
    FFZ,
    FFS,
};