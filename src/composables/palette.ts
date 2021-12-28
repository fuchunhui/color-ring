import Color from '../base/color';
import {make, mix} from '../utils/color';

/**
 * 理论上的RYB色值
 * 基于https://blog.csdn.net/weixin_44938037/article/details/90599711 建立
 * 使用目前的自定义的mix算法，不能准确满足要求，故直接给颜色值。
 */
const colorList = [
  '#FFFF00', '#FFAA00', '#FF8000', '#FF5500', 
  '#FF0000', '#FF0080', '#FF00FF', '#8080FF', 
  '#0080FF', '#00FFFF', '#00FF00', '#80FF00'
];

// const colors = colorList.map(color => new Color(color));

const baseList = ['#66B032', '#8601AF', '#ff8000'];
const baseColor = baseList.map(color => new Color(color));
const colors = make(baseColor, 1, mix);

const lineWidth = 40;
const r = 200;
const around = 10;

const x = r + lineWidth + around;
const y = x;
const radius = 2 * Math.PI / colors.length;

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

const convert = (ctx: CanvasRenderingContext2D): void => {
  ring(colors, ctx);
};

export {
  convert,
  colors
};
