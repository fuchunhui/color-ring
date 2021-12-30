import tricolor from "./tricolor";
import Color from '../base/color';

const red = '#FF0000';
const green = '#00FF00';
const blue = '#0000FF';
const yellow = '#ffff00';
const cyan = '#00ffff';
const magenta = '#ff00ff';
const white = '#FFFFFF';

const baseList = [red, yellow, green, cyan, blue, magenta, white];
const colors = baseList.map(color => new Color(color));

const light = (ctx: CanvasRenderingContext2D): void => {
  ctx.globalCompositeOperation = 'screen'; // lighter在a = 1的时候，效果同screen
  tricolor(red, green, blue, ctx);
};

export {
  light,
  colors
};
