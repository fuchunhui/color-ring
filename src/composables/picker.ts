import Color from '../base/color';
import {hsv, hsl} from '../utils/color';

type Mode = 'hsv' | 'hsl';

const PLANE_SIZE = 256;

const planeColor = (mode: Mode, h: number, s: number, x: number): Color => {
  return mode === 'hsv' ? hsv(h, s, x) : hsl(h, s, x);
};

/** 横轴为饱和度，纵轴为明度(V)或亮度(L)，上方为1 */
const drawPlane = (ctx: CanvasRenderingContext2D, mode: Mode, h: number): void => {
  const image = ctx.createImageData(PLANE_SIZE, PLANE_SIZE);
  const last = PLANE_SIZE - 1;
  for (let py = 0; py < PLANE_SIZE; py++) {
    for (let px = 0; px < PLANE_SIZE; px++) {
      const [r, g, b] = planeColor(mode, h, px / last, 1 - py / last).rgb();
      const index = (py * PLANE_SIZE + px) * 4;
      image.data[index] = r;
      image.data[index + 1] = g;
      image.data[index + 2] = b;
      image.data[index + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
};

const drawMarker = (ctx: CanvasRenderingContext2D, s: number, x: number): void => {
  const last = PLANE_SIZE - 1;
  const px = s * last;
  const py = (1 - x) * last;
  ctx.beginPath();
  ctx.arc(px, py, 7, 0, 2 * Math.PI);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#FFF';
  ctx.stroke();
};

const drawHueBar = (ctx: CanvasRenderingContext2D, width: number, height: number, h: number): void => {
  for (let x = 0; x < width; x++) {
    ctx.fillStyle = hsv(x / width * 360, 1, 1).toHex();
    ctx.fillRect(x, 0, 1, height);
  }
  const mx = h / 360 * width;
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  ctx.strokeRect(mx - 3, 1, 6, height - 2);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#FFF';
  ctx.strokeRect(mx - 3, 1, 6, height - 2);
};

export {
  Mode,
  PLANE_SIZE,
  planeColor,
  drawPlane,
  drawMarker,
  drawHueBar
};
