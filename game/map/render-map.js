
import { UI16V } from "../../math/vecmath.js";

import { TrnMap, TrnMapChunk } from "./trnmap.js";

import { Camera } from "../camera.js";

import screen from "../../screen/screen.js";

import { Color } from "../../screen/color.js";


/**
 * Render the map
 * @param {TrnMap|TrnMapChunk} map The map to render
 * @param {Camera} camera The camera to render the map through
 * @param {?UI16V} screenOrigin An option screen original, if not supplied `[0, 0]` is assumed
 */
export const renderMap = (map, camera, screenOrigin) => {
    if (map instanceof TrnMapChunk) {

    } else if (map instanceof TrnMap) {

    } else {
        throw new Error("Invalid map");
    }
};