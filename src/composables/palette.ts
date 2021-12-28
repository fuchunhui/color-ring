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

/**
 * 计算某一层数下面的坐标点集合
 * @param x 初始正六边形横坐标
 * @param y 纵坐标
 * @param edge 边
 * @param deep 当前层数，只有一个六边形，deep为0
 * @returns 
 */
const movePoints = (x: number, y: number, edge: number, deep: number = 1) => {
  if (deep === 0) {
    return [{x, y}];
  }

  const rightup = [], rightdown = [], down = [], leftdown = [], leftup = [], up = [];
  for (let i = 1; i <= deep; i++) {
    rightup.push({
      x: x + i * edge * 3 / 2,
      y: y - deep * edge * Math.sqrt(3) + i * edge * Math.sqrt(3) / 2
    });
    rightdown.push({
      x: x + deep * edge * 3 / 2,
      y: y + deep * edge * Math.sqrt(3) / 2 - (deep - i) * edge * Math.sqrt(3)
    });
    down.push({
      x: x + (deep - i) * edge * 3 / 2,
      y: y + deep * edge * Math.sqrt(3) - (deep - i) * edge * Math.sqrt(3) / 2
    });
    leftdown.push({
      x: x - i * edge * 3 / 2,
      y: y + deep * edge * Math.sqrt(3) - i * edge * Math.sqrt(3) / 2
    });
    leftup.push({
      x: x - deep * edge * 3 / 2,
      y: y + deep * edge * Math.sqrt(3) / 2 - i * edge * Math.sqrt(3)
    });
    up.push({
      x: x - (deep - i) * edge * 3 / 2,
      y: y - deep * edge * Math.sqrt(3) + (deep - i) * edge * Math.sqrt(3) / 2
    });
  }
  const all = rightup.concat(rightdown, down, leftdown, leftup, up);
  return all;
};

const convert = (ctx: CanvasRenderingContext2D): void => {
  // ring(colors, ctx);
  hexagon(x, y, edge, new Color('#FF0000'), ctx);

  const outPoints = movePoints(x, y, edge, 2); // 获取2层的所有中心坐标点
  outPoints.forEach(({x, y}) => {
    const color = '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16);
    hexagon(x, y, edge, new Color(color), ctx);
  });

  // 绘图，绘制2层的六边形

  // 上面为测试信息
  // 递归绘制，首先根据deep层数，递归处理，没一层的六边形内容。
  // 由中心开始，然后右上角，顺时针方向回来
};

export {
  convert,
  colors
};
