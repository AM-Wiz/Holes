import { I16V } from "../math/vecmath.js";
import { EntComponent } from "./entity-component.js";

/**
 * An entity component which stores sparse data
 * @template TVec
 */
export class SparseVecEntComponent extends EntComponent
{
    /** @type {(?TVec)[]} */
    data_ = [];

    type_ = I16V;
    width_ = 3;

    constructor(options) {
        super(options);

        if (options?.width)
            this.width_ = options.width;
        if (options?.type)
            this.type_ = options.type;
    }
    
    #ensureCap(id) {
        if (id < this.data_.length)
            return;

        this.data_.length = id + 1; // Sparse array
    }

    #createVec_() {
        return new this.type_(this.width_);
    }

    get ids() {
        return Object.keys(this.data_);
    }

    hasId(id) {
        return id in this.data_;
    }

    
    /**
     * @param {EntId} id
     * @returns {?TVec}
     */
    get(id, result) {
        result ??= this.#createVec_();

        const t = this.data_[id];
        if (t)
            result.copyFrom(t);
        else
            result.fill(0);
        
        return result;
    }

    /**
     * 
     * @param {EntId} id 
     * @param {?TVec} value 
     */
    set(id, value) {
        this.#ensureCap(id);
        
        if (this.data_[id] == null)
            this.data_[id] = this.#createVec_();

        this.data_[id].copyFrom(value);
    }
    
    /**
     * 
     * @param {EntId} id 
     */
    remove(id) {
        if (!(id < this.data_.length))
            return;
        
        const v = this.data_[id];
        delete this.data_[id];
        return v;
    }
};