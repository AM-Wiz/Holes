import { Behavior, BhvrDep, MakeBhvr } from "../schedule/events.js";
import { LoopEvent } from "../schedule/loopevents.js";
import GameWorld from "./game-world.js";
import { Screen } from "../screen/screen.js";
import { screenBuffer as gameScreen } from "./game-screen.js";
import { printScreen } from "../screen/print-screen.js";
import { printRemote, syncRemote } from "../screen/print-remote.js"
import { renderMap } from "../map/render-map.js";
import EntSpriteRenderer from "../entities/render-sprites.js";



let isRendering = false;
let isPrinting = false;


const onFinishPrint = () => {
    isPrinting = false;
};

export const RenderEvent = new class RenderEventTag extends LoopEvent
{
    constructor() {
        super();
        this.enabled = true;
    }

    /**
     * @param {LoopPollArg} arg 
     */
    onEvent(arg) {
        if (isRendering || isPrinting)
            return;

        super.onEvent(arg);
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

        printRemote(gameScreen).finally(onFinishPrint).catch(() => {  });
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





export const queueRender = () => {
    RenderEvent.requestPollImmediate();
};