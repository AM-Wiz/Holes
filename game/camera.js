
import { UI16V } from "../math/vecmath.js";

export class Camera {
    constructor() {

    }

    center_ = UI16V.from([0, 0]);

    get center() { return this.center_; }
    
    set center(value) {
        this.center_.copyFrom(value);
    }
}