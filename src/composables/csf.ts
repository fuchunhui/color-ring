import type {DrawFn, Area} from '../utils/spectral';
import {text} from '../utils/spectral';
import {makePhotoScene, encodeCode} from '../utils/scene';
import {
  CHART,
  RG_CUTOFF,
  BY_CUTOFF,
  lumaCsfRel,
  chromaCsfRel,
  chartFreq,
  renderChart
} from '../utils/csf';
import type {Axis} from '../utils/csf';

const CHART_W = 600;
const CHART_H = 260;
const CHART_PAD = 44;

// ---------- Campbell–Robson 图 ----------

const chartDrawer = (axis: Axis): DrawFn => ctx => {
  renderChart(ctx, CHART_W, CHART_H, axis, CHART_PAD, 6);
  ctx.strokeStyle = '#999';
  ctx.strokeRect(CHART_PAD - 0.5, 5.5, CHART_W + 1, CHART_H + 1);
  [0.5, 1, 2, 5, 10, 20].forEach(f => {
    const u = Math.log(f / CHART.fMin) / Math.log(CHART.fMax / CHART.fMin);
    const x = CHART_PAD + u * CHART_W;
    ctx.beginPath();
    ctx.moveTo(x, CHART_H + 6);
    ctx.lineTo(x, CHART_H + 11);
    ctx.stroke();
    text(ctx, `${f}`, x, CHART_H + 22, 'center', '#555', '11px sans-serif');
  });
  text(ctx, '空间频率 (周/度) →', CHART_PAD + CHART_W / 2, CHART_H + 38, 'center', '#333', '12px sans-serif');
  [1, 0.1, 0.01].forEach(c => {
    const v = Math.log(c) / Math.log(CHART.cMin);
    const y = 6 + v * (CHART_H - 1);
    text(ctx, `${c}`, CHART_PAD - 6, y, 'right', '#555', '11px sans-serif');
  });
  ctx.save();
  ctx.translate(12, 6 + CHART_H / 2);
  ctx.rotate(-Math.PI / 2);
  text(ctx, '对比度 ↓ 降低', 0, 0, 'center', '#333', '12px sans-serif');
  ctx.restore();
};

const drawLumaChart = chartDrawer('luma');
const drawRgChart = chartDrawer('rg');
const drawByChart = chartDrawer('by');

const CHART_CANVAS_W = CHART_W + CHART_PAD + 20;
const CHART_CANVAS_H = CHART_H + 50;

// ---------- CSF 曲线 ----------

const CURVE_W = 800;
const CURVE_H = 300;
const CURVE_AREA: Area = {x: 56, y: 24, w: 520, h: 220};

