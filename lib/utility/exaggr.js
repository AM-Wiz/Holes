
class ExAggr {
    constructor() { }

    /**
     * @type {?Error[]}
     */
    exceptions_ = null;

    /**
     * @type {Error[]}
     */
    get exceptions() { return this.exceptions_ || []; }

    /**
     * @type {Boolean} 
     */
    get any() { return this.exceptions_?.length > 0; }

    /**
     * 
     * @param {?Error} ex The exception to add
     * @param {?boolean} flat When true, the inner exception should be added instead of the exception
     */
    add(ex, flat) {
        if (!(ex instanceof Error))
            return;
        
        if (!Array.isArray(this.exceptions_))
            this.exceptions_ = [];


        if (flat && ex instanceof AggregateError) {
            this.exceptions_.push(... ex.errors);

            return;
        }

        this.exceptions_.push(ex);
    }

    /**
     * 
     * @param {?Boolean} flush If true, the `ExAggr` should release it's exceptions
     * @throws
     */
    rethrow(flush) {
        if (!this.any)
            return;

        const ex = this.makeError(flush);

        throw ex;
    }

    /**
     * 
     */
    clear() {
        this.exceptions_ = null;
    }

    /**
     * 
     * @param {?Boolean} flush If true, the `ExAggr` should release it's exceptions
     * @returns {?Error}
     */
    makeError(flush) {
        if (!this.any)
            return null;

        flush = flush == null ? true : false;

        const ex = new AggregateError(this.exceptions_);

        if (flush)
            this.exceptions_ = null;

        if (Error.captureStackTrace != null)
            Error.captureStackTrace(ex, ExAggr.makeError);

        return ex;
    }
}

export { ExAggr };
export default ExAggr;