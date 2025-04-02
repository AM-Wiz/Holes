
import util from "node:util";
import { mixin } from "../utility/mixin.js";


/**
 * @typedef {ArrayLike<Number>} VecLike
 */


const vecNormQuant = 0.0001;

const testQuantClose = (a, b) => (a + vecNormQuant) <= (b + vecNormQuant + vecNormQuant);

/**
 * @template TSelf
 * @interface Vec
*/
const Vec = {
    /**
     * @param {VecLike} src 
     * @returns {TSelf}
     */
    copyFrom(src) {
        for (let i = 0; i < this.length; i++)
            this[i] = src[i];

        return this;
    },

    /**
     * @param {?TSelf} result The option vector to write the result into
     * @returns {TSelf}
     */
    clone(result) {
        if (result?.length != this.length)
            result = new this.constructor(this.length);

        if (result != this)
            result.copyFrom(this);

        return result;
    },

    /**
     * Add two vectors
     * @param {VecLike|Number} other The other vector
     * @param {?TSelf} result An optional vector to store the result in
     * @returns {TSelf}
     */
    add(other, result) {
        result = this.clone(result);
        
        if (typeof other == "number") {
            for (let i = 0; i < this.length; i++)
                result[i] = result[i] + other;
        } else {
            for (let i = 0; i < this.length; i++)
                result[i] = result[i] + other[i];
        }

        return result;
    },
    
    /**
     * Subtract two vectors
     * @param {VecLike|Number} other The other vector
     * @param {?TSelf} result An optional vector to store the result in
     * @returns {TSelf}
     */
    sub(other, result) {
        result = this.clone(result);
        
        if (typeof other == "number") {
            for (let i = 0; i < this.length; i++)
                result[i] = result[i] - other;
        } else {
            for (let i = 0; i < this.length; i++)
                result[i] = result[i] - other[i];
        }

        return result;
    },
    
    /**
     * Multiply two vectors
     * @param {VecLike|Number} other The other vector
     * @param {?TSelf} result An optional vector to store the result in
     * @returns {TSelf}
     */
    mul(other, result) {
        result = this.clone(result);
        
        if (typeof other == "number") {
            for (let i = 0; i < this.length; i++)
                result[i] = result[i] * other;
        } else {
            for (let i = 0; i < this.length; i++)
                result[i] = result[i] * other[i];
        }

        return result;
    },
    
    /**
     * Divide two vectors
     * @param {VecLike|Number} other The other vector
     * @param {?TSelf} result An optional vector to store the result in
     * @returns {TSelf}
     */
    div(other, result) {
        result = this.clone(result);
        
        if (typeof other == "number") {
            for (let i = 0; i < this.length; i++)
                result[i] = result[i] / other;
        } else {
            for (let i = 0; i < this.length; i++)
                result[i] = result[i] / other[i];
        }

        return result;
    },

    /**
     * Compute the remainder of `this` mod `other`
     * @param {VecLike|Number} other The other vector
     * @param {?TSelf} result An optional vector to store the result in
     * @returns {TSelf}
     */
    rem(other, result) {
        result = this.clone(result);
        
        if (typeof other == "number") {
            for (let i = 0; i < this.length; i++)
                result[i] = result[i] % other;
        } else {
            for (let i = 0; i < this.length; i++)
                result[i] = result[i] % other[i];
        }

        return result;
    },
    
    /**
     * Truncate the value in `this`
     * @param {VecLike|Number} other The other vector
     * @param {?TSelf} result An optional vector to store the result in
     * @returns {TSelf}
     */
    trunc(result) {
        result = this.clone(result);
        
        for (let i = 0; i < this.length; i++)
            result[i] = Math.trunc(result[i]);

        return result;
    },

    /**
     * Take the minimum elements of two vectors
     * @param {VecLike|Number} other The other vector
     * @param {?TSelf} result An optional vector to store the result in
     * @returns {TSelf}
     */
    min(other, result) {
        result = this.clone(result);
        
        if (typeof other == "number") {
            for (let i = 0; i < this.length; i++)
                result[i] = Math.min(result[i], other);
        } else {
            for (let i = 0; i < this.length; i++)
                result[i] = Math.min(result[i], other[i]);
        }

        return result;
    },
    

    /**
     * Take the maximum elements of two vectors
     * @param {VecLike|Number} other The other vector
     * @param {?TSelf} result An optional vector to store the result in
     * @returns {TSelf}
     */
    max(other, result) {
        result = this.clone(result);
        
        if (typeof other == "number") {
            for (let i = 0; i < this.length; i++)
                result[i] = Math.max(result[i], other);
        } else {
            for (let i = 0; i < this.length; i++)
                result[i] = Math.max(result[i], other[i]);
        }

        return result;
    },

    
    /**
     * Take the maximum elements of two vectors
     * @param {?TSelf} result An optional vector to store the result in
     * @returns {TSelf}
     */
    abs(result) {
        result = this.clone(result);
        
        for (let i = 0; i < this.length; i++)
            result[i] = Math.abs(result[i]);

        return result;
    },

    /**
     * Take the negation of a vector
     * @param {?TSelf} result An optional vector to store the result in
     * @returns {TSelf}
     */
    neg(result) {
        result = this.clone(result);
        
        for (let i = 0; i < this.length; i++)
            result[i] = -result[i];

        return result;
    },

    /**
     * Get the sign of the values in `this`
     * @param {?TSelf} result An optional vector to store the result in
     * @returns {TSelf}
     */
    getSign(result) {
        result = this.clone(result);
        
        for (let i = 0; i < this.length; i++)
            result[i] = Math.sign(result[i]);

        return result;
    },


    /**
     * 
     * @param {TSelf} other 
     * @returns {Boolean}
     */
    equals(other) {
        if (this.length !== other.length)
            return false;

        for (let idx = 0, count = this.length; idx < count; idx++) {
            if (this[idx] !== other[idx])
                return false;
        }

        return true;
    },


    /**
     * 
     * @override
     * @returns {String}
     */
    toString() {
        return `[${this.join(', ')}]`;
    },

    [util.inspect.custom]() {
        return `[${this.join(', ')}]`;
    },



    /**
     * @param {?TSelf} result 
     * @returns {TSelf}
     */
    normalize(result) {
        result = this.clone(result);
        var length = result.sqrMag;
        if (testQuantClose(length, 0))
            return result.fill(0);
        else if (testQuantClose(length, 1))
            return result;
        else
            return result.div(Math.sqrt(length), result);
    },

    /**
     * @type {Boolean}
     */
    get isZero() {
        return testQuantClose(this.sqrMag, 0);
    },
    
    /**
     * @type {Boolean}
     */
    get isNorm() {
        return testQuantClose(this.sqrMag, 1);
    },

    /**
     * @type {Number}
     */
    get sqrMag() {
        let acc = 0;
        for (let i = 0; i < this.length; i++)
            acc += this[i] * this[i];

        return acc;
    },
    
    /**
     * @type {Number}
     */
    get mag() {
        return Math.sqrt(this.sqrMag);
    },

    set mag(value) {
        this.normalize(this);
        this.mul(value, this);
    },


    /**
     * 
     * @param {TSelf} other 
     * @returns {Number}
     */
    dot(other) {
        let acc = 0;
        for (let i = 0; i < this.length; i++)
            acc += this[i] * other[i];

        return acc;
    },

    
    /**
     * 
     * @param {TSelf} other 
     * @returns {Number}
     */
    projScalar(other) {
        return this.dot(other) / this.mag;
    },
    
    /**
     * 
     * @param {TSelf} other 
     * @param {?TSelf} result 
     * @returns {TSelf}
     */
    projVector(other, result) {
        result = this.normalize(result);
        result.mul(result.dot(other), result);
        return result;
    },

    cosBetween(other) {
        const q = vecNormQuant;
        const sl = this.sqrMag * other.sqrMag;
        if (testQuantClose(sl, 0))
            return 0;
        return this.dot(other) / Math.sqrt(sl);
    },
};

