import Color from '../base/color';
import ring from "./ring";
import {make, mix} from '../utils/color';

const red = '#FF0000';
const green = '#00FF00';
const blue = '#0000FF';
const yellow = '#ffff00';
const cyan = '#00ffff';
const magenta = '#ff00ff';

const baseList = [red, magenta, blue, cyan, green, yellow];
const baseColor = baseList.map(color => new Color(color));
const colors = make(baseColor, 3, mix);

/**
 * 48色环，基于RGB模型绘制
 * 
 * @param ctx CanvasRenderingContext2D
 */
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
