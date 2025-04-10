import { binarySearchContains } from "../utility/bin-search.js";
import { EntAspect } from "./entity.js";



/**
 * @template TData
 */
export class EntComponent extends EntAspect
{
    get ids() {
        return [];
    }

    hasId(id) {
        return binarySearchContains(this.ids, id);
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
     * @property {?Object} containerArgs
     * @property {?String} name
     * @property {?Object} params
     * @property {?Boolean} register
     */

    /**
     * @param {Function} type 
     * @param {?MakeComponentOptions} options
     * @returns {EntComponent<any>}
     */
    static makeComponent(type, options) {
        const base = options?.containerType ?? SparseEntComponent;

        const params = options?.params ?? null;

        const name = options?.name ?? type.name;

        const contArgs = options?.containerArgs ?? undefined;

        const aType = class extends base
        {
            constructor() {
                super(contArgs);

                if (params)
                    Object.assign(this, params);
            }

            static dataType = type;
            static name = name;
        };


        if (options?.register)
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

    hasId(id) {
        return id in this.data_;
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

    hasId(id) {
        return id in this.data_;
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

    hasId(id) {
        return id in this.data_;
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