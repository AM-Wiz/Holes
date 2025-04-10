
import { EmptyEntComponent, EntComponent, SparseEntComponent } from "../entities/entity-component.js";
import { EntTransforms } from "../entities/transform.js";
import { BhvrDep, MakeBhvr } from "../schedule/events.js";
import GameWorld from "./game-world.js";
import { GameTickEvent } from "./game-tick.js";
import { MotionBhvr } from "./motion.js";

export class GravityConfig
{
    /**
     * When true, the object should fall to ground level
     * @type {Boolean}
     */
    fall = true;

    /**
     * When true, the object should automatically rise out of the ground when buried
     *  @type {Boolean}
     */
    rise = false;
    /**
     * Specifies the maximum depth that a rising object may surface from.
     * When null, no limit is applied
     * @type {?Number}
     */
    riseLimit = null;
    
    /**
     * Specifies the speed at which a rising object may surface.
     * When null, the object should surface instantly
     * @type {?Number}
     */
    riseSpeed = null;

    /**
     * @param {GravityConfig} options 
     */
    constructor(options) {
        if (options != null)
            Object.assign(this, options);
    }
}

/**
 * Allows objects to rise and fall to automatically conform to the terrain
 * @extends EntComponent
 * @property {Number} fallSpeed
 */
export const EntGravity = EntComponent.makeComponent(GravityConfig, {
    name: "gravity",
    containerType: SparseEntComponent,
    params: {
        fallSpeed: 5,
    },
    register: true,
})

GameWorld.entities.registerAspect(EntGravity);

export const EntBuried = EntComponent.makeComponent(Number, {
    name: "buried",
    containerType: SparseEntComponent,
    register: true,
});

const getRiseFallSpeed = (distToFall, fallSpeed, deltaTurn) => {
    let fallDist = fallSpeed * deltaTurn;

    // Round up to height quanta
    fallDist = Math.max(fallDist, EntTransforms.heightQuanta);

    // Ensure we do not overshoot
    if (fallDist > distToFall)
        fallDist = distToFall;

    return fallDist;
}

export const GravityBhvr = MakeBhvr({
    name: "gravity",
    func: function (event, arg) {
        const ts = GameWorld.entities.transforms;
        const g = GameWorld.entities.getAspect(EntGravity);
        const brd = GameWorld.entities.getAspect(EntBuried);

        for (const id of g.ids) {
            if (!GameWorld.entities.isLive(id))
                continue;

            const gc = g.get(id);
            const pos = ts.getTile(id);
            const curH = ts.getHeight(id);
            
            const trnH = GameWorld.map.getHeight(pos[0], pos[1]);
            if (trnH == null)
                continue;
    
            if ((gc?.fall ?? true) && curH > trnH) {
                // Falling is enabled, and we are above the ground

                const distToFall = curH - trnH;
                const fallDist = getRiseFallSpeed(distToFall, g.fallSpeed, arg.deltaTurn);
                
                ts.setHeight(id, curH - fallDist);
            } else if ((gc?.rise ?? false) && curH < trnH) {
                // Surfacing is enabled, and we are below the ground
                
                let distToRise = trnH - curH;

                const limit = gc?.riseLimit;
                if (limit == null || distToRise <= limit) {
                     // We are above the rise limit

                    const speed = gc?.riseSpeed;
                    if (speed != null) {
                        // We have a speed limit
                        const riseDist = getRiseFallSpeed(distToRise, g.fallSpeed, arg.deltaTurn);
                        
                        ts.setHeight(id, curH + riseDist);
                        distToRise -= riseDist;
                    } else {
                        // We can rise instantly
                        ts.setHeight(id, trnH);
                        distToRise = 0;
                    }
                }

                if (brd != null) {
                    if (brd.hasId(id))
                        brd.set(id, distToRise);
                    else
                        brd.remove(id);
                }
            }
        }
    },
    enabled: true,
    events: [GameTickEvent],
    deps: [new BhvrDep(MotionBhvr, BhvrDep.after)], // TODO accumulate into velocity instead of applying directly?
})