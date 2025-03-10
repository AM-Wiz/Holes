const screen = require("./screen/screen.js");
const {Color} = require("./screen/color.js");

const {F32V} = require("./math/vecmath.js");
const vres = F32V.from([0, 1, 2]).add(5);


screen.refreshScreen();

screen.clearBuffer('1', Color.darkRed);

screen.printScreen();


const mainLoop = () => {
    screen.refreshScreen();

    screen.clearBuffer('1', Color.darkRed);

    screen.printScreen();
};


