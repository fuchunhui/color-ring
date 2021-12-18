import tricolor from "./tricolor";

const magenta = '#FF00FF';
const yellow = '#FFFF00';
const cyan = '#00FFFF';

const red = '#FF0000';
const green = '#00FF00'; // lime
const blue = '#0000FF';

// /.....
// TODO 如何绘制美术三原色，红黄蓝，和对应的间色

// 可能的思路，显示三原色基础内容，然后再来一个canvas绘制白色，取返，看看效果。

// 试试例子，本地运行那种 https://github.com/mdn/translated-content/blob/main/files/zh-cn/web/api/canvas_api/tutorial/compositing/example/index.html

const art = (ctx: CanvasRenderingContext2D): void => {
  ctx.globalCompositeOperation = 'difference';

  tricolor(red, green, blue, ctx);
  // ctx.closePath();
  // ctx.beginPath();
  // ctx.fillStyle = 'white';
  // ctx.fillRect(0, 0, 600, 600);
  
};

export default art;
