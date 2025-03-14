import {listenRawInput} from "./input.js"
import {Event, Behavior} from "../schedule/events.js"
import { ExAggr } from "../utility/exaggr.js";
import assert from "node:assert"


/** @type {RawInputEvent} */
let rawInputEvent_;

export class RawInputEvent extends Event
{
    constructor() {
        if (rawInputEvent_ != null)
            throw new Error("Instance of input event may not be created");
        
        super();
        
        rawInputEvent_ = this;
    }

    static get instance() { return rawInputEvent_; }
};

rawInputEvent_ = new RawInputEvent();

const exAggr = new ExAggr();

const onRawInput = (input) => {
    try { rawInputEvent_.post(input); }
    catch (ex) { exAggr.add(ex); }

    for (let idx = 0; idx < bufferedInputs_.length; idx++) {
        const bi = bufferedInputs_[idx];
        
        bi.add_(input);
    }

    exAggr.rethrow();
};

listenRawInput(onRawInput);



/** @type {BufferedInputEvent[]} */
const bufferedInputs_ = [];


export class BufferedInputEvent extends Event
{
    /** @type {?Number} */
    inputTimelimit = 1;

    /** @type {Boolean} */
    live_ = false;


    constructor() {
        super();

        this.live_ = true;

        bufferedInputs_.push(this);
    }


    add_(input) {
        throw new Error("Not implemented exception");
    }


    dispose() {
        if (!this.live_)
            return;

        this.live_ = false;

        const idx = bufferedInputs_.indexOf(this);
        assert.notEqual(idx, -1);
        bufferedInputs_.splice(idx, 1);
    }

    flush() {
        const arg = null; // TODO

        this.post(arg);
    }
};