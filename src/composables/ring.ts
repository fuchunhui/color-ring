import Color from '../base/color';
import {RING_OPTIONS} from '../types';

const WIDTH = 20;
const RADIUS = 200;
const AROUND = 10;

const ring = (colors: Color[], deep: number = 1, ctx: CanvasRenderingContext2D, options?: RING_OPTIONS): void => {
  if (!colors.length || deep < 1) {
    return;
  }

  const lineWidth = options?.width ?? WIDTH;
  const r = options?.minr ?? RADIUS;
  const x = r + lineWidth * deep + AROUND;
  const y = x;
  console.log(x, y);
  const radius = 2 * Math.PI / colors.length;
  const offset = (Math.PI + radius) / 2;

  ctx.lineWidth = lineWidth;

  const draw = (layer: number) => {
    colors.forEach((color, index) => {
      const startAngle = index * radius - offset;
      const endAngle = startAngle + radius;
      const alpha = 1 - 0.1 * (layer - 1);
      const cr = r + lineWidth * (deep - layer);
      const nc = new Color(color.rgb(), alpha);

      ctx.beginPath();
      ctx.strokeStyle = nc.toRGBA();
      ctx.arc(x, y, cr, startAngle, endAngle);
      ctx.stroke();
      ctx.closePath();

      if (index !== 0) {
        // ctx.save();
        // ctx.beginPath();
        // ctx.lineWidth = 1;
        // ctx.strokeStyle = '#7A4D38'; // TODO 跟踪是否合适，是否渐变的线
        // ctx.arc(x, y, cr - lineWidth / 2, 0, 2 * Math.PI);
        // ctx.stroke();
        // ctx.closePath();
        // ctx.restore();
      }
    });
  };

  for (let i = 1; i <= deep; i++) {
    draw(i);
  }
};

export default ring;
