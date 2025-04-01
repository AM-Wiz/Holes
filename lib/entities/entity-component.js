import { EntAspect } from "./entity.js";



/**
 * @template TData
 */
export class EntComponent extends EntAspect
{
    get ids() {
        return [];
    }

    /**
     * @param {EntId} id
     * @returns {?TData}
     */
    get(id) {
        throw new Error("Not implemented");
    }

    /**
     * 
     * @param {EntId} id 
     * @param {?TData} value 
     */
    set(id, value) {
        throw new Error("Not implemented");
    }
    
    /**
     * 
     * @param {EntId} id 
     */
    remove(id) {
        throw new Error("Not implemented");
    }



    /**
     * @typedef MakeComponentOptions
     * @extends {?EntAspect.RegOptions}
     * @property {?Function} containerType
     * @property {?String} name
     * @property {?Object} state
     */

    /**
     * @param {Function} type 
     * @param {?MakeComponentOptions} options
     */
    static makeComponent(type, options) {
        const base = options?.containerType ?? SparseEntComponent;

        const state = options?.state ?? null;

        const aType = class extends base
        {
            constructor(options) {
                super(options);

                if (state)
                    Object.assign(this, state);
            }

            static dataType = type;
            static name = options?.name ?? type.name;
        };



        EntAspect.register(aType, options);

        return aType;
    }
};

/**
 * An entity component with no data beyond membership.
 * @template TData
 */
export class EmptyEntComponent extends EntComponent
{
    /** @type {(?TData)[]} */
    data_ = [];

    
    #ensureCap(id) {
        if (id < this.data_.length)
            return;

        this.data_.length = id + 1; // Sparse array
    }

    get ids() {
        return Object.keys(this.data_);
    }

    
    /**
     * @param {EntId} id
     * @returns {?TData}
     */
    get(id) {
        return this.data_[id] ?? false;
    }

    /**
     * 
     * @param {EntId} id 
     */
    set(id) {
        this.#ensureCap(id);
        
        this.data_[id] = true;
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

/**
 * An entity component which stores dense data
 * @template TData
 */
export class DenseEntComponent extends EntComponent
{
    /** @type {(?TData)[]} */
    data_ = [];

    
    #ensureCap(id) {
        if (id < this.data_.length)
            return;

        this.data_.push(... Array.from({length: id + 1 - this.data_.length})); // Dense array
    }

    

    get ids() {
        return Object.keys(this.data_);
    }

    /**
     * @param {EntId} id
     * @returns {?TData}
     */
    get(id) {
        return this.data_[id] ?? null;
    }

    /**
     * 
     * @param {EntId} id 
     * @param {?TData} value 
     */
    set(id, value) {
        this.#ensureCap(id);
        
        this.data_[id] = value;
    }
    
    /**
     * 
     * @param {EntId} id 
     */
    remove(id) {
        if (!(id < this.data_.length))
            return;
        
        const v = this.data_[id];
        this.data_[id] = null;
        return v;
    }
};


/**
 * An entity component which stores sparse data
 * @template TData
 */
export class SparseEntComponent extends EntComponent
{
    /** @type {(?TData)[]} */
    data_ = [];

    
    #ensureCap(id) {
        if (id < this.data_.length)
            return;

        this.data_.length = id + 1; // Sparse array
    }

    get ids() {
        return Object.keys(this.data_);
    }

    
    /**
     * @param {EntId} id
     * @returns {?TData}
     */
    get(id) {
        return this.data_[id] ?? null;
    }

    /**
     * 
     * @param {EntId} id 
     * @param {?TData} value 
     */
    set(id, value) {
        this.#ensureCap(id);
        
        this.data_[id] = value;
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