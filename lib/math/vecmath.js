
import util from "node:util";


/**
 * @typedef {ArrayLike<Number>} VecLike
 */


/**
 * @template TSelf
 * @mixin Vec
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
                result[i] += other;
        } else {
            for (let i = 0; i < this.length; i++)
                result[i] += other[i];
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
                result[i] -= other;
        } else {
            for (let i = 0; i < this.length; i++)
                result[i] -= other[i];
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
                result[i] *= other;
        } else {
            for (let i = 0; i < this.length; i++)
                result[i] *= other[i];
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
                result[i] /= other;
        } else {
            for (let i = 0; i < this.length; i++)
                result[i] /= other[i];
        }

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
     * @param {VecLike|Number} other The other vector
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
     * 
     * @override
     * @returns {String}
     */
    toString() {
        return `[${this.join(', ')}]`;
    },

    [util.inspect.custom]: () => {
        return `[${this.join(', ')}]`;
    },
};

/**
 * @mixes Vec
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

Object.assign(UI16V.prototype, Vec);

/**
 * @mixes Vec
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

Object.assign(UI32V.prototype, Vec);



/**
 * @mixes Vec
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

Object.assign(I16V.prototype, Vec);

/**
 * @mixes Vec
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

Object.assign(I32V.prototype, Vec);


/**
 * @mixes Vec<F32V>
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

Object.assign(F32V.prototype, Vec);


export { UI16V, UI32V, I16V, I32V, F32V };