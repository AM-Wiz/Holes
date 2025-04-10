
import { EmptyEntComponent, EntComponent, SparseEntComponent } from "../entities/entity-component.js";
import { EntAspect } from "../entities/entity.js";
import { EntTransforms } from "../entities/transform.js";
import { SparseVecEntComponent } from "../entities/vec-entity-comonent.js";
import { getSolidIncline } from "../map/solid.js";
import { F32V, I16V } from "../math/vecmath.js";
import { BhvrDep, MakeBhvr } from "../schedule/events.js";
import GameWorld from "./game-world.js";
import { GameTickEvent } from "./game-tick.js";
import { EntBuried, GravityBhvr } from "./gravity.js";
import { EntMotion, EntVelocity, MotionBhvr } from "./motion.js";

export class MovementConfig
{
    static Walk = 0;
    static Fly = 1;
    static Tunnel = 2;
    static Ghost = 3;

    /** @typedef {Walk|Fly|Ghost|Tunnel} Type */

    /** @type {Type} */
    type = MovementConfig.Walk;

    /**
     *  The maximum speed which the entity may move at.
     *  @type {Number}
     */
    maxSpeed = 1;

    /**
     *  A multiplier applied to speed when under the surface of the ground
     *  @type {Number}
     */
    burrowMult = 1;

    /**
     *  A multiplier applied to speed when above the ground
     *  @type {Number}
     */
    flyMult = 1;

    /**
     * A multiplier applied to speed when on the surface of the ground
     * @type {Number}
     */
    walkMult = 1;


    /**
     * A multiplier applied when walking up or down a steep incline
     * @type {Number}
     */
    walkSteepMult = 0.5;

    maxSteep = 3;


    /**
     * @param {MovementConfig} options 
     */
    constructor(options) {
        if (options != null)
            Object.assign(this, options);
    }


    get falls() { return this.type == MovementConfig.Walk || this.type == MovementConfig.Tunnel; }
    get flys() { return this.type == MovementConfig.Fly || this.type == MovementConfig.Ghost; }
    get burrows() { return this.type == MovementConfig.Tunnel || this.type == MovementConfig.Ghost; }
    get ghost() { return this.type == MovementConfig.Ghost; }
}

export const EntMovement = EntComponent.makeComponent(MovementConfig, {
    name: "movement",
    containerType: SparseEntComponent,
    register: true,
})

GameWorld.entities.registerAspect(EntMovement);



/**
 * Controls the motion of moving entities
 */
export class EntHeading extends SparseVecEntComponent
{
    constructor() {
        super({
            type: F32V,
            width: 3,
        });
    }

    getMotion(id, result) {
        return super.get(id, result);
    }
    setMotion(id, value) {
        super.set(id, value);
    }
    

    targetScratch_ = new F32V(3);

    getTarget(id, result) {
        this.getMotion(id, result);
        let t = this.table.transforms.get(id, this.targetScratch_);

        return t.add(result, result);
    }
    setTarget(id, value) {
        let t = this.table.transforms.get(id, this.targetScratch_);

        t = value.sub(t, t);
        if (value.length < 3)
            t.fill(0, value.length);

        this.setMotion(id, t);
    }
};

EntAspect.register(EntHeading, {
    keyName: "heading",
    strongName: true,
});

GameWorld.entities.registerAspect(EntHeading);



export const MoveBhvr = MakeBhvr({
    name: "movement",
    func: function (event, arg) {
        const ents = GameWorld.entities;
        const ts = ents.transforms;
        const mv = ents.getAspect(EntMovement);
        const hd = ents.getAspect(EntHeading);
        const mot = ents.getAspect(EntMotion);
        const map = GameWorld.map;

        for (const id of mv.ids) {
            if (!ents.isLive(id))
                continue;

            const mc = mv.get(id);
            if (mc == null)
                continue; // We have no movement configured, skip

            if (!hd.hasId(id))
                continue;
            const curHead = hd.get(id, this.state.headScratch);
            if (curHead.isZero)
                continue; // We have no heading, stay put

            
            const pos = ts.get(id);
            const curH = pos[2];
            
            let heightFromGround = 0;
            const trnH = map.getHeight(pos[0], pos[1]);
            if (trnH != null)
                heightFromGround = curH - trnH;

            let walking = false;
            let mult = 1;
            if (heightFromGround < -0.5) {
                if (!mc.burrows)
                    continue;

                mult *= mc.burrowMult;
            } else if (heightFromGround > 0.5) {
                if (!mc.flys)
                    continue;

                mult *= mc.flyMult;
            } else {
                mult *= mc.walkMult;

                walking = !mc.ghost;
            }
            
            let hDif = 0;
            if (walking) {
                const inc = getSolidIncline(map, pos[0], pos[1], this.state.inclineScratch);
                const destDir = this.state.destScratch.copyFrom(curHead);
                destDir.normalize(destDir);
                
                const hDif = destDir.dot(inc);
                const steep = Math.abs(hDif);

                if (steep > mc.maxSteep)
                    continue;
                
                const x = (steep / mc.maxSteep);
                const incMult = (1 - x) + x * mc.walkSteepMult;
                
                mult *= incMult;

                // TODO add height difference
            }
            
            // TODO use velocity

            // const vel = vt.get(id, this.state.velScratch);

            // const velMag = vel.mag;

            // if (velMag > mc.maxSpeed)
            //     continue;

            /*
            this.state.time_ ??= 0;
            this.state.time_ += arg.deltaTurn;
            if (this.state.time_ > 1) {
                this.state.time_ %= 1;
            }
            */
            // TODO delta time is not reflective of actual passage of time

            if (walking) {
                curHead[2] = hDif;
            }

            const moveDist = mc.maxSpeed * mult * arg.deltaTurn;

            mot.add(id, curHead.mul(moveDist, this.state.headScratch2));

            hd.setMotion(id, curHead.mul((1 - moveDist), this.state.headScratch2));
        }
    },
    state: {
        headScratch: new F32V(3),
        headScratch2: new F32V(3),
        motScratch: new F32V(3),
        destScratch: new F32V(2),
        velScratch: new F32V(3),
    },
    enabled: true,
    events: [GameTickEvent],
    deps: [new BhvrDep(MotionBhvr, BhvrDep.before), new BhvrDep(GravityBhvr, BhvrDep.before)],
})