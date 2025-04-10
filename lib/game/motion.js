
import { EmptyEntComponent, EntComponent, SparseEntComponent } from "../entities/entity-component.js";
import { EntAspect } from "../entities/entity.js";
import { EntTransforms } from "../entities/transform.js";
import { SparseVecEntComponent } from "../entities/vec-entity-comonent.js";
import { F32V, I16V } from "../math/vecmath.js";
import { BhvrDep, MakeBhvr } from "../schedule/events.js";
import GameWorld from "./game-world.js";
import { GameTickEvent } from "./game-tick.js";
import { GravityBhvr } from "./gravity.js";


export class EntMotion extends EntComponent.makeComponent(F32V, {
        name: "motion",
        containerType: SparseVecEntComponent,
        containerArgs: {
            type: F32V,
            width: 3,
        },
        register: false,
    }) {
    
    constructor() {
        super();
    }


    scratch_ = new F32V(3);

    add(id, motion) {
        let m = this.get(id, this.scratch_);
        m = m.add(motion, m); // TODO avoid GC waste

        this.set(id, m);
    }

    getTotal(id, result) {
        const t = this.table.transform.get(id, this.scratch_);

        const diff = this.get(id, result);

        return t.add(diff, diff);
    }
}

EntAspect.register(EntMotion);
GameWorld.entities.registerAspect(EntMotion);


export const EntVelocity = EntComponent.makeComponent(F32V, {
    name: "velocity",
    containerType: SparseVecEntComponent,
    containerArgs: {
        type: F32V,
        width: 3,
    },
    register: true,
});

GameWorld.entities.registerAspect(EntVelocity);


export const MotionBhvr = MakeBhvr({
    name: "motion",
    func: function (event, arg) {
        const ts = GameWorld.entities.transforms;
        const mt = GameWorld.entities.getAspect(EntMotion);
        const vel = GameWorld.entities.getAspect(EntVelocity);

        for (const id of mt.ids) {
            if (!GameWorld.entities.isLive(id))
                continue;

            let curPos = ts.get(id, this.state.destScratch);
            let curMot = mt.get(id, this.state.motScratch);

            if (vel.hasId(id)) {
                const curVel = vel.get(id, this.state.velScratch);
                curVel.mul(arg.deltaTurn, curVel);
    
                curMot.add(curVel, curMot);
            }

            let any = false;
            for (let i = 0; i < curMot.length; i++) {
                if (Math.abs(curMot[i]) < 1)
                    continue;

                const moved = Math.trunc(curMot[i]);
                curMot[i] -= moved;
                
                curPos[i] += moved;

                any = true;
            }
            
            if (Math.abs(curMot[2]) >= EntTransforms.heightQuanta) {
                const moved = Math.trunc(curMot[2] / EntTransforms.heightQuanta) * EntTransforms.heightQuanta;
                curMot[2] -= moved;
                
                curPos[2] += moved;

                any = true;
            }

            if (!any)
                continue;

            mt.set(id, curMot);
            ts.set(id, curPos);
        }
    },
    state: {
        velScratch: new F32V(3),
        motScratch: new F32V(3),
        destScratch: new F32V(3),
    },
    enabled: true,
    events: [GameTickEvent],
    deps: [],
})