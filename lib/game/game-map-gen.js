import assert from "node:assert";
import { TrnMap } from "../map/trnmap.js";
import { clearTiles, compactTiles, fillTiles, HeightChannel, pushDownTileLayers, randomSeed, randomSplatTiles, TrnCombineChannel, TrnMapZChannel, TrnNoiseChannel } from "../map/trn-gen.js";
import { gameMapPalette } from "./game-map-palette.js";
import { GameWorld } from "./game-world.js"

const trn = new TrnMap();
trn.dim = [20, 20];
// trn.dim = [2, 2];

const buildGameTrn = () => {
    const trn = GameWorld.map;

    clearTiles(trn);
    
    const ws = randomSeed();

    const channelStone = new TrnNoiseChannel({
        channelSeed: "A",
        worldSeed: ws,
        scale: 1 / 30
    });
    
    const channelDirt0 = new TrnNoiseChannel({
        channelSeed: "Dirt0",
        worldSeed: ws,
        scale: 1 / 20
    });

    const channelDirt1 = new TrnNoiseChannel({
        channelSeed: "Dirt1",
        worldSeed: ws,
        scale: 1 / 5
    });
    
    const channelGrass = new TrnNoiseChannel({
        channelSeed: "C",
        worldSeed: ws,
        scale: 1 / 3
    });
    
    randomSplatTiles(trn, {
        heightMode: 'set',
        minHeight: 10,
        maxHeight: 12,

        tileId: gameMapPalette.findTile('stone'),
        layer: 0,

        channel: channelStone,
    });

    pushDownTileLayers(trn, 1);

    randomSplatTiles(trn, {
        heightMode: 'set',
        minHeight: -0.5,
        maxHeight: 2,

        tileId: gameMapPalette.findTile('soil'),
        layer: 0,

        channel: channelDirt0,
    });

    randomSplatTiles(trn, {
        heightMode: 'add',
        minHeight: -1,
        maxHeight: 2,

        tileId: gameMapPalette.findTile('soil'),
        layer: 0,

        channel: channelDirt1,
    });

    pushDownTileLayers(trn, 1);

    randomSplatTiles(trn, {
        heightMode: 'set',

        minHeight: 0.2,
        maxHeight: 0.2,

        tileId: gameMapPalette.findTile('grass'),
        layer: 0,

        mask: new HeightChannel({
            layer: 1,
        }).combine('mul', [
            channelGrass.mapZ(0.8, 1)
        ]),

        minThreshold: 1,
    });


    compactTiles(trn, {
        merge: true,
        bedId: gameMapPalette.findTile('stone'),
    })
}

buildGameTrn();