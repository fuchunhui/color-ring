import {Vec3} from '../utils/space';
import {
  cmf,
  wavelengthToXyz,
  planck,
  blackbodyXyz,
  xyzToXy,
  xyzToDisplayRgb,
  xyzToClipRgb,
  toHex
} from '../utils/cie';

const WL_MIN = 380;
const WL_MAX = 780;
const WL_SPAN = WL_MAX - WL_MIN;

const SP_LEFT = 20;
const SP_PLOT = 800;
const SP_WIDTH = SP_LEFT + SP_PLOT + 20;

const T_MIN = 1000;
const T_MAX = 12000;

const PRIMARIES = [630, 532, 467];
const PRIMARY_NAMES = ['红 630nm', '绿 532nm', '蓝 467nm'];

const TEMPERATURE_MARKS = [
  {name: '蜡烛', t: 1900, level: 0},
  {name: '钨丝灯', t: 2700, level: 1},
  {name: '日出/日落', t: 3000, level: 2},
  {name: '卤素灯', t: 3200, level: 3},
  {name: '日光 D65', t: 6500, level: 0},
  {name: '阴天', t: 7000, level: 1},
  {name: '蓝天', t: 10000, level: 0}
];

const rgbCss = (rgb: Vec3, alpha = 1): string => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

/** 单色光的显示色，两端（接近紫外、红外）亮度衰减，和人眼看到的光谱一致 */
const spectrumRgb = (l: number): Vec3 => {
  const xyz = wavelengthToXyz(l);
  const factor = Math.min(1, (xyz[1] / 0.05) ** 0.4);
  return xyzToClipRgb(xyz).map(v => Math.round(v * factor)) as Vec3;
};

const wavelengthAt = (px: number): number => {
  return Math.min(WL_MAX, Math.max(WL_MIN, WL_MIN + (px - SP_LEFT) / SP_PLOT * WL_SPAN));
};

interface WavelengthInfo {
  wavelength: number;
  hex: string;
  thz: number;
}

const describeWavelength = (px: number): WavelengthInfo => {
  const l = wavelengthAt(px);
  return {
    wavelength: Math.round(l),
    hex: toHex(spectrumRgb(l)),
    thz: Math.round(299792.458 / l)
  };
};

const temperatureHex = (t: number): string => toHex(xyzToDisplayRgb(blackbodyXyz(t)));

const temperatureXy = (t: number): [number, number] => xyzToXy(blackbodyXyz(t));

// ---------- 谱线与匹配 ----------

const gaussian = (l: number, center: number, sigma = 6): number => {
  return Math.exp(-0.5 * ((l - center) / sigma) ** 2);
};

const spdXyz = (spd: (l: number) => number): Vec3 => {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let l = WL_MIN; l <= WL_MAX; l += 2) {
    const s = spd(l);
    const [cx, cy, cz] = cmf(l);
    x += s * cx;
    y += s * cy;
    z += s * cz;
  }
  return [x, y, z];
};

const lineCache = new Map<number, Vec3>();

/** 单条窄谱线的 XYZ，按 Y = 1 归一化 */
const lineXyz = (center: number): Vec3 => {
  const cached = lineCache.get(center);
  if (cached) {
    return cached;
  }
  const xyz = spdXyz(l => gaussian(l, center));
  const result = xyz.map(v => v / xyz[1]) as Vec3;
  lineCache.set(center, result);
  return result;
};

const det3 = (a: number[][]): number => {
  return a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1])
    - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0])
    + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
};

/** 解三条谱线的强度，使它们叠加后的 XYZ 等于 target（克莱姆法则） */
const solveWeights = (target: Vec3): Vec3 => {
  const cols = PRIMARIES.map(lineXyz);
  const m = [0, 1, 2].map(r => cols.map(c => c[r]));
  const d = det3(m);
  return [0, 1, 2].map(i => {
    const mi = m.map((row, r) => row.map((v, c) => (c === i ? target[r] : v)));
    return det3(mi) / d;
  }) as Vec3;
};

const mixXyz = (weights: number[]): Vec3 => {
  const cols = PRIMARIES.map(lineXyz);
  return [0, 1, 2].map(r => weights.reduce((sum, w, i) => sum + w * cols[i][r], 0)) as Vec3;
};

