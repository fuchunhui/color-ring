import Color from '../base/color';
import ring from "./ring";

const red = '#FF0000';
const green = '#00FF00'; // lime
const blue = '#0000FF';
const colors = [new Color(red), new Color(green), new Color(blue), new Color('#FFFF00'), new Color('FF00FF')];

const twelve = (ctx: CanvasRenderingContext2D): void => {
  ring(colors, 2, ctx, {
    minr: 100
  });
};

export {
  twelve,
  colors
};
