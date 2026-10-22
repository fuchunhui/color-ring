import {Vec3, srgbToLinear, linearToSrgb, linearToXyz} from '../utils/space';
import {cmf} from '../utils/cie';
import {MATRICES} from '../utils/colorblind';
import {
  Spectrum,
  DrawFn,
  Area,
  Matrix,
  WL_MIN,
  WL_MAX,
  sample,
  mulVec,
  invert3,
  rgbCss,
  text,
  drawSpectrumBand,
  drawAxis,
  drawCurve,
  wlX
} from '../utils/spectral';

// Hunt–Pointer–Estevez：XYZ → LMS
const HPE: Matrix = [
  [0.38971, 0.68898, -0.07868],
  [-0.22981, 1.18340, 0.04641],
  [0, 0, 1]
];

const rawCone = (l: number): Vec3 => mulVec(HPE, cmf(l)).map(v => Math.max(0, v)) as Vec3;

const PEAKS: Vec3 = [0, 0, 0];
for (let l = 380; l <= 780; l++) {
  rawCone(l).forEach((v, i) => {
    PEAKS[i] = Math.max(PEAKS[i], v);
  });
}

/** 波长 l(nm) 下三种视锥的相对响应，各自峰值归一化为 1 */
const cone = (l: number): Vec3 => rawCone(l).map((v, i) => v / PEAKS[i]) as Vec3;

const CONE_CURVES: Spectrum[] = [0, 1, 2].map(i => sample(l => cone(l)[i]));
const CONE_COLORS = ['#D9480F', '#2F9E44', '#1971C2'];
const CONE_NAMES = ['L 长波', 'M 中波', 'S 短波'];

const CONE_W = 740;
const CONE_H = 290;
const CONE_PLOT: Area = {x: 44, y: 24, w: 640, h: 200};

const xToWavelength = (x: number): number => {
  const l = WL_MIN + (x - CONE_PLOT.x) / CONE_PLOT.w * (WL_MAX - WL_MIN);
  return Math.round(Math.min(WL_MAX, Math.max(WL_MIN, l)));
};

