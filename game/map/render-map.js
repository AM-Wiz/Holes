
const {UI16V} = require("../../math/vecmath.js");

const {TrnMap, TrnMapChunk} = require("./trnmap.js");

const {Camera} = require("../camera.js");

const screen = require("../../screen/screen.js");

const {Color} = require("../../screen/color.js");


/**
 * Render the map
 * @param {TrnMap|TrnMapChunk} map The map to render
 * @param {Camera} camera The camera to render the map through
 * @param {?UI16V} screenOrigin An option screen original, if not supplied `[0, 0]` is assumed
 */
renderMap = (map, camera, screenOrigin) => {
    if (map instanceof TrnMapChunk) {

    } else if (map instanceof TrnMap) {

    } else {
        throw new Error("Invalid map");
    }
};




module.exports = {

};
