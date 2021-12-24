import Color from '../base/color';
import ring from "./ring";

const red = '#FF0000';
const green = '#00FF00'; // lime
const blue = '#0000FF';
const colors = [new Color(red), new Color(green), new Color(blue)];

const twelve = (ctx: CanvasRenderingContext2D): void => {
  ring(colors, 1, ctx);
};

export {
  twelve,
  colors
};
