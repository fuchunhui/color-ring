import {inject} from 'vue';
import tricolor from "./tricolor";

const red = '#FF0000';
const green = '#00FF00'; // lime
const blue = '#0000FF';

const art = (ctx: CanvasRenderingContext2D): void => {
  const {width, height} = inject('rank') as DOMRect;

  ctx.globalCompositeOperation = 'difference';

  tricolor(red, green, blue, ctx);

  ctx.beginPath();
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);
};

export default art;
