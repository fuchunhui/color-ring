import Color from '../base/color';
import {rybToRgb} from '../utils/ryb';
import {colors as ittenColors} from './itten';

// 伊登色环12个位置的RYB坐标(r, y, b)，从顶部的黄色开始顺时针
const RING_RYB: [number, number, number][] = [
  [0, 1, 0], [0.5, 1, 0], [1, 1, 0], [1, 0.5, 0],
  [1, 0, 0], [1, 0, 0.5], [1, 0, 1], [0.5, 0, 1],
  [0, 0, 1], [0, 0.5, 1], [0, 1, 1], [0, 1, 0.5]
];

const ringColors = RING_RYB.map(([r, y, b]) => new Color(rybToRgb(r, y, b)));
const overlapColors = [
  new Color(rybToRgb(1, 1, 0)),
  new Color(rybToRgb(0, 1, 1)),
  new Color(rybToRgb(1, 0, 1)),
  new Color(rybToRgb(1, 1, 1)),
  new Color('#FFFFFF')
];
const colors: Color[] = ringColors.concat(overlapColors);

const CIRCLE_R = 100;
const EDGE = 120;
const SIZE_W = 2 * CIRCLE_R + EDGE;
const SIZE_H = Math.ceil(CIRCLE_R + Math.sqrt(3) * EDGE / 2 + CIRCLE_R);
const RING_OUTER = 170;
const RING_INNER = 115;
const RING_WIDTH = 50;
const GAP = 40;
const MARGIN = 20;

// 顶部黄、右下红、左下蓝，与伊登的原色三角形一致
const centers = [
  {x: CIRCLE_R + EDGE / 2, y: CIRCLE_R, ryb: [0, 1, 0]},
  {x: CIRCLE_R + EDGE, y: CIRCLE_R + Math.sqrt(3) * EDGE / 2, ryb: [1, 0, 0]},
  {x: CIRCLE_R, y: CIRCLE_R + Math.sqrt(3) * EDGE / 2, ryb: [0, 0, 1]}
];

/**
 * 逐像素计算三个圆的覆盖情况，把覆盖到的原色当作RYB坐标，再用立方体插值得到颜色。
 * 2x2超采样用于边缘抗锯齿。
 */
const drawCircles = (ctx: CanvasRenderingContext2D, ox: number, oy: number): void => {
  const image = ctx.createImageData(SIZE_W, SIZE_H);
  const offsets = [0.25, 0.75];
  for (let py = 0; py < SIZE_H; py++) {
    for (let px = 0; px < SIZE_W; px++) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;
      offsets.forEach(dy => offsets.forEach(dx => {
        const x = px + dx;
        const y = py + dy;
        const ryb = [0, 0, 0];
        let hit = false;
        centers.forEach(c => {
          if ((x - c.x) ** 2 + (y - c.y) ** 2 <= CIRCLE_R ** 2) {
            hit = true;
            c.ryb.forEach((v, i) => {
              ryb[i] = Math.max(ryb[i], v);
            });
          }
        });
        if (hit) {
          const [r, g, b] = rybToRgb(ryb[0], ryb[1], ryb[2]);
          rSum += r;
          gSum += g;
          bSum += b;
          aSum += 1;
        }
      }));
      const index = (py * SIZE_W + px) * 4;
      if (aSum) {
        image.data[index] = rSum / aSum;
        image.data[index + 1] = gSum / aSum;
        image.data[index + 2] = bSum / aSum;
        image.data[index + 3] = aSum / 4 * 255;
      }
    }
  }
  ctx.putImageData(image, ox, oy);
};

const drawRing = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  list: Color[]
): void => {
  const step = 2 * Math.PI / list.length;
  const offset = (Math.PI + step) / 2;
  ctx.lineWidth = RING_WIDTH;
  list.forEach((color, index) => {
    const start = index * step - offset;
    ctx.beginPath();
    ctx.strokeStyle = color.toRGB();
    ctx.arc(cx, cy, radius, start, start + step);
    ctx.stroke();
    ctx.closePath();
  });
};

const convert = (ctx: CanvasRenderingContext2D): void => {
  const width = ctx.canvas.width;
  const ringSize = 2 * RING_OUTER + RING_WIDTH;
  const sideBySide = width >= SIZE_W + ringSize + GAP + 2 * MARGIN;

  const ox = MARGIN;
  const oy = MARGIN;
  const rx = sideBySide ? ox + SIZE_W + GAP : ox;
  const ry = sideBySide ? oy : oy + SIZE_H + GAP;
  const cx = rx + ringSize / 2;
  const cy = ry + ringSize / 2;

  drawCircles(ctx, ox, oy);
  drawRing(ctx, cx, cy, RING_OUTER, ringColors);
  drawRing(ctx, cx, cy, RING_INNER, ittenColors);

  ctx.save();
  ctx.fillStyle = '#888';
  ctx.font = '13px sans-serif';
  const textY = Math.max(oy + SIZE_H, ry + ringSize) + 30;
  ctx.fillText('左：红、黄、蓝三个圆按RYB立方体做三线性插值，叠加处得到橙、绿、紫和深棕。', ox, textY);
  ctx.fillText('右：外圈=Gossett–Chen RYB转换，内圈=伊登手选近似色。', ox, textY + 20);
  ctx.restore();
};

export {
  convert,
  colors
};
