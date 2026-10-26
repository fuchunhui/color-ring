import {linearToSrgb, srgbToLinear} from '../utils/space';
import type {Vec3} from '../utils/space';
import {drawPlot, label} from '../utils/appearance';
import type {Series} from '../utils/appearance';
import type {DrawFn} from '../utils/spectral';

const CURVE_W = 440;
const CURVE_H = 330;
const STEPS_W = 660;
const STEPS_H = 318;

/** CIE L*（0~100），入参为相对亮度 Y（0~1） */
const lstar = (y: number): number => (y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : 24389 / 27 * y);

const lstarToY = (l: number): number => (l > 8 ? ((l + 16) / 116) ** 3 : l / (24389 / 27));

const code = (y: number): number => Math.round(Math.min(1, Math.max(0, linearToSrgb(y))) * 255);

const FECHNER_I0 = 0.001;

const curveSeries = (logAxis: boolean): Series[] => {
  const n = 240;
  const xs: number[] = [];
  for (let i = 0; i <= n; i++) {
    xs.push(logAxis ? 10 ** (-3 + 3 * i / n) : i / n);
  }
  const make = (name: string, color: string, fn: (y: number) => number, dashed = false): Series => ({
    label: name,
    color,
    dashed,
    points: xs.map(y => [y, fn(y)] as [number, number])
  });
  return [
    make('Fechner：对数律（I₀ = 0.001）', '#8E24AA', y => Math.max(0, Math.log10(Math.max(y, 1e-9) / FECHNER_I0) / 3)),
    make('Stevens 幂律 0.33', '#2E7D32', y => y ** 0.33),
    make('Stevens 幂律 0.5', '#00897B', y => y ** 0.5),
    make('CIE L* / 100', '#1565C0', y => lstar(y) / 100),
    make('sRGB 编码值 / 255', '#EF6C00', y => linearToSrgb(y)),
    make('纯 2.2 次方', '#999', y => y ** (1 / 2.2), true)
  ];
};

const drawCurves = (logAxis: boolean): DrawFn => ctx => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, CURVE_W, CURVE_H);
  drawPlot(ctx, {
    x: 54,
    y: 14,
    w: CURVE_W - 70,
    h: 232,
    xMin: logAxis ? 0.001 : 0,
    xMax: 1,
    yMin: 0,
    yMax: 1,
    xTicks: logAxis ? [0.001, 0.01, 0.1, 1] : [0, 0.25, 0.5, 0.75, 1],
    yTicks: [0, 0.25, 0.5, 0.75, 1],
    xLog: logAxis,
    xLabel: '刺激强度（相对亮度 Y）',
    yLabel: '感知量（各自归一到 0~1）',
    legend: logAxis ? 'tl' : 'br'
  }, curveSeries(logAxis));
};

/** Weber 定律：刚好能察觉的亮度增量 ΔI 与背景 I 成正比，这里用常被引用的 2% 近似 */
const WEBER_FRACTION = 0.02;
const weberRows = [0.01, 0.1, 0.5, 1].map(i => ({
  background: i,
  delta: i * WEBER_FRACTION
}));

type Rows = {title: string; sub: string; colors: Vec3[]; codes: number[]; ls: number[]}[];

const buildRows = (n: number): Rows => {
  const t = (i: number) => i / (n - 1);
  const make = (title: string, sub: string, ys: number[]) => ({
    title,
    sub,
    colors: ys.map(y => {
      const c = code(y);
      return [c, c, c] as Vec3;
    }),
    codes: ys.map(code),
    ls: ys.map(y => Math.round(lstar(y)))
  });
  const idx = Array.from({length: n}, (_, i) => i);
  return [
    make('线性亮度 Y 等间隔', '暗部挤成一团，亮部差别很小', idx.map(i => t(i))),
    make('sRGB 编码值等间隔', '看起来比较均匀，这正是 gamma 编码的目的', idx.map(i => srgbToLinear(t(i)))),
    make('CIE L* 等间隔', '设计上最均匀，与 sRGB 很接近', idx.map(i => lstarToY(100 * t(i))))
  ];
};

