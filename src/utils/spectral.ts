import {Vec3, xyzToLinear, linearToSrgb} from './space';
import {cmf, planck, wavelengthToXyz, xyzToClipRgb} from './cie';

type Spectrum = number[];
type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

const WL_MIN = 380;
const WL_MAX = 780;
const WL_STEP = 5;
const WAVELENGTHS: number[] = Array.from({length: (WL_MAX - WL_MIN) / WL_STEP + 1}, (_, i) => WL_MIN + i * WL_STEP);
const CMF: Vec3[] = WAVELENGTHS.map(cmf);

const sample = (fn: (l: number) => number): Spectrum => WAVELENGTHS.map(fn);

const gauss = (l: number, mu: number, s1: number, s2 = s1): number => {
  const t = (l - mu) / (l < mu ? s1 : s2);
  return Math.exp(-0.5 * t * t);
};

const edge = (l: number, center: number, width: number): number => 1 / (1 + Math.exp(-(l - center) / width));

// CIE 标准照明体 D65，380~780nm，每 10nm 一个值
const D65_TABLE = [
  49.98, 54.65, 82.75, 91.49, 93.43, 86.68, 104.86, 117.01, 117.81, 114.86,
  115.92, 108.81, 109.35, 107.80, 104.79, 107.69, 104.41, 104.05, 100.00, 96.33,
  95.79, 88.69, 90.01, 89.60, 87.70, 83.29, 83.70, 80.03, 80.21, 82.28,
  78.28, 69.72, 71.61, 74.35, 61.60, 69.89, 75.09, 63.59, 46.42, 66.81, 63.38
];

const fromTable = (table: number[], step: number): Spectrum => sample(l => {
  const pos = (l - WL_MIN) / step;
  const i = Math.min(table.length - 2, Math.floor(pos));
  const t = pos - i;
  return table[i] * (1 - t) + table[i + 1] * t;
});

const D65: Spectrum = fromTable(D65_TABLE, 10);

const blackbody = (t: number): Spectrum => sample(l => planck(l, t));

/** 光谱 × 反射率 → XYZ，按完全漫反射白（反射率恒为 1）的 Y = 1 归一化 */
const spectrumXyz = (spd: Spectrum, refl?: Spectrum): Vec3 => {
  let x = 0;
  let y = 0;
  let z = 0;
  let k = 0;
  WAVELENGTHS.forEach((_, i) => {
    const p = spd[i] * (refl ? refl[i] : 1);
    x += p * CMF[i][0];
    y += p * CMF[i][1];
    z += p * CMF[i][2];
    k += spd[i] * CMF[i][1];
  });
  return [x / k, y / k, z / k];
};

/** XYZ → sRGB，色域外直接截断 */
const xyzToSrgb = (xyz: Vec3): Vec3 => {
  return xyzToLinear(xyz).map(v => {
    return Math.round(Math.min(1, Math.max(0, linearToSrgb(Math.max(0, v)))) * 255);
  }) as Vec3;
};

const rgbCss = ([r, g, b]: Vec3): string => `rgb(${r}, ${g}, ${b})`;

const rgbHex = (rgb: Vec3): string => '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();

type Matrix = number[][];

const mulVec = (m: Matrix, v: Vec3): Vec3 => {
  return m.map(row => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) as Vec3;
};

const invert3 = (m: Matrix): Matrix => {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  return [
    [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
    [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
    [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det]
  ];
};

const BRADFORD: Matrix = [
  [0.8951, 0.2664, -0.1614],
  [-0.7502, 1.7135, 0.0367],
  [0.0389, -0.0685, 1.0296]
];
const BRADFORD_INV = invert3(BRADFORD);

/** Bradford 色适应：把在 src 白点下的颜色换算到 dst 白点下 */
const adaptXyz = (xyz: Vec3, src: Vec3, dst: Vec3): Vec3 => {
  const s = mulVec(BRADFORD, src);
  const d = mulVec(BRADFORD, dst);
  const lms = mulVec(BRADFORD, xyz);
  return mulVec(BRADFORD_INV, lms.map((v, i) => v * d[i] / s[i]) as Vec3);
};

/** McCamy 近似公式：色度坐标 → 相关色温 */
const cctFromXy = (x: number, y: number): number => {
  const n = (x - 0.3320) / (0.1858 - y);
  return 449 * n ** 3 + 3525 * n ** 2 + 6823.3 * n + 5520.33;
};

const wlX = (a: Area, l: number): number => a.x + (l - WL_MIN) / (WL_MAX - WL_MIN) * a.w;

const text = (
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  align: CanvasTextAlign = 'center',
  color = '#333',
  font = '12px sans-serif'
): void => {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
};

/** 在绘图区底层铺一层淡淡的光谱色带，方便对照波长 */
const drawSpectrumBand = (ctx: CanvasRenderingContext2D, a: Area, alpha = 0.3): void => {
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let px = 0; px < a.w; px++) {
    const l = WL_MIN + px / a.w * (WL_MAX - WL_MIN);
    ctx.fillStyle = rgbCss(xyzToClipRgb(wavelengthToXyz(l)));
    ctx.fillRect(a.x + px, a.y, 1, a.h);
  }
  ctx.restore();
};

const drawAxis = (ctx: CanvasRenderingContext2D, a: Area, label = 'nm'): void => {
  const base = a.y + a.h;
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(a.x, base + 0.5);
  ctx.lineTo(a.x + a.w, base + 0.5);
  for (let l = 400; l <= 750; l += 50) {
    const x = Math.round(wlX(a, l)) + 0.5;
    ctx.moveTo(x, base);
    ctx.lineTo(x, base + 4);
  }
  ctx.stroke();
  for (let l = 400; l <= 750; l += 50) {
    text(ctx, `${l}`, wlX(a, l), base + 14, 'center', '#555', '11px sans-serif');
  }
  text(ctx, label, a.x + a.w + 4, base + 14, 'left', '#555', '11px sans-serif');
};

const tracePath = (ctx: CanvasRenderingContext2D, a: Area, values: Spectrum): void => {
  const base = a.y + a.h;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = wlX(a, WAVELENGTHS[i]);
    const y = base - Math.min(1.05, Math.max(0, v)) * a.h;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
};

/** 画一条光谱曲线，values 为 WAVELENGTHS 上的采样，范围 0~1 */
const drawCurve = (
  ctx: CanvasRenderingContext2D,
  a: Area,
  values: Spectrum,
  color: string,
  lineWidth = 2,
  fill?: string
): void => {
  const base = a.y + a.h;
  tracePath(ctx, a, values);
  if (fill) {
    ctx.lineTo(wlX(a, WL_MAX), base);
    ctx.lineTo(wlX(a, WL_MIN), base);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    tracePath(ctx, a, values);
  }
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.stroke();
};

const normalize = (values: Spectrum): Spectrum => {
  const max = Math.max(...values) || 1;
  return values.map(v => v / max);
};

export {
  Spectrum,
  DrawFn,
  Area,
  Matrix,
  WL_MIN,
  WL_MAX,
  WAVELENGTHS,
  D65,
  sample,
  gauss,
  edge,
  blackbody,
  spectrumXyz,
  xyzToSrgb,
  rgbCss,
  rgbHex,
  mulVec,
  invert3,
  adaptXyz,
  cctFromXy,
  wlX,
  text,
  drawSpectrumBand,
  drawAxis,
  drawCurve,
  normalize
};