/**
 * @mixes Vec
 * @implements {Vec<UI16V>}
 */
class UI16V extends Uint16Array {
    constructor(...args) {
        super(...args);
    }

    static from(iterable) {
        const result = new UI16V(iterable.length);
        result.copyFrom(iterable);

        return result;
    }
}

mixin(UI16V.prototype, Vec);

/**
 * @mixes Vec
 * @implements {Vec<UI32V>}
 */
class UI32V extends Uint32Array {
    constructor(...args) {
        super(...args);
    }

    static from(iterable) {
        const result = new UI32V(iterable.length);
        result.copyFrom(iterable);

        return result;
    }
}

mixin(UI32V.prototype, Vec);



/**
 * @mixes Vec
 * @implements {Vec<I16V>}
 */
class I16V extends Int16Array {
    constructor(...args) {
        super(...args);
    }

    static from(iterable) {
        const result = new I16V(iterable.length);
        result.copyFrom(iterable);

        return result;
    }
}

mixin(I16V.prototype, Vec);

/**
 * @mixes Vec
 * @implements {Vec<I32V>}
 */
class I32V extends Int32Array {
    constructor(...args) {
        super(...args);
    }

    static from(iterable) {
        const result = new I32V(iterable.length);
        result.copyFrom(iterable);

        return result;
    }
}

mixin(I32V.prototype, Vec);


/**
 * @mixes Vec
 * @implements {Vec<F32V>}
 */
class F32V extends Float32Array {
    constructor(...args) {
        super(...args);
    }

    static from(iterable) {
        const result = new F32V(iterable.length);
        result.copyFrom(iterable);

        return result;
    }
}

mixin(F32V.prototype, Vec);


export { UI16V, UI32V, I16V, I32V, F32V };