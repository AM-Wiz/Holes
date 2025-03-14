import process from "node:process";

import { Event } from "../schedule/events.js";

/** @type {QuitEvent} */
let quitEvent_;

export class QuitEvent extends Event
{
    constructor() {
        if (quitEvent_ != null)
            throw new Error("Instance of input event may not be created");

        super();
        
        quitEvent_ = this;
    }

    static get instance() { return quitEvent_; }
};

quitEvent_ = new QuitEvent();



export const quitImmediate = () => {
    onQuit();
};



/** @type {Boolean} */
let quittingReq = false;

export const requestQuit = () => {
    if (quittingReq)
        return;

    quittingReq = true;

    setImmediate(onQuit);
};

/** @type {Boolean} */
let quitting = false;

const onQuit = () => {
    if (quitting)
        return;
    quitting = true;

    try { QuitEvent.instance.post(); }
    catch { } // TODO log

    process.exit();
};