import {
  DrawFn,
  Area,
  D65,
  WAVELENGTHS,
  wlX,
  spectrumXyz,
  xyzToSrgb,
  text,
  drawSpectrumBand,
  drawAxis
} from '../utils/spectral';
import {linearToSrgb} from '../utils/space';
import {
  BK7,
  F2,
  LINE_D,
  LINE_F,
  LINE_C,
  CHANNEL_NM,
  Lens,
  LensKey,
  Sensor,
  refractiveIndex,
  singleRatio,
  doubletRatio,
  lensOf,
  lateralEpsilon,
  blurRadiusPx,
  halfDiagonalPx
} from '../utils/chromaticaberration';

const PLOT_W = 660;
const PLOT_H = 250;
const AREA: Area = {x: 62, y: 18, w: 520, h: 186};
const NM_FROM = 400;
const NM_TO = 750;

const yOf = (v: number, lo: number, hi: number): number => AREA.y + AREA.h * (1 - (v - lo) / (hi - lo));

const lineMarks = (ctx: CanvasRenderingContext2D): void => {
  ctx.save();
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  [[LINE_F, 'F 486nm'], [LINE_D, 'd 588nm'], [LINE_C, 'C 656nm']].forEach(([nm, label]) => {
    const x = Math.round(wlX(AREA, nm as number)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, AREA.y);
    ctx.lineTo(x, AREA.y + AREA.h);
    ctx.stroke();
    text(ctx, label as string, x, AREA.y - 7, 'center', '#777', '11px sans-serif');
  });
  ctx.restore();
};

interface Series {
  label: string;
  color: string;
  value: (nm: number) => number;
}

const plotSeries = (ctx: CanvasRenderingContext2D, series: Series[], lo: number, hi: number): void => {
  series.forEach(s => {
    ctx.beginPath();
    for (let nm = NM_FROM; nm <= NM_TO; nm += 5) {
      const x = wlX(AREA, nm);
      const y = yOf(s.value(nm), lo, hi);
      if (nm === NM_FROM) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
  });
};

const drawFrame = (
  ctx: CanvasRenderingContext2D,
  series: Series[],
  lo: number,
  hi: number,
  step: number,
  format: (v: number) => string,
  yTitle: string
): void => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, PLOT_W, PLOT_H);
  drawSpectrumBand(ctx, AREA, 0.22);
  ctx.strokeStyle = '#E2E4EA';
  ctx.lineWidth = 1;
  const count = Math.round((hi - lo) / step);
  for (let i = 0; i <= count; i++) {
    const v = lo + i * step;
    const y = Math.round(yOf(v, lo, hi)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(AREA.x, y);
    ctx.lineTo(AREA.x + AREA.w, y);
    ctx.stroke();
    text(ctx, format(v), AREA.x - 6, y, 'right', '#555', '11px sans-serif');
  }
  drawAxis(ctx, AREA);
  lineMarks(ctx);
  plotSeries(ctx, series, lo, hi);
  text(ctx, yTitle, 4, 6, 'left', '#333', '12px sans-serif');
  series.forEach((s, i) => {
    const x = AREA.x + AREA.w + 12;
    const y = AREA.y + 14 + i * 18;
    ctx.fillStyle = s.color;
    ctx.fillRect(x - 10, y - 1, 8, 3);
    text(ctx, s.label, x, y, 'left', '#333', '11px sans-serif');
  });
};

const COLOR_BK7 = '#2E4BD6';
const COLOR_F2 = '#E8820C';
const COLOR_DOUBLET = '#2EA043';

const drawIndexPlot: DrawFn = ctx => {
  drawFrame(ctx, [
    {label: 'F2', color: COLOR_F2, value: nm => refractiveIndex(F2, nm)},
    {label: 'BK7', color: COLOR_BK7, value: nm => refractiveIndex(BK7, nm)}
  ], 1.5, 1.66, 0.02, v => v.toFixed(2), '折射率 n');
};

const percent = (ratio: number): number => (ratio - 1) * 100;

const drawLensCompare: DrawFn = ctx => {
  drawFrame(ctx, [
    {label: '单片 BK7', color: COLOR_BK7, value: nm => percent(singleRatio(BK7, nm))},
    {label: '双合', color: COLOR_DOUBLET, value: nm => percent(doubletRatio(nm))}
  ], -2.5, 1.5, 0.5, v => `${v.toFixed(1)}%`, '焦距相对 d 线');
};

