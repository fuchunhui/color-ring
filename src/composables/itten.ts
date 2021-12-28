import Color from '../base/color';
import ring from "./ring";
import {makeBlending} from '../utils/color';

// RGB
// const colorList = [
//   '#FF0000', '#FF8000', '#FFFF00', '#80FF00',
//   '#00FF00', '#00FF80', '#00FFFF', '#0080FF',
//   '#0000FF', '#8000FF', '#FF00FF', '#FF0080'
// ];

const red = '#FF0000';
const green = '#00FF00';
const blue = '#0000FF';

const baseList = [red, green, blue];
const baseColor = baseList.map(color => new Color(color));

const colors = makeBlending(baseColor, 1);

console.log('itten: ', colors);

const convert = (ctx: CanvasRenderingContext2D): void => {
  ring(colors, 1, ctx, {
    minr: 200,
    width: 40
  });
};

export {
  convert,
  colors
};
