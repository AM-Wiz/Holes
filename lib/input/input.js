import {stdin as input, uptime} from "node:process";
import assert from "node:assert";
import {ExAggr} from "../utility/exaggr.js";
import {SafeCallbacks} from "../utility/safecallbacks.js"


export const getTs = () => {
    return uptime();
};


export class InputBuffer
{

};

/**
 * @callback LRICallback
 * @param {String} value
 */


/** @type {SafeCallbacks<LRICallback>} */
const callbacks = new SafeCallbacks();


/**
 * 
 * @param {LRICallback} callback 
 */
export const listenRawInput = (callback) => {
    callbacks.add(callback);
};

/**
 * 
 * @param {LRICallback} callback 
 */
export const stopListenRawInput = (callback) => {
    const r = callbacks.remove(callback);
    assert.ok(r);
};


const onInput = (data) => {
    callbacks.invoke(data);
};

input.setRawMode(true);
input.setEncoding('utf-8');
input.on('data', onInput);

input.resume();