const drawCones = (wl: () => number): DrawFn => ctx => {
  const a = CONE_PLOT;
  drawSpectrumBand(ctx, a, 0.3);
  ctx.strokeStyle = '#DDD';
  ctx.lineWidth = 1;
  [0, 0.5, 1].forEach(v => {
    const y = Math.round(a.y + a.h - v * a.h) + 0.5;
    ctx.beginPath();
    ctx.moveTo(a.x, y);
    ctx.lineTo(a.x + a.w, y);
    ctx.stroke();
    text(ctx, `${v}`, a.x - 8, y, 'right', '#555', '11px sans-serif');
  });
  CONE_CURVES.forEach((values, i) => drawCurve(ctx, a, values, CONE_COLORS[i], 2.5));
  drawAxis(ctx, a);
  CONE_NAMES.forEach((name, i) => {
    ctx.fillStyle = CONE_COLORS[i];
    ctx.fillRect(a.x + a.w - 120, a.y + 8 + i * 18, 14, 3);
    text(ctx, name, a.x + a.w - 100, a.y + 10 + i * 18, 'left', '#333', '12px sans-serif');
  });

  const l = wl();
  const x = Math.round(wlX(a, l)) + 0.5;
  ctx.strokeStyle = '#222';
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(x, a.y);
  ctx.lineTo(x, a.y + a.h);
  ctx.stroke();
  ctx.setLineDash([]);
  const response = cone(l);
  response.forEach((v, i) => {
    ctx.beginPath();
    ctx.arc(x, a.y + a.h - Math.min(1, v) * a.h, 4, 0, 2 * Math.PI);
    ctx.fillStyle = CONE_COLORS[i];
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
  text(ctx, `${l}nm`, x, a.y - 10, 'center', '#222', 'bold 12px sans-serif');
  text(ctx, '点击图表选择波长', 8, CONE_H - 12, 'left', '#999', '11px sans-serif');
};

/** sRGB(0~255) → LMS（线性 sRGB → XYZ → HPE） */
const rgbToLms = (rgb: Vec3): Vec3 => {
  const linear = rgb.map(v => srgbToLinear(v / 255)) as Vec3;
  return mulVec(HPE, linearToXyz(linear));
};

const BAR_W = 420;
const BAR_H = 150;

const drawLmsBars = (color: () => Vec3): DrawFn => ctx => {
  const rgb = color();
  const lms = rgbToLms(rgb);
  ctx.fillStyle = rgbCss(rgb);
  ctx.fillRect(10, 10, 80, 130);
  ctx.strokeStyle = '#CCC';
  ctx.strokeRect(10.5, 10.5, 79, 129);
  const max = 1.1;
  lms.forEach((v, i) => {
    const y = 18 + i * 42;
    text(ctx, CONE_NAMES[i], 104, y + 12, 'left', '#333', '12px sans-serif');
    ctx.fillStyle = '#EEE';
    ctx.fillRect(176, y, 180, 24);
    ctx.fillStyle = CONE_COLORS[i];
    ctx.fillRect(176, y, Math.min(1, v / max) * 180, 24);
    text(ctx, v.toFixed(3), 364, y + 12, 'left', '#222', '12px Consolas, monospace');
  });
};

// Viénot 等人（1999）使用的 RGB → LMS，作用于线性 RGB
const RGB_TO_LMS: Matrix = [
  [17.8824, 43.5161, 4.11935],
  [3.45565, 27.1554, 3.86714],
  [0.0299566, 0.184309, 1.46709]
];
const LMS_TO_RGB = invert3(RGB_TO_LMS);

const VIENOT: Record<string, Matrix> = {
  protanopia: [[0, 2.02344, -2.52581], [0, 1, 0], [0, 0, 1]],
  deuteranopia: [[1, 0, 0], [0.494207, 0, 1.24827], [0, 0, 1]],
  tritanopia: [[1, 0, 0], [0, 1, 0], [-0.395913, 0.801109, 0]]
};

const encode = (v: number): number => {
  return Math.round(Math.min(1, Math.max(0, linearToSrgb(Math.max(0, v)))) * 255);
};

const simulateVienot = (rgb: Vec3, type: string): Vec3 => {
  const linear = rgb.map(v => srgbToLinear(v / 255)) as Vec3;
  const lms = mulVec(RGB_TO_LMS, linear);
  return mulVec(LMS_TO_RGB, mulVec(VIENOT[type], lms)).map(encode) as Vec3;
};

const simulateMachado = (rgb: Vec3, type: string): Vec3 => {
  const linear = rgb.map(v => srgbToLinear(v / 255)) as Vec3;
  return mulVec(MATRICES[type], linear).map(encode) as Vec3;
};

const hueToRgb = (h: number): Vec3 => {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return 1 - Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5), f(3), f(1)].map(v => Math.round(v * 255)) as Vec3;
};

const TEST_SWATCHES: Vec3[] = [
  [220, 40, 40], [40, 160, 60], [240, 140, 30], [140, 150, 30], [150, 90, 40], [240, 130, 170]
];

const PANEL_W = 230;
const SIM_W = PANEL_W * 3;
const SIM_H = 112;

const drawSimulation = (type: string): DrawFn => ctx => {
  const panels: [string, (rgb: Vec3) => Vec3][] = [
    ['原图', rgb => rgb],
    ['Viénot 1999（LMS 空间）', rgb => simulateVienot(rgb, type)],
    ['Machado 2009（线性 RGB 矩阵）', rgb => simulateMachado(rgb, type)]
  ];
  panels.forEach(([title, map], p) => {
    const x0 = p * PANEL_W + 8;
    text(ctx, title, x0, 12, 'left', '#333', '12px sans-serif');
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = rgbCss(map(hueToRgb(i / 200 * 330)));
      ctx.fillRect(x0 + i, 26, 1, 34);
    }
    TEST_SWATCHES.forEach((rgb, i) => {
      ctx.fillStyle = rgbCss(map(rgb));
      ctx.fillRect(x0 + i * 34, 70, 32, 32);
    });
  });
};

export {
  CONE_W,
  CONE_H,
  BAR_W,
  BAR_H,
  SIM_W,
  SIM_H,
  CONE_NAMES,
  cone,
  rgbToLms,
  xToWavelength,
  drawCones,
  drawLmsBars,
  drawSimulation
};
