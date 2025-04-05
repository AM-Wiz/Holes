import { GameTickEvent, GameWorld } from "./game-world.js";
import { EntId } from "../entities/entity.js";
import { MakeBhvr } from "../schedule/events.js";
import { I16V } from "../math/vecmath.js";
import { screenBuffer } from "./game-screen.js";
import { RenderEvent } from "./game-render.js";
import { MotionBhvr } from "./motion.js";



export const CameraTrackBhvr = MakeBhvr({
    name: "camera-tracking",
    func: function (event, arg) {
        const ents = GameWorld.entities;
        const ts = ents.transforms;

        if (this.target == null)
            return;

        if (!ents.isLive(this.target))
            return;

        const pos = ts.getPos(this.target, this.state.posScratch_);
        const height = ts.getHeight(this.target);

        const targetHeight = Math.trunc(height + GameWorld.camera.viewLength / 2);

        pos[0] -= screenBuffer.dim[0] / 2;
        pos[1] -= screenBuffer.dim[1] / 2;

        if (GameWorld.camera.center[0] == pos[0] && GameWorld.camera.center[1] == pos[1] && GameWorld.camera.height == targetHeight)
            return;

        GameWorld.camera.center[0] = pos[0];
        GameWorld.camera.center[1] = pos[1];
        GameWorld.camera.height = targetHeight; // TODO

        RenderEvent.requestRender();
    },
    state: {
        posScratch_: new I16V([0, 0]),
        target: null,
    },
    params: {
        targetId: null,
    },
    events: [GameTickEvent],
    deps: [MotionBhvr],
});