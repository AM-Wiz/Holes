
import { EmptyEntComponent, EntComponent, SparseEntComponent } from "../entities/entity-component.js";
import { EntAspect } from "../entities/entity.js";
import { EntTransforms } from "../entities/transform.js";
import { SparseVecEntComponent } from "../entities/vec-entity-comonent.js";
import { F32V, I16V } from "../math/vecmath.js";
import { BhvrDep, MakeBhvr } from "../schedule/events.js";
import GameWorld, { GameTickEvent } from "./game-world.js";
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
    
    getTarget(id, result) {
        return super.get(id, result);
    }
    setTarget(id, value) {
        super.set(id, value);
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

            const pos = ts.getPos(id);
            const curH = ts.getHeight(id);
            
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
            } else if (heightFromGround > 0.1) {
                if (!mc.flys)
                    continue;

                mult *= mc.flyMult;
            } else {
                mult *= mc.walkMult;

                walking = !mc.ghost;
            }
            
            let hDif = 0;
            if (walking) {
                const destDir = this.state.destScratch.copyFrom(curHead);
                destDir.normalize(destDir);
                
                hDif = this.state.getIncline(map, pos, trnH, destDir);

                if (hDif > mc.maxSteep)
                    continue;
                
                const x = (hDif / mc.maxSteep);
                const incMult = (1 - x) + x * mc.walkSteepMult;
                
                mult *= incMult;
            }
            
            // TODO use velocity

            // const vel = vt.get(id, this.state.velScratch);

            // const velMag = vel.mag;

            // if (velMag > mc.maxSpeed)
            //     continue;

            /*
            this.state.time_ ??= 0;
            this.state.time_ += arg.deltaTime;
            if (this.state.time_ > 1) {
                this.state.time_ %= 1;
            }
            */
            // TODO delta time is not reflective of actual passage of time

            if (walking) {
                curHead[2] = hDif;
            }

            curHead.mul(mult * arg.deltaTime, curHead);

            curHead.mul(mc.maxSpeed, curHead); // TODO

            mot.add(id, curHead);
        }
    },
    state: {
        headScratch: new F32V(3),
        motScratch: new F32V(3),
        destScratch: new F32V(2),
        velScratch: new F32V(3),

        gpaScratch: {
            axis: [new F32V(2), new F32V(2), new F32V(2)],
            score: new F32V(3),
        },

        caclcPAxScore(motion, axis) {
            const c = motion.cosBetween(axis);

            const half = 0.707;
            return Math.max(0, (c - half) / (1 - half));
        },

        getPrimaryAxis(motion) {
            const result = this.gpaScratch;
            const axis = result.axis;
            const score = result.score;

            axis[0] = motion.getSign(axis[0]);
            if (axis[0][0] == 0 || axis[0][1] == 0) {
                score.fill(0);
                score[0] = this.caclcPAxScore(motion, axis[0]);

                return result;
            }

            axis[1].copyFrom(axis[0]), axis[1][0] = 0;
            axis[2].copyFrom(axis[0]), axis[2][1] = 0;
            for (let i = 0; i < 3; i++) {
                score[i] = this.caclcPAxScore(motion, axis[i]);
            }

            return result;
        },

        getIncline(map, pos, height, direction) {
            const { axis, score } = this.getPrimaryAxis(direction); // TODO can we cache this?

            let totalInc = 0;
            let totalScore = 0;
            for (let i = 0; i < axis.length; i++) {
                if (score[i] <= 0)
                    continue;

                totalScore += score[i];

                const oh = map.getHeight(pos[0] + axis[i][0], pos[1] + axis[i][1]);
                if (oh == null)
                    continue;

                const inc = oh - height;

                totalInc += inc * score[i];
            }

            if (totalScore > 0)
                totalInc /= totalScore;

            return totalInc;
        },
    },
    enabled: true,
    events: [GameTickEvent],
    deps: [new BhvrDep(MotionBhvr, BhvrDep.before), new BhvrDep(GravityBhvr, BhvrDep.before)],
})