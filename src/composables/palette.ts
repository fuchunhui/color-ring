import Color from '../base/color';
import {hsl} from '../utils/color';
import {computedCounts, generatePoints, hexagon} from './hexagon';

const drawBackground = (x: number, y: number, edge: number, deep: number = 1, ctx: CanvasRenderingContext2D) => {
  const ne = (deep + 1) * edge * Math.sqrt(3);
  ctx.beginPath();
  const points = [
    {
      x: x + ne * Math.sqrt(3) / 2,
      y: y - ne / 2
    },
    {
      x: x + ne * Math.sqrt(3) / 2,
      y: y + ne / 2
    },
    {
      x,
      y: y + ne
    },
    {
      x: x - ne * Math.sqrt(3) / 2,
      y: y + ne / 2
    },
    {
      x: x - ne * Math.sqrt(3) / 2,
      y: y - ne / 2
    },
    {
      x,
      y: y - ne
    }
  ];
  points.forEach(({x, y}, index) => {
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.fillStyle = '#000000';
  ctx.fill();
  ctx.closePath();
};

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

  drawBackground(x, y, edge, deep, ctx);
  const outPoints = generatePoints(x, y, edge, deep);
  outPoints.forEach(({x, y}, index) => {
    hexagon(x, y, edge, colors[index], ctx);
  });
};

const deep = 8;
const all = computedCounts(deep);

let colorStr = [];
for (let i = 0; i < all; i++) {
  const random = Math.floor(Math.random() * 0xFFF);
  colorStr.push(random);
}
colorStr = colorStr.sort((a, b) => b - a);

const colors: Color[] = colorStr.map(color => new Color(`#${color.toString(16).padStart(3, '0')}`));

const convert = (ctx: CanvasRenderingContext2D): void => {
  const edge = 25;
  make(colors, edge, deep, ctx);
};

export {
  convert,
  colors
};