const drawSteps = (getN: () => number, getNumbers: () => boolean): DrawFn => ctx => {
  const n = getN();
  const numbers = getNumbers() && n <= 16;
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, STEPS_W, STEPS_H);
  const rowH = 102;
  const gap = 3;
  const pw = (STEPS_W - 20 - gap * (n - 1)) / n;
  buildRows(n).forEach((row, ri) => {
    const y0 = 6 + ri * rowH;
    label(ctx, row.title, 10, y0 + 8, 'left', '#222', 'bold 13px sans-serif');
    label(ctx, row.sub, 190, y0 + 8, 'left', '#777', '11px sans-serif');
    row.colors.forEach((c, i) => {
      const x = 10 + i * (pw + gap);
      ctx.fillStyle = `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
      ctx.fillRect(x, y0 + 20, pw, 52);
      ctx.strokeStyle = '#C8C8C8';
      ctx.strokeRect(x + 0.5, y0 + 20.5, pw - 1, 51);
      if (numbers) {
        label(ctx, `${row.codes[i]}`, x + pw / 2, y0 + 80, 'center', '#444', '10px sans-serif');
        label(ctx, `L*${row.ls[i]}`, x + pw / 2, y0 + 92, 'center', '#888', '10px sans-serif');
      }
    });
  });
};

const MACH_W = 600;
const MACH_H = 380;
const MACH_X = 56;
const MACH_PLOT_W = 500;
const MACH_BARS = 8;

const gaussKernel = (sigma: number): number[] => {
  const r = Math.ceil(sigma * 3);
  const k: number[] = [];
  for (let i = -r; i <= r; i++) {
    k.push(Math.exp(-0.5 * (i / sigma) ** 2));
  }
  const sum = k.reduce((a, b) => a + b, 0);
  return k.map(v => v / sum);
};

const convolve = (src: number[], kernel: number[]): number[] => {
  const r = (kernel.length - 1) / 2;
  return src.map((_, x) => {
    let sum = 0;
    for (let j = -r; j <= r; j++) {
      const idx = Math.min(src.length - 1, Math.max(0, x + j));
      sum += src[idx] * kernel[j + r];
    }
    return sum;
  });
};

/** 阶梯灰条的真实明暗（显示数值 0~1） */
const stairProfile = (): number[] => {
  return Array.from({length: MACH_PLOT_W}, (_, x) => {
    const bar = Math.floor(x / MACH_PLOT_W * MACH_BARS);
    return 0.12 + 0.76 * bar / (MACH_BARS - 1);
  });
};

/** 玩具模型：中心 σ=2px 减去 w 倍的周边（σ 可调），再除以 (1 − w) 保持均匀区域不变 */
const perceived = (src: number[], w: number, sigmaS: number): number[] => {
  const center = convolve(src, gaussKernel(2));
  const surround = convolve(src, gaussKernel(sigmaS));
  return center.map((c, i) => (c - w * surround[i]) / (1 - w));
};

const gray = (v: number): string => {
  const c = Math.round(Math.min(1, Math.max(0, v)) * 255);
  return `rgb(${c}, ${c}, ${c})`;
};

const drawMach = (getW: () => number, getSigma: () => number): DrawFn => ctx => {
  const w = getW();
  const sigma = getSigma();
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, MACH_W, MACH_H);
  const truth = stairProfile();
  const sim = perceived(truth, w, sigma);
  for (let x = 0; x < MACH_PLOT_W; x++) {
    ctx.fillStyle = gray(truth[x]);
    ctx.fillRect(MACH_X + x, 8, 1, 52);
    ctx.fillStyle = gray(sim[x]);
    ctx.fillRect(MACH_X + x, 68, 1, 52);
  }
  label(ctx, '真实', MACH_X - 8, 34, 'right', '#333', '12px sans-serif');
  label(ctx, '模拟感知', MACH_X - 8, 94, 'right', '#333', '12px sans-serif');
  const pts = (arr: number[]) => arr.filter((_, i) => i % 2 === 0).map((v, i) => [i * 2, v] as [number, number]);
  drawPlot(ctx, {
    x: MACH_X,
    y: 150,
    w: MACH_PLOT_W,
    h: 190,
    xMin: 0,
    xMax: MACH_PLOT_W,
    yMin: -0.1,
    yMax: 1.1,
    xTicks: [0, 100, 200, 300, 400, 500],
    yTicks: [0, 0.5, 1],
    xLabel: '位置（像素）',
    yLabel: '明暗',
    legend: 'tl'
  }, [
    {label: '真实明暗（阶梯）', color: '#1565C0', points: pts(truth)},
    {label: '模拟的感知明暗', color: '#EF6C00', points: pts(sim)}
  ]);
};

const CORN_W = 600;
const CORN_H = 176;
const CORN_X0 = 300;
const CORN_DELTA = 0.12;
const CORN_TAU = 28;
const CORN_COVER = 56;

const cornsweet = (x: number): number => {
  const d = Math.abs(x - CORN_X0);
  return 0.5 + (x < CORN_X0 ? CORN_DELTA : -CORN_DELTA) * Math.exp(-d / CORN_TAU);
};

const drawCornsweet = (getCover: () => boolean): DrawFn => ctx => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, CORN_W, CORN_H);
  for (let x = 0; x < CORN_W; x++) {
    ctx.fillStyle = gray(cornsweet(x));
    ctx.fillRect(x, 16, 1, 124);
  }
  if (getCover()) {
    ctx.fillStyle = '#222';
    ctx.fillRect(CORN_X0 - CORN_COVER, 16, CORN_COVER * 2, 124);
  }
  label(ctx, `最左端与最右端的实际灰度几乎相同：${(cornsweet(0) * 255).toFixed(1)} / ${(cornsweet(CORN_W) * 255).toFixed(1)}`, CORN_W / 2, 158, 'center', '#666', '12px sans-serif');
};

const drawCornProfile: DrawFn = ctx => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, CORN_W, 190);
  const points: [number, number][] = [];
  for (let x = 0; x < CORN_W; x += 2) {
    points.push([x, cornsweet(x)]);
  }
  drawPlot(ctx, {
    x: 56,
    y: 12,
    w: CORN_W - 72,
    h: 132,
    xMin: 0,
    xMax: CORN_W,
    yMin: 0.3,
    yMax: 0.7,
    xTicks: [0, 100, 200, 300, 400, 500, 600],
    yTicks: [0.3, 0.4, 0.5, 0.6, 0.7],
    xLabel: '位置（像素）',
    yLabel: '明暗'
  }, [{label: '真实明暗', color: '#1565C0', points}]);
};

export {
  CURVE_W,
  CURVE_H,
  STEPS_W,
  STEPS_H,
  WEBER_FRACTION,
  weberRows,
  drawCurves,
  drawSteps,
  MACH_W,
  MACH_H,
  CORN_W,
  CORN_H,
  drawMach,
  drawCornsweet,
  drawCornProfile
};
