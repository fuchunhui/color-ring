import Color from '../base/color';
import ring from "./ring";

// RGB
const colorList = [
  '#FF0000', '#FF8000', '#FFFF00', '#80FF00',
  '#00FF00', '#00FF80', '#00FFFF', '#0080FF',
  '#0000FF', '#8000FF', '#FF00FF', '#FF0080'
];

const colors = colorList.map(color => new Color(color));

const twelve = (ctx: CanvasRenderingContext2D): void => {
  ring(colors, 1, ctx, {
    minr: 200,
    width: 40
  });
};

export {
  twelve,
  colors
};
