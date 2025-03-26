import { Behavior, BhvrDep, MakeBhvr } from "../schedule/events.js";
import { LoopEvent } from "../schedule/loopevents.js";
import GameWorld from "./game-world.js";
import { Screen } from "../screen/screen.js";
import { screenBuffer as gameScreen } from "./game-screen.js";
import { printScreen } from "../screen/print-screen.js";
import { renderMap } from "../map/render-map.js";




export const RenderEvent = new class RenderEventTag extends LoopEvent
{
    constructor() {
        super();
        this.enabled = true;
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
        printScreen(gameScreen);
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
        
    }
}
RenderEvent.addBehavior(RenderSprites);





export const queueRender = () => {
    RenderEvent.requestPollImmediate();
};