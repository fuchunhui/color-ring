import Color from '../base/color';
import {hsl} from '../utils/color';
import {computedCounts, draw} from './hexagon';

/**
 * 顺时针绘制色相环
 * @param colors 颜色数组
 * @param edge 边
 * @param deep 六边形的层数
 * @param ctx CanvasRenderingContext2D
 */
const make = (colors: Color[], edge: number, deep: number = 1, ctx: CanvasRenderingContext2D): void => {
  const x = (1 + deep * Math.sqrt(3)) * edge + edge;
  const y = x;

  draw(x, y, edge, deep, colors, ctx);
};

const colors: Color[] = [];
const deep = 15;
const all = computedCounts(deep);

for (let i = 0; i < all; i++) {
  colors.push(hsl(i, 1, 0.5));
}

const convert = (ctx: CanvasRenderingContext2D): void => {
  const edge = 10;
  make(colors, edge, deep, ctx);
};

export {
  convert,
  colors
};
