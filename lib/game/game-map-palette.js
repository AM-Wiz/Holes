import { TrnPalette, TrnTile } from "../map/trn-tile.js";

import { get256Color, CColor } from "../screen/color.js";


const getShades = (color, count) => {
    const colors = Array.from({length: count});
    for (let index = 0; index < count; index++) {
        const factor = index / (count - 1);
        colors[index] = get256Color(color[0] * factor, color[1] * factor, color[2] * factor);
    }
    return colors;
}

export const gameMapPalette = TrnPalette.from([
    new TrnTile({
        symbol: '%',
        color: CColor.magentaBright,
        name: 'error',
    }),
    new TrnTile({
        symbol: '‴',
        color: getShades([0.3, 1, 0.2], 5),
        name: 'grass',
    }),
    new TrnTile({
        symbol: '▒',
        color: getShades([0.8, 0.8, 0.8], 5),
        name: 'stone',
    }),
    new TrnTile({
        symbol: '~',
        color: getShades([1, 0.8, 0.5], 5),
        name: 'soil',
    }),
]);