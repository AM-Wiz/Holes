import assert from "node:assert";
import { isMainThread, Worker, MessageChannel, MessagePort } from "node:worker_threads";
import { Screen, ScreenBuffer } from "./screen.js";
import ExAggr from "../utility/exaggr.js"
import { resetCursor } from "./print-screen.js";
import { pid } from "node:process";

assert.ok(isMainThread);


const slavePath = `${import.meta.dirname}/print-slave.js`;


/** @type {Worker} */
const worker = new Worker(slavePath, {
    stdout: true,
});
/** @type {MessageChannel} */
const channel = new MessageChannel();

const workerPort = channel.port2;

worker.postMessage({
    type: "establish",
    port: channel.port1,
    stream: Screen.screenStream.fd,
}, [channel.port1]);

let alive = false;

worker.once('message', (msg) => {
    assert.ok(msg.type === 'establish-ack');

    alive = true;
});


class PrintCallback
{
    /** @type {?Function} */
    resolve;
    /** @type {?Function} */
    reject;

    constructor(resolve, reject) {
        this.resolve = resolve;
        this.reject = reject;
    }
}

class PendingPrint
{
    /** @type {Number} */
    id;

    /** @type {ScreenBuffer} */
    buffer;

    /** @type {Boolean} */
    borrowed;

    /** @type {Boolean} */
    complete = false;

    /** @type {?Error} */
    exception = null;

    /** @type {PrintCallback[]} */
    callbacks = [];

    constructor(id, buffer, borrowed) {
        this.id = id;
        this.buffer = buffer;
        this.borrowed = borrowed;
    }
}


/** @type {PendingPrint[]} */
const pendingPrints = [];
let pendingId = 0;


workerPort.on('message', (msg) => {
    switch (msg.type) {
    case 'print-complete': onPrintComplete(msg); break;
    }
});

const onPrintComplete = (msg) => {
    assert.ok(msg.id != null);

    const idx = pendingPrints.findIndex(a => a.id === msg.id);
    assert.ok(idx >= 0);

    const p = pendingPrints[idx];
    pendingPrints.splice(idx, 1);

    assert.ok(!p.complete);
    p.complete = true;
    
    if (pendingPrints.length < 1) {
        worker.unref();
    }

    const exs = new ExAggr();

    try {
        if (msg.exs)
            throw new AggregateError(msg.exs, "Print slave encountered one or more errors");
    } catch (ex) {
        p.exception = ex;
        exs.add(ex);
    }

    try {
        if (p.borrowed)
            throw new Error("Not implemented");
    } catch (ex) { exs.add(ex); }
    
    for (const cb of p.callbacks) {
        try { invokeCallback(p, cb); }
        catch (ex) { exs.add(ex); }
    }
    
    exs.rethrow();
}

const invokeCallback = (pending, cb) => {
    if (pending.exception != null)
        cb.reject(pending);
    else
        cb.resolve(pending);
}

const addCallback = (pending, cb) => {
    if (pending.complete) {
        invokeCallback(pending, cb);
    
        return;
    }
    
    pending.callbacks.push(cb);
}


export const syncRemote = (options) => {
    if (!alive)
        return;

    
    const msg = {
        type: 'sync-screen',
        
        screen: {
            dim: Screen.realScreenSize,
            hasScreen: Screen.hasScreen,
        },
    };

    workerPort.postMessage(msg);
}

/**
 * @typedef PROptions
 */


/**
 * 
 * @param {ScreenBuffer} buffer 
 * @param {?PROptions} options 
 */
export const printRemote = async (buffer, options) => {
    if (!alive) {
        return null;
    }

    worker.ref();

    const penId = ++pendingId;

    const msg = {
        type: 'print',
        id: penId,

        buffer: {
            dim: [... buffer.bufferDim],
            padding: buffer.padding,
            symbolBuffer: buffer.screenTextBuffer,
            colorBuffer: buffer.screenColorBuffer,
        },

        borrowed: false,
    };

    msg.borrowed = !!options?.borrowed;
    const transfer = [];
    if (msg.borrowed) {
        buffer.hasBuffer_ = false;

        transfer.push(msg.buffer.symbolBuffer.buffer, msg.buffer.colorBuffer.buffer);
    }

    var p = new PendingPrint(penId, buffer, msg.borrowed);
    pendingPrints.push(p);

    workerPort.postMessage(msg, transfer);

    await new Promise((res, rej) => {
        addCallback(p, new PrintCallback(res, rej));
    });

    return p;
}

