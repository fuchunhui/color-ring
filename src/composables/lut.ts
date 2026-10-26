import {makePhotoScene, toSrgbBytes} from '../utils/scene';
import {
  Look,
  Lut3D,
  buildLut,
  clamp01,
  lutSlice,
  makeHaldIdentity,
  applyGradeBytes,
  applyLutBytes,
  meanAbsError,
  gradeWithStrength
} from '../utils/lut';

type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

const SCENE_W = 256;
const SCENE_H = 192;
const sceneBytes = toSrgbBytes(makePhotoScene(SCENE_W, SCENE_H).image);

const GRADIENT_W = 288;
const GRADIENT_H = 56;

const hsvBytes = (h: number, s: number, v: number): number[] => {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  };
  return [f(5), f(3), f(1)];
};

/** 色相沿横轴、明度沿纵轴变化的平滑渐变，用来观察 LUT 插值带来的误差 */
const makeGradientBytes = (): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(GRADIENT_W * GRADIENT_H * 4);
  for (let y = 0; y < GRADIENT_H; y++) {
    for (let x = 0; x < GRADIENT_W; x++) {
      const [r, g, b] = hsvBytes(x / GRADIENT_W * 330, 0.85, 1 - y / GRADIENT_H * 0.75);
      const i = (y * GRADIENT_W + x) * 4;
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = 255;
    }
  }
  return out;
};

const gradientBytes = makeGradientBytes();

const putBytes = (
  ctx: CanvasRenderingContext2D,
  bytes: Uint8ClampedArray,
  width: number,
  height: number,
  dx = 0,
  dy = 0,
  scale = 1
): void => {
  const tmp = document.createElement('canvas');
  tmp.width = width;
  tmp.height = height;
  (tmp.getContext('2d') as CanvasRenderingContext2D).putImageData(new ImageData(bytes, width, height), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, dx, dy, width * scale, height * scale);
};

const text = (ctx: CanvasRenderingContext2D, str: string, x: number, y: number, color = '#444', align: CanvasTextAlign = 'left') => {
  ctx.fillStyle = color;
  ctx.font = '12px sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
};

/** 灰阶条与色相条：每组上为原图，下为调色后 */
const drawChart = (look: Look, strength: number): DrawFn => (ctx, w) => {
  const barW = w - 20;
  const rows = [
    {label: '灰阶 · 原图', graded: false, hue: false},
    {label: '灰阶 · 调色后', graded: true, hue: false},
    {label: '色相 · 原图', graded: false, hue: true},
    {label: '色相 · 调色后', graded: true, hue: true}
  ];
  rows.forEach(({label, graded, hue}, row) => {
    const y = 10 + row * 48;
    text(ctx, label, 10, y + 10);
    for (let x = 0; x < barW; x++) {
      const t = x / (barW - 1);
      let rgb = hue ? hsvBytes(t * 360, 0.85, 0.9).map(v => v / 255) : [t, t, t];
      if (graded) {
        rgb = gradeWithStrength(look.grade, rgb as [number, number, number], strength);
      }
      ctx.fillStyle = `rgb(${rgb.map(v => Math.round(clamp01(v) * 255)).join(',')})`;
      ctx.fillRect(10 + x, y + 16, 1, 20);
    }
  });
};

/** 沿灰色对角线 (v, v, v) 输入时，三个通道各自的输出曲线 */
const drawCurves = (look: Look, strength: number): DrawFn => (ctx, w, h) => {
  const size = Math.min(w, h) - 50;
  const x0 = 36;
  const y0 = 12;
  const px = (v: number) => x0 + v * size;
  const py = (v: number) => y0 + (1 - v) * size;

  ctx.strokeStyle = '#E2E4EA';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(px(i / 4), py(0));
    ctx.lineTo(px(i / 4), py(1));
    ctx.moveTo(px(0), py(i / 4));
    ctx.lineTo(px(1), py(i / 4));
    ctx.stroke();
    text(ctx, (i / 4).toString(), px(i / 4), py(0) + 16, '#777', 'center');
    text(ctx, (i / 4).toString(), x0 - 6, py(i / 4) + 4, '#777', 'right');
  }
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.moveTo(px(0), py(0));
  ctx.lineTo(px(1), py(1));
  ctx.stroke();
  ctx.setLineDash([]);

  const colors = ['#E53935', '#43A047', '#1E88E5'];
  colors.forEach((color, channel) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
      const v = i / 64;
      const out = gradeWithStrength(look.grade, [v, v, v], strength)[channel];
      if (i === 0) {
        ctx.moveTo(px(v), py(clamp01(out)));
      } else {
        ctx.lineTo(px(v), py(clamp01(out)));
      }
    }
    ctx.stroke();
  });
  text(ctx, '输入灰度', px(0.5), py(0) + 32, '#555', 'center');
  text(ctx, '输出', x0 + 4, y0 - 3, '#555');
  ['R', 'G', 'B'].forEach((name, i) => text(ctx, name, px(1) - 20 + i * 8, py(0.08), colors[i]));
};

const drawHald = (bytes: Uint8ClampedArray, side: number, scale: number): DrawFn => ctx => {
  putBytes(ctx, bytes, side, side, 0, 0, scale);
};

/** 蓝色下标取 5 个值的切片：上排恒等，下排调色后 */
const drawSlices = (identity: Lut3D, graded: Lut3D): DrawFn => ctx => {
  const picks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(t * (identity.size - 1)));
  const cell = 7;
  const side = identity.size * cell;
  picks.forEach((k, i) => {
    const x = 6 + i * (side + 10);
    putBytes(ctx, lutSlice(identity, k), identity.size, identity.size, x, 22, cell);
    putBytes(ctx, lutSlice(graded, k), graded.size, graded.size, x, 22 + side + 28, cell);
    text(ctx, `B = ${(k / (identity.size - 1)).toFixed(2)}`, x, 14);
  });
  text(ctx, '恒等', 6, 22 + side + 14);
  text(ctx, '调色后', 6, 22 + side * 2 + 42);
};

interface QualityItem {
  label: string;
  bytes: Uint8ClampedArray;
  error: number;
}

/** 以逐像素调用调色函数为标准答案，比较不同尺寸、不同插值的 LUT */
const compareInterpolation = (look: Look, strength: number): QualityItem[] => {
  const ref = applyGradeBytes(gradientBytes, look.grade, strength);
  const lut5 = buildLut(look.grade, 5, strength);
  const lut17 = buildLut(look.grade, 17, strength);
  const variants: [string, Uint8ClampedArray][] = [
    ['标准答案：逐像素计算', ref],
    ['5³ LUT · 最近邻', applyLutBytes(gradientBytes, lut5, 'nearest')],
    ['5³ LUT · 三线性插值', applyLutBytes(gradientBytes, lut5, 'trilinear')],
    ['17³ LUT · 最近邻', applyLutBytes(gradientBytes, lut17, 'nearest')],
    ['17³ LUT · 三线性插值', applyLutBytes(gradientBytes, lut17, 'trilinear')]
  ];
  return variants.map(([label, bytes]) => ({label, bytes, error: meanAbsError(ref, bytes)}));
};

const downloadText = (content: string, fileName: string): void => {
  const url = URL.createObjectURL(new Blob([content], {type: 'text/plain'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

export {
  DrawFn,
  QualityItem,
  SCENE_W,
  SCENE_H,
  GRADIENT_W,
  GRADIENT_H,
  sceneBytes,
  gradientBytes,
  makeHaldIdentity,
  putBytes,
  drawChart,
  drawCurves,
  drawHald,
  drawSlices,
  compareInterpolation,
  downloadText
};