const drawCurves: DrawFn = ctx => {
  const a = CURVE_AREA;
  const fMin = 0.1;
  const fMax = 60;
  const px = (f: number) => a.x + Math.log(f / fMin) / Math.log(fMax / fMin) * a.w;
  const py = (v: number) => a.y + a.h - v * a.h;
  ctx.strokeStyle = '#E3E3E3';
  ctx.lineWidth = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(v => {
    ctx.beginPath();
    ctx.moveTo(a.x, py(v) + 0.5);
    ctx.lineTo(a.x + a.w, py(v) + 0.5);
    ctx.stroke();
    text(ctx, `${v}`, a.x - 8, py(v), 'right', '#555', '11px sans-serif');
  });
  [0.1, 0.3, 1, 3, 10, 30].forEach(f => {
    ctx.beginPath();
    ctx.moveTo(px(f) + 0.5, a.y);
    ctx.lineTo(px(f) + 0.5, a.y + a.h);
    ctx.stroke();
    text(ctx, `${f}`, px(f), a.y + a.h + 14, 'center', '#555', '11px sans-serif');
  });
  text(ctx, '空间频率 (周/度，对数轴)', a.x + a.w / 2, a.y + a.h + 34, 'center', '#333', '12px sans-serif');
  text(ctx, '相对敏感度', a.x - 40, a.y - 10, 'left', '#333', '12px sans-serif');

  const curves: {label: string; color: string; fn: (f: number) => number}[] = [
    {label: '亮度（Mannos–Sakrison）', color: '#333', fn: lumaCsfRel},
    {label: '红绿（示意：截止 3 周/度）', color: '#D6336C', fn: f => chromaCsfRel(f, RG_CUTOFF)},
    {label: '蓝黄（示意：截止 1.5 周/度）', color: '#1971C2', fn: f => chromaCsfRel(f, BY_CUTOFF)}
  ];
  curves.forEach(({color, fn}, i) => {
    ctx.beginPath();
    for (let k = 0; k <= 240; k++) {
      const f = fMin * (fMax / fMin) ** (k / 240);
      const x = px(f);
      const y = py(Math.min(1.02, fn(f)));
      if (k === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(a.x + a.w + 16, a.y + 8 + i * 22, 14, 3);
    text(ctx, curves[i].label, a.x + a.w + 36, a.y + 10 + i * 22, 'left', '#333', '12px sans-serif');
  });
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.moveTo(px(8) + 0.5, a.y);
  ctx.lineTo(px(8) + 0.5, a.y + a.h);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, '亮度 CSF 峰值 ≈ 8 周/度', px(8) + 6, a.y + a.h - 10, 'left', '#777', '11px sans-serif');
};

// ---------- 色度模糊演示 ----------

const IMG_W = 320;
const IMG_H = 200;
const SCENE = makePhotoScene(IMG_W, IMG_H).image;

/** sRGB 编码字节（0~255）：每像素 3 个值 */
const sceneBytes = (): Float32Array => {
  const out = new Float32Array(IMG_W * IMG_H * 3);
  for (let i = 0; i < out.length; i++) {
    out[i] = encodeCode(SCENE.data[i]);
  }
  return out;
};

const BASE = sceneBytes();

/** BT.601 全范围 YCbCr 三个平面 */
const split = (rgb: Float32Array): Float32Array[] => {
  const n = IMG_W * IMG_H;
  const y = new Float32Array(n);
  const cb = new Float32Array(n);
  const cr = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = rgb[i * 3];
    const g = rgb[i * 3 + 1];
    const b = rgb[i * 3 + 2];
    y[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    cb[i] = -0.168736 * r - 0.331264 * g + 0.5 * b;
    cr[i] = 0.5 * r - 0.418688 * g - 0.081312 * b;
  }
  return [y, cb, cr];
};

const gaussKernel = (sigma: number): number[] => {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const k = Array.from({length: radius * 2 + 1}, (_, i) => Math.exp(-0.5 * ((i - radius) / sigma) ** 2));
  const sum = k.reduce((a, b) => a + b, 0);
  return k.map(v => v / sum);
};

const blurPlane = (plane: Float32Array, sigma: number): Float32Array => {
  if (sigma < 0.2) {
    return plane;
  }
  const k = gaussKernel(sigma);
  const r = (k.length - 1) / 2;
  const tmp = new Float32Array(plane.length);
  const out = new Float32Array(plane.length);
  for (let y = 0; y < IMG_H; y++) {
    for (let x = 0; x < IMG_W; x++) {
      let s = 0;
      for (let j = -r; j <= r; j++) {
        s += k[j + r] * plane[y * IMG_W + Math.min(IMG_W - 1, Math.max(0, x + j))];
      }
      tmp[y * IMG_W + x] = s;
    }
  }
  for (let y = 0; y < IMG_H; y++) {
    for (let x = 0; x < IMG_W; x++) {
      let s = 0;
      for (let j = -r; j <= r; j++) {
        s += k[j + r] * tmp[Math.min(IMG_H - 1, Math.max(0, y + j)) * IMG_W + x];
      }
      out[y * IMG_W + x] = s;
    }
  }
  return out;
};

const PLANES = split(BASE);

const clamp8 = (v: number): number => Math.round(Math.min(255, Math.max(0, v)));

const drawPlanes = (ctx: CanvasRenderingContext2D, yp: Float32Array, cb: Float32Array, cr: Float32Array): void => {
  const out = ctx.createImageData(IMG_W, IMG_H);
  for (let i = 0; i < IMG_W * IMG_H; i++) {
    out.data[i * 4] = clamp8(yp[i] + 1.402 * cr[i]);
    out.data[i * 4 + 1] = clamp8(yp[i] - 0.344136 * cb[i] - 0.714136 * cr[i]);
    out.data[i * 4 + 2] = clamp8(yp[i] + 1.772 * cb[i]);
    out.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
};

type Mode = 'original' | 'luma' | 'chroma';

const blurDrawer = (mode: Mode, sigma: () => number): DrawFn => ctx => {
  const s = sigma();
  const [y, cb, cr] = PLANES;
  if (mode === 'original') {
    drawPlanes(ctx, y, cb, cr);
  } else if (mode === 'luma') {
    drawPlanes(ctx, blurPlane(y, s), cb, cr);
  } else {
    drawPlanes(ctx, y, blurPlane(cb, s), blurPlane(cr, s));
  }
};

/** 假设 96 dpi（0.2646 mm/像素），观看距离 distance（厘米）时每度对应的像素数 */
const pixelsPerDegree = (distanceCm: number): number => distanceCm * 10 * Math.tan(Math.PI / 180) / 0.2646;

export {
  CHART_CANVAS_W,
  CHART_CANVAS_H,
  CURVE_W,
  CURVE_H,
  IMG_W,
  IMG_H,
  drawLumaChart,
  drawRgChart,
  drawByChart,
  drawCurves,
  blurDrawer,
  pixelsPerDegree,
  chartFreq
};
