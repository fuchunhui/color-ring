import Color from '../base/color';
import {make, mix} from '../utils/color';

const colorList = [
  '#FFFF00', '#FFAA00', '#FF8000', '#FF5500', 
  '#FF0000', '#FF0080', '#FF00FF', '#8080FF', 
  '#0080FF', '#00FFFF', '#00FF00', '#80FF00'
];

const baseColor = colorList.map(color => new Color(color));
const colors = make(baseColor, 1, mix);

/**
 * 顺时针绘制色相环
 * @param colors 颜色数组
 * @param ctx CanvasRenderingContext2D
 */
const ring = (colors: Color[], ctx: CanvasRenderingContext2D): void => {
  
};

const edge = 20;
const deep = 3;
const x = (1 + deep * 3 / 2) * edge;
const y = x;

/**
 * 根据正六边形中心点坐标，获取六个顶点坐标
 * @param x 横坐标
 * @param y 纵坐标
 * @param e 边长
 * @returns 六个顶点坐标
 */
const makePoints = (x: number, y: number, e: number) => {
  return [
    {
      x: x + e / 2,
      y: y - e * Math.sqrt(3) / 2,
    },
    {
      x: x + e,
      y,
    },
    {
      x: x + e / 2,
      y: y + e * Math.sqrt(3) / 2,
    },
    {
      x: x - e / 2,
      y: y + e * Math.sqrt(3) / 2,
    },
    {
      x: x - e,
      y,
    },
    {
      x: x - e / 2,
      y: y - e * Math.sqrt(3) / 2,
    }
  ];
};

const hexagon = (x: number, y: number, edge: number, color: Color, ctx: CanvasRenderingContext2D) => {
  const points = makePoints(x, y, edge);
  ctx.beginPath();
  points.forEach(({x, y}, index) => {
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.fillStyle = color.toRGBA();
  ctx.fill();
  ctx.closePath();
};

const convert = (ctx: CanvasRenderingContext2D): void => {
  // ring(colors, ctx);
  hexagon(x, y, edge, new Color('#FF0000'), ctx);
};

export {
  convert,
  colors
};
