
import { F32V } from "../math/vecmath.js";
import { TrnMap } from "./trnmap.js";



/**
 * 
 * @param {TrnMap} map 
 * @param {Number} tx 
 * @param {Number} ty 
 * @returns {?Number}
 */
export const getWalkableHeight = (map, tx, ty) => {
    return getSolidHeight(map, tx, ty);
}

/**
 * 
 * @param {TrnMap} map 
 * @param {Number} tx 
 * @param {Number} ty 
 * @returns {?Number}
 */
export const getSolidHeight = (map, tx, ty) => {
    return map.getHeight(tx, ty);
}


/**
 * 
 * @param {TrnMap} map 
 * @param {Number} tx 
 * @param {Number} ty 
 * @param {?F32V} result 
 * @returns {F32V}
 */
export const getSolidIncline = (map, tx, ty, result) => {
    result ??= new F32V(2);
    result.fill(0); // TODO

    const cH = getSolidHeight(map, tx, ty);

    let weight = 0;

    for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++) {
        if (x == 0 && y == 0)
            continue;
        
        const cW = 1 / (Math.abs(x) + Math.abs(y));

        const oH = getSolidHeight(map, tx + x, ty + y);

        const hDif = oH - cH;

        result[0] += hDif * x * cW;
        result[1] += hDif * y * cW;

        weight += cW;
    }

    result.div(weight, result);

    return result;
}


/**
 * 
 * @param {TrnMap} map 
 * @param {Number} srcX 
 * @param {Number} srcY 
 * @param {Number} dstX 
 * @param {Number} dstY 
 * @param {?F32V} result 
 * @returns {F32V}
 */
export const getSolidInclineTo = (map, srcX, srcY, dstX, dstY, result) => {
    result ??= new F32V(2);

    const sh = getSolidHeight(map, srcX, srcY);
    const dh = getSolidHeight(map, dstX, dstY);

    const distX = dstX - srcX;
    const distY = dstY - srcY;

    result[0] = distX != 0 ? (dh - sh) / distX : 0;
    result[1] = distY != 0 ? (dh - sh) / distY : 0;
    
    return result;
}