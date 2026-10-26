import type {Vec3} from '../utils/space';
import {
  camAt,
  camHue,
  grayCode,
  luminanceOf,
  mixWithWhite,
  shiftedWavelength,
  wavelengthRgb,
  INVARIANT_HUES,
  drawPlot,
  label
} from '../utils/appearance';
import type {MixKind} from '../utils/appearance';
import type {DrawFn} from '../utils/spectral';

const css = (rgb: Vec3): string => `rgb(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])})`;

// ---------- Helmholtz–Kohlrausch ----------

const HK_W = 220;
const HK_H = 130;

interface HkPair {
  name: string;
  rgb: Vec3;
}

const HK_PAIRS: HkPair[] = [
  {name: '红', rgb: [220, 40, 40]},
  {name: '橙', rgb: [240, 140, 0]},
  {name: '绿', rgb: [0, 170, 70]},
  {name: '蓝', rgb: [40, 70, 240]},
  {name: '品红', rgb: [220, 0, 170]}
];

const hkGrayY = (pair: HkPair, factor: number): number => Math.min(1, luminanceOf(pair.rgb) * factor);

const drawHk = (pair: HkPair, getFactor: () => number): DrawFn => ctx => {
  const g = grayCode(hkGrayY(pair, getFactor()));
  ctx.fillStyle = css(pair.rgb);
  ctx.fillRect(0, 0, HK_W / 2, HK_H);
  ctx.fillStyle = css([g, g, g]);
  ctx.fillRect(HK_W / 2, 0, HK_W / 2, HK_H);
};

// ---------- Bezold–Brücke ----------

const BB_W = 470;
const BB_H = 190;
const BB_PLOT_H = 300;

const drawBezoldPatches = (getL0: () => number, getLog: () => number): DrawFn => ctx => {
  const l0 = getL0();
  const lg = getLog();
  const lp = shiftedWavelength(l0, lg);
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, BB_W, BB_H);
  ctx.fillStyle = css(wavelengthRgb(l0, 0.1));
  ctx.fillRect(10, 10, 210, 130);
  ctx.fillStyle = css(wavelengthRgb(l0, 1));
  ctx.fillRect(250, 10, 210, 130);
  ctx.fillStyle = css(wavelengthRgb(lp, 1));
  ctx.fillRect(410, 100, 40, 30);
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(410, 100, 40, 30);
  label(ctx, '低强度（亮度 × 0.1）', 115, 156, 'center', '#333', '12px sans-serif');
  label(ctx, `高强度（亮度 × ${Math.round(10 ** lg)}）`, 355, 156, 'center', '#333', '12px sans-serif');
  label(ctx, '小块 = 感知色相（示意）', 436, 90, 'right', '#FFF', '11px sans-serif');
  label(ctx, `物理波长 ${l0} nm → 示意模型的感知色相约 ${lp.toFixed(0)} nm`, BB_W / 2, 176, 'center', '#666', '12px sans-serif');
};

const drawBezoldPlot: DrawFn = ctx => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, BB_W, BB_PLOT_H);
  const ls = Array.from({length: 45}, (_, i) => 440 + i * 5);
  const shift = (lg: number): [number, number][] => ls.map(l => [l, shiftedWavelength(l, lg) - l] as [number, number]);
  const inv = INVARIANT_HUES.map(h => ({
    label: `不变色相 ${h} nm`,
    color: '#9E9E9E',
    dashed: true,
    points: [[h, -30], [h, 30]] as [number, number][]
  }));
  drawPlot(ctx, {
    x: 54,
    y: 12,
    w: BB_W - 70,
    h: 236,
    xMin: 440,
    xMax: 660,
    yMin: -30,
    yMax: 30,
    xTicks: [450, 500, 550, 600, 650],
    yTicks: [-30, -15, 0, 15, 30],
    xLabel: '物理波长 λ（nm）',
    yLabel: '示意的感知偏移（nm）',
    legend: 'tr'
  }, [
    {label: '强度 × 10', color: '#1565C0', points: shift(1)},
    {label: '强度 × 100', color: '#EF6C00', points: shift(2)},
    ...inv
  ]);
};

// ---------- Abney ----------

const ABNEY_W = 580;
const ABNEY_STRIP_H = 270;
const ABNEY_PLOT_H = 350;

const ABNEY_PATHS: {kind: MixKind; name: string; color: string}[] = [
  {kind: 'srgb', name: 'sRGB 数值直接混合', color: '#757575'},
  {kind: 'xyz', name: 'XYZ 混合（相当于光的叠加）', color: '#2E7D32'},
  {kind: 'lab', name: 'CIELAB 混合', color: '#8E24AA'},
  {kind: 'oklab', name: 'OKLab 混合', color: '#00838F'},
  {kind: 'ucs', name: 'CAM16-UCS 混合', color: '#EF6C00'}
];

const drawAbneyStrips = (getRgb: () => Vec3): DrawFn => ctx => {
  const rgb = getRgb();
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, ABNEY_W, ABNEY_STRIP_H);
  const x0 = 190;
  const w = ABNEY_W - x0 - 10;
  ABNEY_PATHS.forEach((p, i) => {
    const y = 10 + i * 50;
    for (let px = 0; px < w; px++) {
      ctx.fillStyle = css(mixWithWhite(rgb, p.kind, px / (w - 1)));
      ctx.fillRect(x0 + px, y, 1, 38);
    }
    label(ctx, p.name, x0 - 8, y + 19, 'right', '#333', '11px sans-serif');
  });
  label(ctx, '纯色', x0, ABNEY_STRIP_H - 8, 'left', '#666', '11px sans-serif');
  label(ctx, '白', x0 + w, ABNEY_STRIP_H - 8, 'right', '#666', '11px sans-serif');
};