const zoomRange = (): {lo: number; hi: number; step: number} => {
  let min = Infinity;
  let max = -Infinity;
  for (let nm = NM_FROM; nm <= NM_TO; nm += 5) {
    const v = percent(doubletRatio(nm));
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  const raw = (max - min) / 5;
  const step = [0.01, 0.02, 0.05, 0.1].find(item => item >= raw) || 0.1;
  return {lo: Math.floor((min - 0.005) / step) * step, hi: Math.ceil((max + 0.005) / step) * step, step};
};

const drawDoubletZoom: DrawFn = ctx => {
  const {lo, hi, step} = zoomRange();
  drawFrame(ctx, [
    {label: '双合', color: COLOR_DOUBLET, value: nm => percent(doubletRatio(nm))}
  ], lo, hi, step, v => `${v.toFixed(2)}%`, '焦距相对 d 线');
};

/** 400~700nm 内焦距相对 d 线的最大偏离（%） */
const maxDeviation = (ratio: (nm: number) => number): number => {
  let worst = 0;
  for (let nm = 400; nm <= 700; nm += 5) {
    worst = Math.max(worst, Math.abs(percent(ratio(nm))));
  }
  return worst;
};

// ---------- 单片透镜：光线与光斑 ----------

const RAY_W = 640;
const RAY_H = 260;
const RAY_EXAG = 12;
const RAY_COLORS = [
  {nm: 450, name: 'B', color: '#3B6FE5'},
  {nm: 550, name: 'G', color: '#2EA043'},
  {nm: 650, name: 'R', color: '#E5483B'}
];

/** 屏幕位置 offset：相对绿光焦点的偏移，单位为焦距的百分比 */
const drawRays = (offset: () => number): DrawFn => ctx => {
  const off = offset();
  const x0 = 70;
  const cy = 120;
  const half = 70;
  const fPx = 360;
  const focusX = (nm: number) => x0 + fPx * (1 + RAY_EXAG * (singleRatio(BK7, nm) - 1));
  const screenX = x0 + fPx * (1 + RAY_EXAG * (singleRatio(BK7, 550) * (1 + off / 100) - 1));

  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, RAY_W, RAY_H);
  ctx.strokeStyle = '#BBB';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(8, cy + 0.5);
  ctx.lineTo(RAY_W - 8, cy + 0.5);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = '#999';
  [-1, 1].forEach(sign => {
    ctx.beginPath();
    ctx.moveTo(10, cy + sign * half);
    ctx.lineTo(x0, cy + sign * half);
    ctx.stroke();
  });

  ctx.beginPath();
  ctx.moveTo(x0, cy - half);
  ctx.quadraticCurveTo(x0 + 18, cy, x0, cy + half);
  ctx.quadraticCurveTo(x0 - 18, cy, x0, cy - half);
  ctx.fillStyle = 'rgba(120, 170, 220, 0.3)';
  ctx.fill();
  ctx.strokeStyle = '#4A78A8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  RAY_COLORS.forEach((item, index) => {
    const xf = focusX(item.nm);
    const end = Math.min(RAY_W - 20, Math.max(xf, screenX) + 30);
    const slope = half / (xf - x0);
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 1.4;
    [-1, 1].forEach(sign => {
      ctx.beginPath();
      ctx.moveTo(x0, cy + sign * half);
      ctx.lineTo(end, cy + sign * half - sign * slope * (end - x0));
      ctx.stroke();
      const hitY = cy + sign * half - sign * slope * (screenX - x0);
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(screenX, hitY, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
    ctx.beginPath();
    ctx.moveTo(xf, cy - 5);
    ctx.lineTo(xf + 5, cy);
    ctx.lineTo(xf, cy + 5);
    ctx.lineTo(xf - 5, cy);
    ctx.closePath();
    ctx.fill();
    text(ctx, `${item.name} ${item.nm}nm 焦点`, xf, cy + 100 + index * 15, 'center', item.color, '11px sans-serif');
    ctx.strokeStyle = item.color;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(xf + 0.5, cy + 8);
    ctx.lineTo(xf + 0.5, cy + 92 + index * 15);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  ctx.strokeStyle = '#333';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(screenX, cy - half - 8);
  ctx.lineTo(screenX, cy + half + 8);
  ctx.stroke();
  text(ctx, '屏幕', screenX, cy - half - 18, 'center', '#333', '12px sans-serif');
  text(ctx, `示意：沿光轴的距离放大了 ${RAY_EXAG} 倍，光线夹角也随之加大`, 12, RAY_H - 12, 'left', '#999', '11px sans-serif');
};

const SPOT_SIZE = 200;
const SPOT_UM_PER_PX = 4.5;
const SPOT_MIN_RADIUS = 1.2;
const SPOT_APERTURE_MM = 50 / (2 * 2.8);
const SPOT_EXPOSURE = 20;

/** 白点光源在屏幕上的光斑：每个波长是一个均匀圆盘，面积越大越暗，再按 D65 加权叠成颜色 */
const drawSpot = (offset: () => number): DrawFn => ctx => {
  const off = offset();
  const size = SPOT_SIZE;
  const unit = SPOT_APERTURE_MM * 1000 / SPOT_UM_PER_PX;
  const green = singleRatio(BK7, 550);
  const radii = WAVELENGTHS.map(nm => Math.max(SPOT_MIN_RADIUS, unit * Math.abs(green * (1 + off / 100) / singleRatio(BK7, nm) - 1)));
  const weights = radii.map(r => (SPOT_MIN_RADIUS / r) ** 2);
  const cx = size / 2;

  const xyzs: number[][] = [];
  let peak = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const rho = Math.hypot(x + 0.5 - cx, y + 0.5 - cx);
      const refl = radii.map((r, i) => weights[i] * Math.min(1, Math.max(0, r + 0.5 - rho)));
      const xyz = spectrumXyz(D65, refl);
      peak = Math.max(peak, xyz[1]);
      xyzs.push(xyz);
    }
  }
  const gain = peak > 1e-9 ? SPOT_EXPOSURE / peak : 1;
  const img = ctx.createImageData(size, size);
  xyzs.forEach((xyz, i) => {
    const rgb = xyzToSrgb([xyz[0] * gain, xyz[1] * gain, xyz[2] * gain]);
    img.data[i * 4] = rgb[0];
    img.data[i * 4 + 1] = rgb[1];
    img.data[i * 4 + 2] = rgb[2];
    img.data[i * 4 + 3] = 255;
  });
  ctx.putImageData(img, 0, 0);

  const bar = 100 / SPOT_UM_PER_PX;
  ctx.fillStyle = '#FFF';
  ctx.fillRect(10, size - 16, bar, 2);
  text(ctx, '100 µm', 10 + bar / 2, size - 26, 'center', '#FFF', '11px sans-serif');
};

// ---------- 照片里的色差 ----------

const SCENE_W = 280;
const SCENE_H = 180;
const SCENE_DARK = 0.02;

const stripe = (v: number, period: number): boolean => Math.floor(v / period) % 2 === 0;

/** 半幅画面里的图案（半幅宽 140、高 180） */
const shape = (lx: number, y: number): boolean => {
  const r = Math.hypot(lx - 70, y - 90);
  if ((r > 26 && r < 34) || r < 5) {
    return true;
  }
  if (lx < 44 && y < 40 && stripe(lx, 4)) {
    return true;
  }
  if (lx > 96 && y > 140 && stripe(y, 4)) {
    return true;
  }
  if (lx < 40 && y > 140 && lx > 6 && y < 174) {
    return stripe(lx + y, 8);
  }
  if (lx > 100 && y < 40 && lx < 134 && y > 6) {
    return true;
  }
  return Math.abs((lx - 70) - (y - 90) * 0.7) < 1.5 && r > 40;
};

const sceneAt = (x: number, y: number): number => {
  const right = x >= SCENE_W / 2;
  const lx = right ? x - SCENE_W / 2 : x;
  const on = shape(lx, y);
  const white = right ? !on : on;
  return white ? 1 : SCENE_DARK;
};

let scenePlane: Float32Array | null = null;

const getScene = (): Float32Array => {
  if (scenePlane) {
    return scenePlane;
  }
  const plane = new Float32Array(SCENE_W * SCENE_H);
  const sub = 3;
  for (let y = 0; y < SCENE_H; y++) {
    for (let x = 0; x < SCENE_W; x++) {
      let sum = 0;
      for (let j = 0; j < sub; j++) {
        for (let i = 0; i < sub; i++) {
          sum += sceneAt(x + (i + 0.5) / sub, y + (j + 0.5) / sub);
        }
      }
      plane[y * SCENE_W + x] = sum / (sub * sub);
    }
  }
  scenePlane = plane;
  return plane;
};

const bilinear = (src: Float32Array, x: number, y: number): number => {
  const fx = Math.min(SCENE_W - 1, Math.max(0, x - 0.5));
  const fy = Math.min(SCENE_H - 1, Math.max(0, y - 0.5));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(SCENE_W - 1, x0 + 1);
  const y1 = Math.min(SCENE_H - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const top = src[y0 * SCENE_W + x0] * (1 - tx) + src[y0 * SCENE_W + x1] * tx;
  const bottom = src[y1 * SCENE_W + x0] * (1 - tx) + src[y1 * SCENE_W + x1] * tx;
  return top * (1 - ty) + bottom * ty;
};

/** 以画面中心为原点放大 m 倍 */
const magnify = (src: Float32Array, m: number): Float32Array => {
  if (Math.abs(m - 1) < 1e-6) {
    return src;
  }
  const out = new Float32Array(src.length);
  const cx = SCENE_W / 2;
  const cy = SCENE_H / 2;
  for (let y = 0; y < SCENE_H; y++) {
    for (let x = 0; x < SCENE_W; x++) {
      out[y * SCENE_W + x] = bilinear(src, cx + (x + 0.5 - cx) / m, cy + (y + 0.5 - cy) / m);
    }
  }
  return out;
};

const BLUR_MAX = 9;

const diskBlur = (src: Float32Array, radius: number): Float32Array => {
  const r = Math.min(BLUR_MAX, radius);
  if (r < 0.4) {
    return src;
  }
  const offsets: number[][] = [];
  const reach = Math.ceil(r);
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      if (dx * dx + dy * dy <= r * r) {
        offsets.push([dx, dy]);
      }
    }
  }
  const out = new Float32Array(src.length);
  for (let y = 0; y < SCENE_H; y++) {
    for (let x = 0; x < SCENE_W; x++) {
      let sum = 0;
      offsets.forEach(([dx, dy]) => {
        const sx = Math.min(SCENE_W - 1, Math.max(0, x + dx));
        const sy = Math.min(SCENE_H - 1, Math.max(0, y + dy));
        sum += src[sy * SCENE_W + sx];
      });
      out[y * SCENE_W + x] = sum / offsets.length;
    }
  }
  return out;
};

