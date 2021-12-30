import {inject} from 'vue';
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

const convert = (ctx: CanvasRenderingContext2D): void => {
  const {width, height} = inject('rank') as DOMRect;

  ctx.globalCompositeOperation = 'difference';

  tricolor(red, green, blue, ctx);

  ctx.beginPath();
  ctx.fillStyle = 'white'; // 与白色的difference混合，形成CMYK模型
  ctx.fillRect(0, 0, width, height);
};

export {
  convert,
  colors
};

