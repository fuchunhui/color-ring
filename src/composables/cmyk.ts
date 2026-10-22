import {inject} from 'vue';
import tricolor from './tricolor';
import Color from '../base/color';

const red = '#FF0000';
const green = '#00FF00';
const blue = '#0000FF';
const yellow = '#ffff00';
const cyan = '#00ffff';
const magenta = '#ff00ff';
const white = '#FFFFFF';
const black = '#000000';

const baseList = [cyan, magenta, yellow, red, green, blue, black, white];
const colors = baseList.map(color => new Color(color));

const convert = (ctx: CanvasRenderingContext2D): void => {
  const {width, height} = inject('rank') as DOMRect;

  ctx.globalCompositeOperation = 'difference';

  tricolor(red, green, blue, ctx);

  ctx.beginPath();
  ctx.fillStyle = 'white'; // 与白色的difference混合，形成CMYK模型
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#888';
  ctx.font = '13px sans-serif';
  ctx.fillText('示意：把RGB取反，模拟理想的青、品红、黄墨。', 10, 340);
  ctx.fillText('中心的黑色由CMY叠加得到；真实印刷另有独立的K墨。', 10, 360);
  ctx.fillText('右侧CMYK数值是朴素公式换算，不含ICC色彩配置文件。', 10, 380);
};

export {
  convert,
  colors
};

