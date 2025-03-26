import { TrnMap } from "../map/trnmap.js";
import { fillTiles, randomSeed, randomSplatTiles, TrnCombineChannel, TrnMapZChannel, TrnNoiseChannel } from "../map/trn-gen.js";
import { gameMapPalette } from "./game-map-palette.js";
import { GameWorld } from "./game-world.js"

const trn = new TrnMap();
trn.dim = [20, 20];
// trn.dim = [2, 2];

const buildGameTrn = () => {
    const trn = GameWorld.map;

    fillTiles(trn, {
        tileId: 2,
        height: 0,
    });

    const ws = randomSeed();

    const channelA = new TrnNoiseChannel({
        channelSeed: "A",
        worldSeed: ws,
        scale: 1 / 10
    });
    
    const channelB = new TrnCombineChannel(
        TrnCombineChannel.Modes.mul,
        [
            new TrnNoiseChannel({ 
                channelSeed: "B",
                worldSeed: ws, scale: 1 / 10
            }),
            new TrnMapZChannel(
                new TrnNoiseChannel({
                    channelSeed: "BJit",
                    worldSeed: ws,
                    scale: 1 / 2
                }),
                0.5, 1
            ),
        ],
    );

    randomSplatTiles(trn, {
        heightMode: 'set',
        minHeight: -2,
        maxHeight: 2,

        channel: channelA,
    });

    
    randomSplatTiles(trn, {
        heightMode: 'add',
        maxHeight: 2,
        
        channel: channelB,

        tileId: 3,
        
        minThreshold: 0.2,
        mask: channelB,
    });
    
    randomSplatTiles(trn, {
        heightMode: 'add',
        maxHeight: 1,
        
        channel: channelB,

        tileId: 1,

        minThreshold: 0.5,
        mask: channelB,
    });
}

buildGameTrn();