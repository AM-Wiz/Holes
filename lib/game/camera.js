
import assert from "node:assert";
import { I16V } from "../math/vecmath.js";

export class Camera {

    /**
     * @typedef COptions
     * @property {?ArrayLike<Number>} origin
     * @property {?Number} viewLength
     * @property {?Number} viewTop
     * @property {?Number} viewBottom
     */

    /**
     * 
     * @param {COptions} options 
     */
    constructor(options) {
        if (options.origin != null)
            this.origin_.copyFrom(options.origin);
        
        {
            let [b, t] = [this.viewBottom, this.viewTop];

            if (options.viewTop != null)
                t = options.viewTop;
            
            if (options.viewBottom != null)
                b = options.viewBottom;
            
            if (options.viewLength != null)
                b = t - options.viewLength;

            this.setViewRange(b, t);
        }
    }

    origin_ = I16V.from([0, 0, 0]);

    viewLength_ = 10;

    get center() { return this.origin_; }
    set center(value) { this.origin_.copyFrom(value); }

    get viewLength() { return this.viewLength_; }
    set viewLength(value) { this.viewLength_ = value; }

    get height() { return this.origin_[2]; }
    set height(value) { this.origin_[2] = value; }

    get viewTop() { return this.height; }
    set viewTop(value) { viewRange = [this.viewBottom, value]}

    get viewBottom() { return this.height - this.viewLength_; }
    set viewBottom(value) { viewRange = [value, this.viewTop]; }
    
    /**
     * @type {[Number, Number]}
     */
    get viewRange() { return [this.viewBottom, this.viewTop]; }
    set viewRange(valueb) { this.setViewRange(valueb); }
    
    /**
     * 
     * @param {ArrayLike<Number>|Number} valueb 
     * @param {?Number} valuet 
     */
    setViewRange(valueb, valuet) {
        if (typeof valueb[0] === 'number') {
            assert.ok(typeof valueb[1] === 'number');

            [valueb, valuet] = [valueb[0], valueb[1]];
        }
        assert.ok(valueb < valuet);
        
        this.height = valuet;
        this.viewLength_ = valuet - valueb;
    }

    getNormDepth(height) {
        return (height - this.viewTop) / this.viewLength;
    }
    
    getNormHeight(height) {
        return (height - this.viewBottom) / this.viewLength;
    }
}