/** 混色结果的显示色：色相饱和度由 XYZ 决定，亮度随总亮度变化 */
const mixHex = (weights: number[]): string => {
  const xyz = mixXyz(weights);
  const rgb = xyzToDisplayRgb(xyz);
  const brightness = Math.min(1, xyz[1] / 3) ** (1 / 2.2);
  return toHex(rgb.map(v => Math.round(v * brightness)) as Vec3);
};

const defaultMixWeights = (): number[] => {
  const w = solveWeights(blackbodyXyz(6500).map(v => v * 3) as Vec3);
  const max = Math.max(...w);
  return w.map(v => Math.round(v / max * 100) / 100);
};

interface MetamerTarget {
  key: string;
  label: string;
  spd: (l: number) => number;
}

const METAMER_TARGETS: MetamerTarget[] = [
  {key: 'equal', label: '等能白光（各波长一样强）', spd: (): number => 1},
  {key: 'bb3000', label: '黑体 3000K（暖白）', spd: (l: number): number => planck(l, 3000)},
  {key: 'bb6500', label: '黑体 6500K（日光白）', spd: (l: number): number => planck(l, 6500)},
  {key: 'bb10000', label: '黑体 10000K（冷白）', spd: (l: number): number => planck(l, 10000)}
];

const findTarget = (key: string): MetamerTarget => {
  return METAMER_TARGETS.find(t => t.key === key) || METAMER_TARGETS[0];
};

interface MetamerResult {
  weights: Vec3;
  feasible: boolean;
  targetXy: [number, number];
  mixXy: [number, number];
  targetHex: string;
  mixHex: string;
}

const metamer = (key: string): MetamerResult => {
  const target = findTarget(key);
  const xyz = spdXyz(target.spd);
  const targetXyz = xyz.map(v => v / xyz[1]) as Vec3;
  const weights = solveWeights(targetXyz);
  const mix = mixXyz(weights);
  return {
    weights,
    feasible: weights.every(w => w >= 0),
    targetXy: xyzToXy(targetXyz),
    mixXy: xyzToXy(mix),
    targetHex: toHex(xyzToDisplayRgb(targetXyz)),
    mixHex: toHex(xyzToDisplayRgb(mix))
  };
};

// ---------- 绘制 ----------

const text = (
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  align: CanvasTextAlign = 'center',
  color = '#444'
) => {
  ctx.font = '12px sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
};

const drawAxis = (ctx: CanvasRenderingContext2D, x0: number, y: number, width = SP_PLOT, labelStep = 50) => {
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y + 0.5);
  ctx.lineTo(x0 + width, y + 0.5);
  for (let l = WL_MIN; l <= WL_MAX; l += 10) {
    const x = Math.round(x0 + (l - WL_MIN) / WL_SPAN * width) + 0.5;
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + (l % 50 === 0 ? 6 : 3));
  }
  ctx.stroke();
  for (let l = Math.ceil(WL_MIN / labelStep) * labelStep; l <= WL_MAX; l += labelStep) {
    text(ctx, `${l}`, x0 + (l - WL_MIN) / WL_SPAN * width, y + 16);
  }
  text(ctx, 'nm', x0 + width + 4, y + 16, 'left');
};

const drawStripes = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  width: number,
  height: number,
  alpha = 1
) => {
  for (let i = 0; i < width; i++) {
    ctx.fillStyle = rgbCss(spectrumRgb(WL_MIN + (i + 0.5) / width * WL_SPAN), alpha);
    ctx.fillRect(x0 + i, y0, 1, height);
  }
};

const drawSpectrumBar = (ctx: CanvasRenderingContext2D): void => {
  const top = 10;
  const barHeight = 64;
  drawStripes(ctx, SP_LEFT, top, SP_PLOT, barHeight);
  drawAxis(ctx, SP_LEFT, top + barHeight + 2);
};

let stripColors: string[] | null = null;

const drawTemperatureStrip = (ctx: CanvasRenderingContext2D, temp: number): void => {
  const top = 24;
  const barHeight = 40;
  const bottom = top + barHeight;
  stripColors = stripColors || Array.from({length: SP_PLOT}, (_, i) => {
    return temperatureHex(T_MIN + (i + 0.5) / SP_PLOT * (T_MAX - T_MIN));
  });
  stripColors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(SP_LEFT + i, top, 1, barHeight);
  });

  const at = (t: number) => SP_LEFT + (t - T_MIN) / (T_MAX - T_MIN) * SP_PLOT;
  const cx = at(temp);
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.moveTo(cx - 6, 6);
  ctx.lineTo(cx + 6, 6);
  ctx.lineTo(cx, top - 2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  TEMPERATURE_MARKS.forEach(({name, t, level}) => {
    const x = Math.round(at(t)) + 0.5;
    const y = bottom + 10 + level * 16;
    ctx.beginPath();
    ctx.moveTo(x, bottom);
    ctx.lineTo(x, y);
    ctx.stroke();
    text(ctx, `${name} ${t}K`, x + 3, y, 'left');
  });
};

