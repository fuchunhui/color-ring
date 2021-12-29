import Color from '../base/color';
import {hsl} from '../utils/color';

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

/**
 * 生产所有的六边形的点
 * @param x 初始正六边形横坐标
 * @param y 纵坐标
 * @param edge 边
 * @param deep 当前层数，只有一个六边形，deep为0
 * @returns 所有点的坐标集合
 */
const generatePoints = (x: number, y: number, edge: number, deep: number = 1) => {
  let result: {x: number; y: number}[] = [];
  for (let i = 0; i <= deep; i++) {
    const points = movePoints(x, y, edge, i);
    result = result.concat(points);
  }
  return result;
};

const counts = (deep: number = 1) => {
  const nums = new Array(deep).fill('').map((item, index) => (index + 1) * 6);
  const count = nums.reduce((a, b) => a + b, 1);
  return count;
};

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
const draw = (colors: Color[], edge: number, deep: number = 1, ctx: CanvasRenderingContext2D): void => {
  const x = (1 + deep * Math.sqrt(3)) * edge + edge;
  const y = x;

  drawBackground(x, y, edge, deep, ctx);
  const outPoints = generatePoints(x, y, edge, deep);
  outPoints.forEach(({x, y}, index) => {
    const random = '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16);
    const color = colors[index] || new Color(random);
    hexagon(x, y, edge, color, ctx);
  });
};

const colors: Color[] = [];
const deep = 8;
const all = counts(deep);

for (let i = 0; i < all; i++) {
  colors.push(hsl(i, 1, 0.5));
}

const convert = (ctx: CanvasRenderingContext2D): void => {
  const edge = 10;
  draw(colors, edge, deep, ctx);
};

export {
  convert,
  colors
};