type SceneMode = 'original' | 'axial' | 'lateral' | 'both';

interface SceneState {
  lens: LensKey;
  sensor: Sensor;
  exaggeration: number;
  defringe: boolean;
}

/** 画布上每个通道的弥散圆半径（画布像素） */
const canvasBlur = (lens: Lens, sensor: Sensor, nm: number, exaggeration: number): number => {
  const scale = Math.hypot(SCENE_W, SCENE_H) / 2 / halfDiagonalPx(sensor);
  return blurRadiusPx(lens, sensor, nm) * scale * exaggeration;
};

const channelPlane = (mode: SceneMode, state: SceneState, nm: number, isGreen: boolean): Float32Array => {
  const base = getScene();
  if (mode === 'original' || isGreen) {
    return base;
  }
  const lens = lensOf(state.lens);
  let plane = base;
  if (mode === 'lateral' || mode === 'both') {
    const m = 1 + state.exaggeration * lateralEpsilon(lens, nm);
    plane = magnify(plane, m);
    if (state.defringe) {
      plane = magnify(plane, 1 / m);
    }
  }
  if (mode === 'axial' || mode === 'both') {
    plane = diskBlur(plane, canvasBlur(lens, state.sensor, nm, state.exaggeration));
  }
  return plane;
};

const drawScene = (mode: SceneMode, get: () => SceneState): DrawFn => ctx => {
  const state = get();
  const r = channelPlane(mode, state, CHANNEL_NM.r, false);
  const g = channelPlane(mode, state, CHANNEL_NM.g, true);
  const b = channelPlane(mode, state, CHANNEL_NM.b, false);
  const img = ctx.createImageData(SCENE_W, SCENE_H);
  const encode = (v: number) => Math.round(Math.min(1, Math.max(0, linearToSrgb(Math.max(0, v)))) * 255);
  for (let i = 0; i < SCENE_W * SCENE_H; i++) {
    img.data[i * 4] = encode(r[i]);
    img.data[i * 4 + 1] = encode(g[i]);
    img.data[i * 4 + 2] = encode(b[i]);
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
};

export {
  SceneMode,
  SceneState,
  PLOT_W,
  PLOT_H,
  RAY_W,
  RAY_H,
  RAY_EXAG,
  SPOT_SIZE,
  SCENE_W,
  SCENE_H,
  drawIndexPlot,
  drawLensCompare,
  drawDoubletZoom,
  drawRays,
  drawSpot,
  drawScene,
  maxDeviation
};