const drawCurve = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  width: number,
  height: number,
  value: (l: number) => number
) => {
  const bottom = y0 + height;
  ctx.beginPath();
  ctx.moveTo(x0, bottom);
  for (let l = WL_MIN; l <= WL_MAX; l += 2) {
    ctx.lineTo(x0 + (l - WL_MIN) / WL_SPAN * width, bottom - value(l) * height * 0.95);
  }
  ctx.lineTo(x0 + width, bottom);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#222';
  ctx.stroke();
};

const drawLines = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  width: number,
  height: number,
  heights: number[]
) => {
  const bottom = y0 + height;
  PRIMARIES.forEach((center, i) => {
    const x = x0 + (center - WL_MIN) / WL_SPAN * width;
    const h = Math.max(0, heights[i]) * height * 0.95;
    ctx.fillStyle = rgbCss(spectrumRgb(center));
    ctx.fillRect(x - 2, bottom - h, 4, h);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 2.5, bottom - h - 0.5, 5, h + 1);
    text(ctx, PRIMARY_NAMES[i], x, bottom - h - 10);
  });
};

const drawPlanckPlot = (ctx: CanvasRenderingContext2D, temp: number): void => {
  const top = 10;
  const height = 150;
  let max = 0;
  for (let l = WL_MIN; l <= WL_MAX; l += 2) {
    max = Math.max(max, planck(l, temp));
  }
  drawStripes(ctx, SP_LEFT, top, SP_PLOT, height, 0.3);
  drawCurve(ctx, SP_LEFT, top, SP_PLOT, height, l => planck(l, temp) / max);
  drawAxis(ctx, SP_LEFT, top + height + 2);
  text(ctx, `${temp}K 黑体的相对辐射强度（已归一化）`, SP_LEFT + SP_PLOT - 8, top + height - 12, 'right');
};

const drawMixPlot = (ctx: CanvasRenderingContext2D, weights: number[]): void => {
  const top = 10;
  const height = 150;
  drawStripes(ctx, SP_LEFT, top, SP_PLOT, height, 0.25);
  drawLines(ctx, SP_LEFT, top, SP_PLOT, height, weights);
  drawAxis(ctx, SP_LEFT, top + height + 2);
};

const drawMetamerPlots = (ctx: CanvasRenderingContext2D, key: string): void => {
  const panelWidth = 380;
  const top = 28;
  const height = 130;
  const rightX = SP_LEFT + 420;
  const target = findTarget(key);
  const result = metamer(key);

  let max = 0;
  for (let l = WL_MIN; l <= WL_MAX; l += 2) {
    max = Math.max(max, target.spd(l));
  }

  drawStripes(ctx, SP_LEFT, top, panelWidth, height, 0.25);
  drawCurve(ctx, SP_LEFT, top, panelWidth, height, l => target.spd(l) / max);
  drawAxis(ctx, SP_LEFT, top + height + 2, panelWidth, 100);
  text(ctx, '目标：连续光谱', SP_LEFT, 12, 'left');

  drawStripes(ctx, rightX, top, panelWidth, height, 0.25);
  drawAxis(ctx, rightX, top + height + 2, panelWidth, 100);
  text(ctx, '三条窄谱线叠加', rightX, 12, 'left');
  if (result.feasible) {
    const peak = Math.max(...result.weights);
    drawLines(ctx, rightX, top, panelWidth, height, result.weights.map(w => w / peak));
  } else {
    text(ctx, '这三条谱线无法匹配该颜色', rightX + panelWidth / 2, top + height / 2);
  }
};

export {
  SP_WIDTH,
  T_MIN,
  T_MAX,
  PRIMARY_NAMES,
  METAMER_TARGETS,
  describeWavelength,
  temperatureHex,
  temperatureXy,
  mixHex,
  defaultMixWeights,
  metamer,
  drawSpectrumBar,
  drawTemperatureStrip,
  drawPlanckPlot,
  drawMixPlot,
  drawMetamerPlots
};
