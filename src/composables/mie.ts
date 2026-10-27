import {mie} from '../utils/mie';
import {
  WAVELENGTHS,
  D65,
  spectrumXyz,
  xyzToSrgb,
  rgbCss,
  drawSpectrumBand,
  drawAxis,
  drawCurve,
  text
} from '../utils/spectral';
import type {Area, DrawFn, Spectrum} from '../utils/spectral';
import type {Vec3} from '../utils/space';

interface Medium {
  key: string;
  name: string;
  /** 颗粒折射率 */
  re: number;
  im: number;
  /** 周围介质折射率 */
  medium: number;
  note: string;
}

const MEDIA: Medium[] = [
  {key: 'drop', name: '水滴（在空气中）', re: 1.33, im: 0, medium: 1, note: '云、雾、雨滴'},
  {key: 'latex', name: '聚苯乙烯乳胶球（在水中）', re: 1.59, im: 0, medium: 1.33, note: '常用的标准颗粒'},
  {key: 'fat', name: '乳脂球（在水中）', re: 1.46, im: 0, medium: 1.33, note: '稀释牛奶，折射率为常见近似值'},
  {key: 'smoke', name: '烟雾（碳颗粒，在空气中）', re: 1.75, im: 0.45, medium: 1, note: '复折射率是示意值'}
];

const PLOT_W = 640;
const PLOT_H = 240;
const STRIP_W = 640;
const STRIP_H = 150;

const area: Area = {x: 50, y: 16, w: PLOT_W - 80, h: PLOT_H - 56};

const R_MIN = 0.01;
const R_MAX = 20;

/** 滑块位置 0~1 → 半径 µm（对数） */
const radiusFromSlider = (t: number): number => R_MIN * (R_MAX / R_MIN) ** t;

interface Curves {
  qsca: Spectrum;
  qext: Spectrum;
}

const cache = new Map<string, Curves>();

const efficiencies = (medium: Medium, radiusUm: number): Curves => {
  const key = `${medium.key}:${radiusUm.toFixed(5)}`;
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }
  const m = medium.re / medium.medium;
  const k = medium.im / medium.medium;
  const qsca: number[] = [];
  const qext: number[] = [];
  WAVELENGTHS.forEach(l => {
    const x = 2 * Math.PI * radiusUm * 1000 * medium.medium / l;
    const r = mie(m, k, x);
    qsca.push(r.qsca);
    qext.push(r.qext);
  });
  const result = {qsca, qext};
  cache.set(key, result);
  return result;
};

const FIXED_Y = 0.6;

/** 只关心色度：把亮度固定，侧面散射光看起来才可比 */
const chroma = (spd: Spectrum, spectrum: Spectrum): Vec3 => {
  const [x, y, z] = spectrumXyz(spd, spectrum);
  const s = y > 0 ? FIXED_Y / y : 0;
  return xyzToSrgb([x * s, y * s, z * s]);
};

const sideColor = (c: Curves): Vec3 => chroma(D65, c.qsca);

const transmitted = (c: Curves, tau550: number): Spectrum => {
  const ref = c.qext[(550 - 380) / 5] || 1;
  return c.qext.map(q => Math.exp(-tau550 * q / ref));
};

const transmitColor = (c: Curves, tau550: number): Vec3 => xyzToSrgb(spectrumXyz(D65, transmitted(c, tau550)));

const maxOf = (v: Spectrum): number => Math.max(...v, 1e-12);

const drawEfficiency = (data: () => Curves): DrawFn => ctx => {
  const c = data();
  drawSpectrumBand(ctx, area, 0.28);
  const top = Math.max(maxOf(c.qsca), maxOf(c.qext));
  drawCurve(ctx, area, c.qext.map(v => v / top), '#888', 1.5);
  drawCurve(ctx, area, c.qsca.map(v => v / top), '#2A5BD6', 2.5);
  drawAxis(ctx, area);
  text(ctx, `纵轴按本图最大值 ${top.toPrecision(3)} 归一化`, area.x, 8, 'left', '#555', '11px sans-serif');
  [['#2A5BD6', '散射效率 Qsca'], ['#888', '消光效率 Qext（含吸收）']].forEach(([color, label], i) => {
    ctx.fillStyle = color;
    ctx.fillRect(area.x + area.w - 190, area.y + 8 + i * 16, 14, 3);
    text(ctx, label, area.x + area.w - 170, area.y + 9 + i * 16, 'left', '#333', '11px sans-serif');
  });
};

const STEPS = 64;

const drawSweep = (medium: () => Medium, tau: () => number, current: () => number): DrawFn => (ctx, w) => {
  const m = medium();
  const left = 84;
  const width = w - left - 10;
  const colw = width / STEPS;
  text(ctx, '侧面散射光', 4, 28, 'left', '#333', '12px sans-serif');
  text(ctx, '透过的光', 4, 78, 'left', '#333', '12px sans-serif');
  for (let i = 0; i < STEPS; i++) {
    const r = radiusFromSlider(i / (STEPS - 1));
    const c = efficiencies(m, r);
    ctx.fillStyle = rgbCss(sideColor(c));
    ctx.fillRect(left + i * colw, 10, Math.ceil(colw), 36);
    ctx.fillStyle = rgbCss(transmitColor(c, tau()));
    ctx.fillRect(left + i * colw, 60, Math.ceil(colw), 36);
  }
  [0.01, 0.1, 1, 10].forEach(r => {
    const t = Math.log(r / R_MIN) / Math.log(R_MAX / R_MIN);
    const x = left + t * (width - colw) + colw / 2;
    ctx.strokeStyle = '#888';
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 100);
    ctx.lineTo(x + 0.5, 106);
    ctx.stroke();
    text(ctx, r < 1 ? `${r * 1000} nm` : `${r} µm`, x, 118, 'center', '#555', '11px sans-serif');
  });
  text(ctx, '颗粒半径（对数坐标）', left + width / 2, 136, 'center', '#555', '11px sans-serif');
  const px = left + current() * (width - colw) + colw / 2;
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.moveTo(px, 50);
  ctx.lineTo(px - 5, 57);
  ctx.lineTo(px + 5, 57);
  ctx.closePath();
  ctx.fill();
};

export {
  MEDIA,
  PLOT_W,
  PLOT_H,
  STRIP_W,
  STRIP_H,
  radiusFromSlider,
  efficiencies,
  sideColor,
  transmitColor,
  drawEfficiency,
  drawSweep
};
export type {Medium, Curves};
