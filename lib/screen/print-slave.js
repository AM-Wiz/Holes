import assert from "node:assert";
import { isMainThread, Worker, MessageChannel, MessagePort, parentPort } from "node:worker_threads";
import { printScreen, resetCursor } from "./print-screen.js";
import { Screen, ScreenBuffer } from "./screen.js";
import ExAggr from "../utility/exaggr.js"
import tty from "node:tty";

assert.ok(!isMainThread);

/** @type {MessagePort} */
let port = null;

/** @type {tty.WriteStream} */
let stream = null;


parentPort.once('message', (establish) => {
    assert.ok(establish.type === 'establish');
    assert.ok(establish.port instanceof MessagePort);
    assert.ok(typeof establish.stream === 'number');

    port = establish.port;
    port.on('message', onMessage);

    stream = new tty.WriteStream(establish.stream);
    Screen.screenStream = stream;

    parentPort.postMessage({type: 'establish-ack'});
});


const onMessage = (msg) => {
    switch (msg.type) {
    case 'print': onPrint(msg); break;
    case 'sync-screen': onSyncScreen(msg); break;
    }
}


const onSyncScreen = (msg) => {
    const { hasScreen, dim } = msg.screen;

    Screen.hasScreen = hasScreen;
    Screen.realScreenSize = dim;
}

const onPrint = async (msg) => {
    const buf = ScreenBuffer.from(msg.buffer);

    const exs = new ExAggr();
    try {
        await printScreen(buf, {
            resetCursor: true,
        });
    } catch(ex) {
        exs.add(ex);
    }

    const cMsg = {
        type: 'print-complete',
        id: msg.id,
    };
    const transfer = [];

    if (exs.any) {
        cMsg.exs = exs.exceptions;
    }

    if (msg.borrowed) {
        cMsg.buffer = msg.buffer;
        
        transfer.push(cMsg.buffer.symbolBuffer.buffer, cMsg.buffer.colorBuffer.buffer);
    }

    port.postMessage(cMsg, transfer);
    // TODO send buffer back
}