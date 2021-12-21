import tricolor from "./tricolor";
import Color from '../base/color';

const red = '#FF0000';
const green = '#00FF00'; // lime
const blue = '#0000FF';

const colors = [new Color(red), new Color(green), new Color(blue)];

const light = (ctx: CanvasRenderingContext2D): void => {
  tricolor(red, green, blue, ctx);
};

export {
  light,
  colors
};
