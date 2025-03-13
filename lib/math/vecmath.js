
let Vec = {

    copyFrom(other) {
        for (let i = 0; i < this.length; i++)
            this[i] = other[i];

        return this;
    },

    clone() {
        const result = new this.constructor(this.length);
        result.copyFrom(this);

        return result;
    },

    /**
     * Add two vectors
     * @param {Vec|Number} other The other vector
     * @param {?Vec} result An optional vector to store the result in
     * @returns {Vec}
     */
    add(other, result) {
        result = result || this.clone();
        
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
     * @param {Vec|Number} other The other vector
     * @param {?Vec} result An optional vector to store the result in
     * @returns {Vec}
     */
    sub(other, result) {
        result = result || this.clone();
        
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
     * @param {Vec|Number} other The other vector
     * @param {?Vec} result An optional vector to store the result in
     * @returns {Vec}
     */
    mul(other, result) {
        result = result || this.clone();
        
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
     * @param {Vec|Number} other The other vector
     * @param {?Vec} result An optional vector to store the result in
     * @returns {Vec}
     */
    div(other, result) {
        result = result || this.clone();
        
        if (typeof other == "number") {
            for (let i = 0; i < this.length; i++)
                result[i] /= other;
        } else {
            for (let i = 0; i < this.length; i++)
                result[i] /= other[i];
        }

        return result;
    },
};


export class UI16V extends Uint16Array {
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

export class UI32V extends Uint32Array {
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

export class F32V extends Float32Array {
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