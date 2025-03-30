import assert from "node:assert";
import { isMainThread, Worker, MessageChannel, MessagePort } from "node:worker_threads";
import { Screen, ScreenBuffer } from "./screen.js";
import ExAggr from "../utility/exaggr.js"
import { resetCursor } from "./print-screen.js";
import { pid } from "node:process";

assert.ok(isMainThread);

/** @type {Worker} */
const worker = new Worker("./lib/screen/print-slave.js", {
    // stdout: false,
});
/** @type {MessageChannel} */
const channel = new MessageChannel();

const workerPort = channel.port2;

worker.postMessage({
    type: "establish",
    port: channel.port1,
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

    /** @type {boolean} */
    borrowed;

    /** @type {PrintCallback[]} */
    callbacks = [];

    constructor(id, buffer, borrowed) {
        this.id = id;
        this.buffer = buffer;
        this.borrowed = borrowed;
    }
}


/** @type {PendingPrint[]} */
const pending = [];
let pendingId = 0;


workerPort.on('message', (msg) => {
    switch (msg.type) {
    case 'print-complete': onPrintComplete(msg); break;
    }
});

const onPrintComplete = (msg) => {
    assert.ok(msg.id != null);

    const idx = pending.findIndex(a => a.id === msg.id);
    assert.ok(idx >= 0);

    const p = pending[idx];
    pending.splice(idx, 1);
    
    const exs = new ExAggr();

    try {
        if (p.borrowed)
            throw new Error("Not implemented");
    } catch (ex) { exs.add(ex); }
        
    for (const cb of p.callbacks) {
        try { invokeCallback(cb, p.id); }
        catch (ex) { exs.add(ex); }
    }

    if (pending.length < 1) {
        worker.unref();
    }
    
    exs.rethrow();
}

const invokeCallback = (id, cb) => {
    cb.resolve(p.id);
}

const addCallback = (id, cb) => {
    const idx = pending.findIndex(a => a.id === msg.id);
    if (idx < 0) {
        invokeCallback(cb, id);

        return;
    }

    pending[idx].callbacks.push(cb);
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
export const printRemote = (buffer, options) => {
    if (!alive) {
        return new Promise((res, rej) => {
            rej("Not ready");
        });
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

    pending.push(new PendingPrint(penId, buffer, msg.borrowed));

    resetCursor(); // TODO can this be done on the remote?

    workerPort.postMessage(msg, transfer);

    return new Promise((res, rej) => {
        addCallback(penId, new PrintCallback(res, rej));
    });
}

