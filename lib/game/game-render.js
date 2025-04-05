import { Behavior, BhvrDep, MakeBhvr } from "../schedule/events.js";
import { Event } from "../schedule/events.js";
import GameWorld from "./game-world.js";
import { Screen } from "../screen/screen.js";
import { screenBuffer as gameScreen } from "./game-screen.js";
import { printScreen } from "../screen/print-screen.js";
import { printRemote, syncRemote } from "../screen/print-remote.js"
import { renderMap } from "../map/render-map.js";
import EntSpriteRenderer from "../entities/render-sprites.js";
import EventQueue from "../schedule/event-queue.js";



/** @type {Boolean} */
let isRendering = false;
/** @type {Boolean} */
let isPrinting = false;

const onFinishPrint = () => {
    isRendering = false;
    isPrinting = false;
};

export const RenderEvent = new class RenderEventTag extends Event
{
    targetFrameRate = 30;

    /** @type {EventQueue} */
    renderQueue;

    constructor() {
        super();
        this.enabled = true;
        this.renderQueue = new EventQueue({
            event: this,
            minGap: 1 / this.targetFrameRate,
            waitPromise: true,
        });
    }

    /**
     * @override
     */
    onEvent(arg) {
        if (isRendering || isPrinting)
            return;

        return super.onEvent(arg);
    }


    requestRender(){
        if (isRendering || isPrinting)
            return;
    
        const period = 1 / this.targetFrameRate;
        this.renderQueue.requestIn(null, period, true);
    }
}


export const RenderStart = new class RenderStartTag extends Behavior
{
    constructor() {
        super();
    }

    /**
     * 
     * @param {Event} event The event which was triggered
     * @param {?any} arg The optional argument ot the event
     */
    onEvent(event, arg) {
        isRendering = true;

        if (Screen.refresh())
            gameScreen.fitScreen();

        gameScreen.prepare();

        gameScreen.clearZ();
    }
}
RenderEvent.addBehavior(RenderStart);

export const RenderEnd = new class RenderEndTag extends Behavior
{
    constructor() {
        super();

        this.addDep(RenderStart);
    }
    
    /**
     * 
     * @param {Event} event The event which was triggered
     * @param {?any} arg The optional argument ot the event
     */
    onEvent(event, arg) {
        isRendering = false;
        if (isPrinting)
            return;
        isPrinting = true;

        syncRemote();

        return printRemote(gameScreen)
            .finally(onFinishPrint);
        // printScreen(gameScreen, { resetCursor: true });
    }
}
RenderEvent.addBehavior(RenderEnd)




export const RenderTiles = new class RenderTilesTag extends Behavior
{
    constructor() {
        super();

        this.addDep(RenderStart);
        this.addDep(new BhvrDep(RenderEnd, BhvrDep.before));
    }
    
    /**
     * 
     * @param {Event} event The event which was triggered
     * @param {?any} arg The optional argument ot the event
     */
    onEvent(event, arg) {
        renderMap(GameWorld.map, gameScreen, GameWorld.camera);
    }
}
RenderEvent.addBehavior(RenderTiles);

export const RenderSprites = new class RenderSpritesTag extends Behavior
{
    renderer = new EntSpriteRenderer({
        buffer: gameScreen,
        camera: GameWorld.camera,
        entities: GameWorld.entities,
    });

    constructor() {
        super();

        this.addDep(RenderStart);
        this.addDep(new BhvrDep(RenderEnd, BhvrDep.before));
    }
    
    /**
     * 
     * @param {Event} event The event which was triggered
     * @param {?any} arg The optional argument ot the event
     */
    onEvent(event, arg) {
        this.renderer.draw();
    }
}

RenderEvent.addBehavior(RenderSprites);