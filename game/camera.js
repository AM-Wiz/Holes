
const {UI16V} = require("../math/vecmath.js");

class Camera {
    constructor() {

    }

    center_ = UI16V.from([0, 0]);

    get center() { return this.center_; }
    
    set center(value) {
        this.center_.copyFrom(value);
    }
}


module.exports = {
    Camera,
}