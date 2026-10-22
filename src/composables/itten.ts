import Color from '../base/color';

/**
 * RYB色环的sRGB近似色值，并非RYB到RGB的模型换算。
 * 基于https://blog.csdn.net/weixin_44938037/article/details/90599711 建立
 * 使用目前的自定义的mix算法，不能满足要求，故直接给颜色值。
 * 原色为黄、红、天蓝（索引0、4、8），次色为橙、紫（取品红）、绿（索引2、6、10），
 * 色相间隔不均匀是刻意为之：相对RGB色环，RYB环给黄到红的橙色区域留了4格（色相仅跨60°），
 * 蓝到绿只占2格（色相跨90°）。
 */
const colorList = [
  '#FFFF00', '#FFAA00', '#FF8000', '#FF5500',
  '#FF0000', '#FF0080', '#FF00FF', '#4000FF',
  '#0080FF', '#00FFFF', '#00FF00', '#80FF00'
];

const colors = colorList.map(color => new Color(color));

const lineWidth = 40;
const r = 200;
const around = 10;

const x = r + lineWidth + around;
const y = x;
const radius = 2 * Math.PI / colors.length;
const inner = r - lineWidth / 2;

/**
 * 顺时针绘制色相环
 * @param colors 颜色数组
 * @param ctx CanvasRenderingContext2D
 */
const ring = (colors: Color[], ctx: CanvasRenderingContext2D): void => {
  const offset = (Math.PI + radius) / 2;
  ctx.lineWidth = lineWidth;

  colors.forEach((color, index) => {
    const startAngle = index * radius - offset;
    const endAngle = startAngle + radius;

    ctx.beginPath();
    ctx.strokeStyle = color.toRGBA();
    ctx.arc(x, y, r, startAngle, endAngle);
    ctx.stroke();
    ctx.closePath();
  });
};

const primary = (colors: Color[], ctx: CanvasRenderingContext2D) => {
  const [first, second, third] = colors;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.fillStyle = first.toRGBA();
  ctx.moveTo(x, y);
  ctx.lineTo(x - inner * Math.sqrt(3) / 4, y - inner / 4);
  ctx.lineTo(x, y - inner);
  ctx.lineTo(x + inner * Math.sqrt(3) / 4, y - inner / 4);
  ctx.fill();
  ctx.closePath();

  ctx.beginPath();
  ctx.fillStyle = second.toRGBA();
  ctx.moveTo(x, y);
  ctx.lineTo(x + inner * Math.sqrt(3) / 4, y - inner / 4);
  ctx.lineTo(x + inner * Math.sqrt(3) / 2, y + inner / 2);
  ctx.lineTo(x, y + inner / 2);
  ctx.fill();
  ctx.closePath();

  ctx.beginPath();
  ctx.fillStyle = third.toRGBA();
  ctx.moveTo(x, y);
  ctx.lineTo(x - inner * Math.sqrt(3) / 4, y - inner / 4);
  ctx.lineTo(x - inner * Math.sqrt(3) / 2, y + inner / 2);
  ctx.lineTo(x, y + inner / 2);
  ctx.fill();
  ctx.closePath();
};

const secondary = (colors: Color[], ctx: CanvasRenderingContext2D) => {
  const [first, second, third] = colors;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.fillStyle = first.toRGBA();
  ctx.lineTo(x, y - inner);
  ctx.lineTo(x + inner * Math.sqrt(3) / 2, y + inner / 2);
  ctx.lineTo(x + inner * Math.sqrt(3) / 2, y - inner / 2);
  ctx.fill();
  ctx.closePath();

  ctx.beginPath();
  ctx.fillStyle = second.toRGBA();
  ctx.lineTo(x + inner * Math.sqrt(3) / 2, y + inner / 2);
  ctx.lineTo(x - inner * Math.sqrt(3) / 2, y + inner / 2);
  ctx.lineTo(x, y + inner);
  ctx.fill();
  ctx.closePath();

  ctx.beginPath();
  ctx.fillStyle = third.toRGBA();
  ctx.lineTo(x - inner * Math.sqrt(3) / 2, y + inner / 2);
  ctx.lineTo(x, y - inner);
  ctx.lineTo(x - inner * Math.sqrt(3) / 2, y - inner / 2);
  ctx.fill();
  ctx.closePath();
};

const convert = (ctx: CanvasRenderingContext2D): void => {
  ring(colors, ctx);
  primary(colors.filter((item, index) => [0, 4, 8].includes(index)), ctx);
  secondary(colors.filter((item, index) => [2, 6, 10].includes(index)), ctx);
};

export {
  convert,
  colors
};
