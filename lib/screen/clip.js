export class ClipRect
{
    /** @type {Number} */
    ixS = 0;
    /** @type {Number} */
    ixE = 0;
    /** @type {Number} */
    iyS = 0;
    /** @type {Number} */
    iyE = 0;

    /** @type {Number} */
    vxS = 0;
    /** @type {Number} */
    vyS = 0;

    /** @type {Boolean} */
    any = false;
}


/**
 * 
 * @param {[Number, Number]} iS The inner starting coordinate
 * @param {[Number, Number]} iE The inner end coordinate
 * @param {[Number, Number]} off An optional offset
 * @param {[Number, Number]} bounds The bounds of the screen buffer
 * @param {?ClipRect} rect An optional `ClipRect` to write the results into
 * @returns {ClipRect}
 */
export const clipView = (iS, iE, off, bounds, rect) => {
    rect ??= new ClipRect();

    const [cx, cy] = off;
    
    let [bcxb, bcyb] = iS;
    bcxb += cx, bcyb += cy;
    let [bcxe, bcye] = iE;
    bcxe += cx, bcye += cy;

    const [vxb, vyb] = [0, 0];
    const [vxe, vye] = bounds;

    let [txb, tyb] = [bcxb, bcyb];
    let [txe, tye] = [bcxe, bcye];

    txb = Math.max(txb, vxb), txe = Math.min(txe, vxe);
    tyb = Math.max(tyb, vyb), tye = Math.min(tye, vye);
    
    rect.any = (txb < txe && tyb < tye);
    if (!rect.any)
        return rect;
    
    rect.ixS = txb - bcxb, rect.ixE = txe - bcxb;
    
    rect.iyS = tyb - bcyb, rect.iyE = tye - bcyb;

    rect.vxS = txb - rect.ixS, rect.vyS = tyb - rect.iyS;

    return rect;
}