const screen = require("./screen/screen.js");
const {Color} = require("./screen/color.js");

screen.refreshScreen();

screen.clearBuffer('1', Color.darkRed);

screen.printScreen();


const mainLoop = () => {
    screen.refreshScreen();

    screen.clearBuffer('1', Color.darkRed);

    screen.printScreen();
};


