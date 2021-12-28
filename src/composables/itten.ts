import Color from '../base/color';
import ring from "./ring";

/**
 * 理论上的RYB色值
 * 基于https://blog.csdn.net/weixin_44938037/article/details/90599711 建立
 * 使用目前的自定义的mix算法，不能满足要求，故直接给颜色值。
 */
const colorList = [
  '#FF0000', '#FF5500', '#FF8000', '#FFAA00',
  '#FFFF00', '#80FF00', '#00FF00', '#00FFFF',
  '#0080FF', '#8080FF', '#FF00FF', '#FF0080'
];

const colors = colorList.map(color => new Color(color));

const convert = (ctx: CanvasRenderingContext2D): void => {
  ring(colors, 1, ctx, {
    minr: 200,
    width: 40
  });
};

export {
  convert,
  colors
};
