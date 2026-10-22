import {shallowReactive} from 'vue';
import Color from '../base/color';
import {computedCounts, generatePoints, hexagon, randomHex, Point} from './hexagon';
import {stupid} from './random';

/**
 * 顺时针绘制色相环
 * @param x 横坐标
 * @param y 纵坐标
 * @param edge 边
 * @param deep 六边形的层数
 * @param colors 颜色数组
 * @param ctx CanvasRenderingContext2D
 */
const draw = (x: number, y: number, edge: number, points: Point[], ctx: CanvasRenderingContext2D): void => {
  points.forEach(({x, y}) => {
    const color = new Color(randomHex());
    colors.push(color);
    hexagon(x, y, edge, color, ctx);
  });
};

const colors = shallowReactive<Color[]>([]);
const deep = 10;
const all = computedCounts(deep);
const duration = 100;

const convert = (ctx: CanvasRenderingContext2D): () => void => {
  const edge = 20;
  const x = (1 + deep * Math.sqrt(3)) * edge + edge;
  const y = x;

  colors.length = 0;
  const indexs = stupid(all, 6);
  const outPoints = generatePoints(x, y, edge, deep);
  const timers = indexs.map((item, index) => setTimeout(() => {
    const points = item.map(i => outPoints[i]);
    draw(x, y, edge, points, ctx);
  }, index * duration));

  return () => timers.forEach(clearTimeout);
};

export {
  convert,
  colors
};
