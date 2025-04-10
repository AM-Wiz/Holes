import { Camera } from "../camera.js";
import { EntTable } from "../entities/entity.js";
import { EntRender } from "../entities/render.js";
import { EntTransforms } from "../entities/transform.js";
import { gameMapPalette } from "./game-map-palette.js";

import { TrnMap } from "../map/trnmap.js";


const GameWorld = new class GameWorldTag {
    /** @type {TrnMap} */
    map = new TrnMap({
        dim: [10, 10],
        palette: gameMapPalette,
    });
    
    /** @type {EntTable} */
    entities = new EntTable({
        aspects: [EntTransforms, EntRender],
    });
    
    /** @type {Camera} */
    camera = new Camera({
        viewTop: 5,
        viewBottom: -5,
    });

    /** @type {Number} */
    time = 0;
};

export { GameWorld };

export default GameWorld;
