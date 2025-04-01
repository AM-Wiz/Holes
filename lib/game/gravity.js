
import { EmptyEntComponent, EntComponent, SparseEntComponent } from "../entities/entity-component.js";
import { EntTransforms } from "../entities/transform.js";
import { MakeBhvr } from "../schedule/events.js";
import GameWorld, { GameTickEvent } from "./game-world.js";

export const Gravity = EntComponent.makeComponent(Boolean, {
    name: "gravity",
    containerType: EmptyEntComponent,
    state: {
        fallSpeed: 5,
    },
});

GameWorld.entities.registerAspect(Gravity);

export const GravityBhvr = MakeBhvr({
    name: "gravity",
    func: (event, arg) => {
        const ts = GameWorld.entities.transforms;
        const g = GameWorld.entities.getAspect(Gravity);

        for (const id of g.ids) {
            if (!GameWorld.entities.isLive(id))
                continue;

            const pos = ts.getPos(id);
            const h = ts.getHeight(id);
            
            const mh = GameWorld.map.getHeight(pos[0], pos[1]);
            if (mh == null)
                return;
    
            if (h > mh) {
                let distToFall = h - mh;
                let fallDist = g.fallSpeed * arg.deltaTime;

                // Round up to height quanta
                fallDist = Math.max(fallDist, EntTransforms.heightQuanta);
    
                // Ensure we do not overshoot
                if (fallDist > distToFall)
                    fallDist = distToFall;
                
                ts.setHeight(id, h - fallDist);
            } else if (h < mh) {
                ts.setHeight(id, mh);
            }
        }
    },
    enabled: true,
    events: [GameTickEvent],
});