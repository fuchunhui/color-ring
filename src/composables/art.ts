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


// 美术三原色

// 原色/基色：红黄蓝
// 间色：绿橙紫
// 原色与间色、间色与间色再次混合又形成了 6 种颜色，称为「复色」。最后，原色、间色和复色就组成了「十二色环 Color Wheel」。

// 色环上相对的两个颜色，互补色的概念