import tricolor from "./tricolor";

// 颜色或者使用rgba表示 rgba(255,0,0,1)
const red = '#FF0000';
const green = '#00FF00'; // lime
const blue = '#0000FF';

const light = (ctx: CanvasRenderingContext2D): void => {
  tricolor(red, green, blue, ctx);
};

export default light;
