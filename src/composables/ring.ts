import Color from '../base/color';
import {RING_OPTIONS} from '../types';

const WIDTH = 30;
const RADIUS = 200;
const AROUND = 10;

const ring = (colors: Color[], deep: number = 1, ctx: CanvasRenderingContext2D, options: RING_OPTIONS): void => {
  if (!colors.length || deep < 1) {
    return;
  }

  const lineWidth = options?.width ?? WIDTH;
  console.log('默认的linewidth为：', lineWidth);

  const r = options?.minr ?? RADIUS;
  console.log('默认的最小半径为为：', r);

  // 计算colors 的个数
  // 把圆分成多少份，循环绘制每一层
  // 根据deep的层数，把圆分成多少层，从最内层开始向外颜色加深。
  // 最外层为alpha 1，加一次，颜色alpha小于10%。


  const x = r + deep * lineWidth + AROUND;
  const y = x;

  ctx.lineWidth = lineWidth;

  // 循环画圆。



  ctx.beginPath();
  ctx.strokeStyle = 'red';
  ctx.arc(x, y, r, 0, Math.PI / 2);
  ctx.stroke();
  ctx.closePath();
  ctx.beginPath();
  ctx.strokeStyle = 'blue';
  ctx.arc(x, y, r, Math.PI / 2, Math.PI);
  ctx.stroke();
  ctx.closePath();
  ctx.beginPath();
  ctx.strokeStyle = 'yellow';
  ctx.arc(x, y, r2, 0, Math.PI / 2);
  ctx.stroke();
  ctx.closePath();
};

export default ring;