const drawAbneyPlot = (getRgb: () => Vec3): DrawFn => ctx => {
  const rgb = getRgb();
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, ABNEY_W, ABNEY_PLOT_H);
  const h0 = camHue(rgb);
  const ts = Array.from({length: 46}, (_, i) => i * 0.02);
  const series = ABNEY_PATHS.map(p => ({
    label: p.name,
    color: p.color,
    points: ts.map(t => {
      const d = ((camHue(mixWithWhite(rgb, p.kind, t)) - h0 + 540) % 360) - 180;
      return [t, d] as [number, number];
    })
  }));
  const all = series.flatMap(s => s.points.map(pt => Math.abs(pt[1])));
  const m = Math.max(10, Math.ceil(Math.max(...all) / 10) * 10);
  drawPlot(ctx, {
    x: 56,
    y: 12,
    w: ABNEY_W - 76,
    h: 224,
    xMin: 0,
    xMax: 0.9,
    yMin: -m,
    yMax: m,
    xTicks: [0, 0.2, 0.4, 0.6, 0.8],
    yTicks: [-m, -m / 2, 0, m / 2, m],
    xLabel: '混入白色的比例 t',
    yLabel: 'CAM16 色相角相对纯色的变化（°）'
  }, series);
  series.forEach((s, i) => {
    const x = 60 + (i % 2) * 260;
    const y = 12 + 224 + 46 + Math.floor(i / 2) * 18;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20, y);
    ctx.stroke();
    label(ctx, s.label, x + 26, y, 'left', '#333');
  });
};

// ---------- Hunt / Stevens ----------

const HUNT_W = 480;
const HUNT_H = 330;
const LA_LIST = [1, 10, 100, 1000];

const hexToRgb = (hex: string): Vec3 => {
  const v = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16)) as Vec3;
};

interface HuntRow {
  la: number;
  J: number;
  C: number;
  M: number;
  Q: number;
}

const huntRows = (rgb: Vec3): HuntRow[] => LA_LIST.map(la => {
  const c = camAt(rgb, la);
  return {la, J: c.J, C: c.C, M: c.M, Q: c.Q};
});

const drawHunt = (getRgb: () => Vec3): DrawFn => ctx => {
  const rgb = getRgb();
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, HUNT_W, HUNT_H);
  const las = Array.from({length: 25}, (_, i) => 10 ** (i / 8));
  const pick = (key: 'M' | 'C'): [number, number][] => las.map(la => [la, camAt(rgb, la)[key]] as [number, number]);
  const series = [
    {label: '色彩度 M（随亮度增大）', color: '#C62828', points: pick('M')},
    {label: '色度 C（相对量，几乎不变）', color: '#757575', points: pick('C'), dashed: true}
  ];
  const top = Math.ceil(Math.max(...series.flatMap(s => s.points.map(p => p[1]))) / 25) * 25;
  drawPlot(ctx, {
    x: 54,
    y: 12,
    w: HUNT_W - 70,
    h: 252,
    xMin: 1,
    xMax: 1000,
    yMin: 0,
    yMax: top,
    xTicks: [1, 10, 100, 1000],
    yTicks: [0, top / 4, top / 2, top * 3 / 4, top],
    xLog: true,
    xLabel: '适应亮度 L_A（cd/m²）',
    yLabel: '数值',
    legend: 'br'
  }, series);
};

const STEVENS_COLORS = ['#90CAF9', '#42A5F5', '#1565C0', '#0D2A6B'];

const drawStevens: DrawFn = ctx => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, HUNT_W, HUNT_H);
  const ys = Array.from({length: 31}, (_, i) => 0.02 + i * (0.98 / 30));
  const series = LA_LIST.map((la, i) => ({
    label: `L_A = ${la} cd/m²`,
    color: STEVENS_COLORS[i],
    points: ys.map(y => {
      const c = grayCode(y);
      return [y, camAt([c, c, c], la).Q] as [number, number];
    })
  }));
  drawPlot(ctx, {
    x: 54,
    y: 12,
    w: HUNT_W - 70,
    h: 252,
    xMin: 0,
    xMax: 1,
    yMin: 0,
    yMax: 450,
    xTicks: [0, 0.25, 0.5, 0.75, 1],
    yTicks: [0, 100, 200, 300, 400],
    xLabel: '灰色的相对亮度 Y',
    yLabel: 'CAM16 亮度 Q',
    legend: 'tl'
  }, series);
};

export {
  HK_W,
  HK_H,
  HK_PAIRS,
  BB_W,
  BB_H,
  BB_PLOT_H,
  ABNEY_W,
  ABNEY_STRIP_H,
  ABNEY_PLOT_H,
  hkGrayY,
  drawHk,
  drawBezoldPatches,
  drawBezoldPlot,
  drawAbneyStrips,
  drawAbneyPlot,
  HUNT_W,
  HUNT_H,
  LA_LIST,
  hexToRgb,
  huntRows,
  drawHunt,
  drawStevens
};
