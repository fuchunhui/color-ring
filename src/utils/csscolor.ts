import {Vec3, linearToSrgb, rgbToLinear, rgbToOklab, rgbToOklch, oklabToRgb, oklchToRgb} from './space';

type Mat3 = [Vec3, Vec3, Vec3];

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));
const norm360 = (h: number): number => ((h % 360) + 360) % 360;

const mulMat = (m: Mat3, [x, y, z]: Vec3): Vec3 => [
  m[0][0] * x + m[0][1] * y + m[0][2] * z,
  m[1][0] * x + m[1][1] * y + m[1][2] * z,
  m[2][0] * x + m[2][1] * y + m[2][2] * z
];

// CSS Color 4 给出的精确矩阵，保证中性灰换算后 a、b 恰为 0
const SRGB_TO_XYZ: Mat3 = [
  [506752 / 1228815, 87881 / 245763, 12673 / 70218],
  [87098 / 409605, 175762 / 245763, 12673 / 175545],
  [7918 / 409605, 87881 / 737289, 1001167 / 1053270]
];
const XYZ_TO_SRGB: Mat3 = [
  [12831 / 3959, -329 / 214, -1974 / 3959],
  [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
  [705 / 12673, -2585 / 12673, 705 / 667]
];

const linearToXyz = (v: Vec3): Vec3 => mulMat(SRGB_TO_XYZ, v);
const xyzToLinear = (v: Vec3): Vec3 => mulMat(XYZ_TO_SRGB, v);
const rgbToXyz = (rgb: Vec3): Vec3 => linearToXyz(rgbToLinear(rgb));

const invMat = (m: Mat3): Mat3 => {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const A = e * i - f * h;
  const B = f * g - d * i;
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, (c * h - b * i) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, (c * d - a * f) / det],
    [C / det, (b * g - a * h) / det, (a * e - b * d) / det]
  ];
};

// ---------- Display P3 ----------

const xyToXyz = ([x, y]: [number, number]): Vec3 => [x / y, 1, (1 - x - y) / y];

const primariesMatrix = (r: [number, number], g: [number, number], b: [number, number], white: Vec3): Mat3 => {
  const R = xyToXyz(r);
  const G = xyToXyz(g);
  const B = xyToXyz(b);
  const m: Mat3 = [[R[0], G[0], B[0]], [R[1], G[1], B[1]], [R[2], G[2], B[2]]];
  const s = mulMat(invMat(m), white);
  return m.map(row => [row[0] * s[0], row[1] * s[1], row[2] * s[2]]) as Mat3;
};

const WHITE_D65 = linearToXyz([1, 1, 1]);
const P3_TO_XYZ = primariesMatrix([0.68, 0.32], [0.265, 0.69], [0.15, 0.06], WHITE_D65);
const XYZ_TO_P3 = invMat(P3_TO_XYZ);

// ---------- CSS Lab/LCH (D50) ----------

const D65_TO_D50: Mat3 = [
  [1.0479297925449969, 0.022946870601609652, -0.05019226628920524],
  [0.02962780877005599, 0.9904344267538799, -0.017073799063418826],
  [-0.009243040646204504, 0.015055191490298152, 0.7518742814281371]
];
const D50_TO_D65: Mat3 = [
  [0.955473421488075, -0.02309845494876471, 0.06325924320057072],
  [-0.0283697093338637, 1.0099953980813041, 0.021041441191917323],
  [0.012314014864481998, -0.020507649298898964, 1.330365926242124]
];
const WHITE_D50: Vec3 = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];

const EPSILON = 216 / 24389;
const KAPPA = 24389 / 27;
const labF = (t: number): number => (t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116);
const labFInv = (t: number): number => (t ** 3 > EPSILON ? t ** 3 : (116 * t - 16) / KAPPA);

const d50XyzToLab = (xyz: Vec3): Vec3 => {
  const [fx, fy, fz] = xyz.map((v, i) => labF(v / WHITE_D50[i]));
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

const labToD50Xyz = ([l, a, b]: Vec3): Vec3 => {
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const yr = l > KAPPA * EPSILON ? fy ** 3 : l / KAPPA;
  return [labFInv(fx) * WHITE_D50[0], yr * WHITE_D50[1], labFInv(fz) * WHITE_D50[2]];
};

const toPolar = ([l, a, b]: Vec3): Vec3 => [l, Math.hypot(a, b), norm360(Math.atan2(b, a) * 180 / Math.PI)];

const toCartesian = ([l, c, h]: Vec3): Vec3 => {
  const rad = h * Math.PI / 180;
  return [l, c * Math.cos(rad), c * Math.sin(rad)];
};

const rgbToCssLab = (rgb: Vec3): Vec3 => d50XyzToLab(mulMat(D65_TO_D50, rgbToXyz(rgb)));

const encode = (linear: Vec3): Vec3 => linear.map(v => Math.round(clamp(linearToSrgb(v), 0, 1) * 255)) as Vec3;

const cssLabToRgb = (lab: Vec3): Vec3 => encode(xyzToLinear(mulMat(D50_TO_D65, labToD50Xyz(lab))));

// ---------- HSL / HWB ----------

const rgbToHsl = (rgb: Vec3): Vec3 => {
  const [r, g, b] = rgb.map(v => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  if (d !== 0) {
    if (max === r) {
      h = ((g - b) / d) % 6;
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
  }
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [norm360(h * 60), s * 100, l * 100];
};

const hslToRgb = ([h, s, l]: Vec3): Vec3 => {
  const hue = norm360(h);
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const k = (n: number) => (n + hue / 30) % 12;
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
};

const rgbToHwb = (rgb: Vec3): Vec3 => {
  const [h] = rgbToHsl(rgb);
  return [h, Math.min(...rgb) / 255 * 100, (1 - Math.max(...rgb) / 255) * 100];
};

const hwbToRgb = ([h, w, b]: Vec3): Vec3 => {
  const white = w / 100;
  const black = b / 100;
  if (white + black >= 1) {
    const gray = white / (white + black) * 255;
    return [gray, gray, gray];
  }
  return hslToRgb([h, 100, 50]).map(v => v * (1 - white - black) + white * 255) as Vec3;
};

// ---------- 字符串 ----------

const parseHex = (text: string): Vec3 | null => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!m) {
    return null;
  }
  const full = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16)) as Vec3;
};

const toHex = (rgb: Vec3): string => {
  return '#' + rgb.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
};

const num = (v: number, digits: number): string => {
  const s = (+v.toFixed(digits)).toString();
  return s === '-0' ? '0' : s;
};

const space3 = (v: Vec3, digits: number): string => v.map(n => num(n, digits)).join(' ');

const clamp01 = (v: number): number => clamp(v, 0, 1);

// ---------- 各种 CSS 写法 ----------

interface CssFormat {
  label: string;
  css: string;
}

const formatAll = (rgb: Vec3): CssFormat[] => {
  const hsl = rgbToHsl(rgb);
  const hwb = rgbToHwb(rgb);
  const lab = rgbToCssLab(rgb);
  const lch = toPolar(lab);
  const oklab = rgbToOklab(rgb);
  const oklch = rgbToOklch(rgb);
  const xyz = rgbToXyz(rgb);
  const p3 = mulMat(XYZ_TO_P3, xyz).map(v => clamp01(linearToSrgb(v))) as Vec3;
  const hue = (chroma: number, eps: number, h: number): number => (chroma < eps ? 0 : h);

  return [
    {label: 'Hex', css: toHex(rgb)},
    {label: 'rgb()', css: `rgb(${rgb.map(v => Math.round(v)).join(' ')})`},
    {label: 'hsl()', css: `hsl(${num(hsl[0], 1)} ${num(hsl[1], 1)}% ${num(hsl[2], 1)}%)`},
    {label: 'hwb()', css: `hwb(${num(hwb[0], 1)} ${num(hwb[1], 1)}% ${num(hwb[2], 1)}%)`},
    {label: 'lab()', css: `lab(${space3(lab, 2)})`},
    {label: 'lch()', css: `lch(${num(lch[0], 2)} ${num(lch[1], 2)} ${num(hue(lch[1], 0.05, lch[2]), 1)})`},
    {label: 'oklab()', css: `oklab(${space3(oklab, 4)})`},
    {label: 'oklch()', css: `oklch(${num(oklch[0], 3)} ${num(oklch[1], 3)} ${num(hue(oklch[1], 0.0005, oklch[2]), 1)})`},
    {label: 'color(srgb)', css: `color(srgb ${space3(rgb.map(v => v / 255) as Vec3, 4)})`},
    {label: 'color(srgb-linear)', css: `color(srgb-linear ${space3(rgbToLinear(rgb), 4)})`},
    {label: 'color(display-p3)', css: `color(display-p3 ${space3(p3, 4)})`},
    {label: 'color(xyz-d65)', css: `color(xyz-d65 ${space3(xyz, 4)})`}
  ];
};

// ---------- color-mix ----------

type MixSpace = 'srgb' | 'srgb-linear' | 'hsl' | 'hwb' | 'lab' | 'lch' | 'oklab' | 'oklch';

interface MixSpaceInfo {
  value: MixSpace;
  polar: boolean;
}

const MIX_SPACES: MixSpaceInfo[] = [
  {value: 'srgb', polar: false},
  {value: 'srgb-linear', polar: false},
  {value: 'hsl', polar: true},
  {value: 'hwb', polar: true},
  {value: 'lab', polar: false},
  {value: 'lch', polar: true},
  {value: 'oklab', polar: false},
  {value: 'oklch', polar: true}
];

const HUE_INDEX: Partial<Record<MixSpace, number>> = {hsl: 0, hwb: 0, lch: 2, oklch: 2};

const finishRgb = (rgb: Vec3): Vec3 => rgb.map(v => Math.round(clamp(v, 0, 255))) as Vec3;

const toSpace = (rgb: Vec3, space: MixSpace): Vec3 => {
  switch (space) {
    case 'srgb':
      return rgb.map(v => v / 255) as Vec3;
    case 'srgb-linear':
      return rgbToLinear(rgb);
    case 'hsl':
      return rgbToHsl(rgb);
    case 'hwb':
      return rgbToHwb(rgb);
    case 'lab':
      return rgbToCssLab(rgb);
    case 'lch':
      return toPolar(rgbToCssLab(rgb));
    case 'oklab':
      return rgbToOklab(rgb);
    default:
      return rgbToOklch(rgb);
  }
};

const fromSpace = (c: Vec3, space: MixSpace): Vec3 => {
  switch (space) {
    case 'srgb':
      return finishRgb(c.map(v => v * 255) as Vec3);
    case 'srgb-linear':
      return encode(c);
    case 'hsl':
      return finishRgb(hslToRgb(c));
    case 'hwb':
      return finishRgb(hwbToRgb(c));
    case 'lab':
      return cssLabToRgb(c);
    case 'lch':
      return cssLabToRgb(toCartesian(c));
    case 'oklab':
      return oklabToRgb(c).rgb;
    default:
      return oklchToRgb(c).rgb;
  }
};

const powerless = (c: Vec3, space: MixSpace): boolean => {
  switch (space) {
    case 'hsl':
      return c[1] < 0.01;
    case 'hwb':
      return c[1] + c[2] >= 99.99;
    case 'lch':
      return c[1] < 0.05;
    default:
      return c[1] < 0.0005;
  }
};

/** 在指定空间按 CSS Color 5 规则混合；weightA 是第一个颜色的占比(0~1)，色相取最短路径 */
const mixColors = (a: Vec3, b: Vec3, weightA: number, space: MixSpace): Vec3 => {
  const ca = toSpace(a, space);
  const cb = toSpace(b, space);
  const wb = 1 - weightA;
  const mixed = ca.map((v, i) => v * weightA + cb[i] * wb) as Vec3;
  const hi = HUE_INDEX[space];
  if (hi !== undefined) {
    const pa = powerless(ca, space);
    const pb = powerless(cb, space);
    if (pa && pb) {
      mixed[hi] = 0;
    } else if (pa) {
      mixed[hi] = cb[hi];
    } else if (pb) {
      mixed[hi] = ca[hi];
    } else {
      const d = ((cb[hi] - ca[hi] + 540) % 360) - 180;
      mixed[hi] = norm360(ca[hi] + d * wb);
    }
  }
  return fromSpace(mixed, space);
};

// ---------- 广色域 ----------

const oklabToLinearRaw = ([L, a, b]: Vec3): Vec3 => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ];
};

interface WideColor {
  srgb: Vec3; // 截断到 sRGB 的 8 位值
  p3Css: string; // color(display-p3 …)
  inSrgb: boolean;
  inP3: boolean;
}

const inUnit = (v: Vec3): boolean => v.every(n => n >= -1e-4 && n <= 1 + 1e-4);

/** oklch 颜色分别落到 sRGB(截断)与 Display P3 */
const oklchToWide = (lch: Vec3): WideColor => {
  const linear = oklabToLinearRaw(toCartesian(lch));
  const p3 = mulMat(XYZ_TO_P3, linearToXyz(linear)).map(linearToSrgb) as Vec3;
  return {
    srgb: oklchToRgb(lch).rgb,
    p3Css: `color(display-p3 ${space3(p3.map(clamp01) as Vec3, 4)})`,
    inSrgb: inUnit(linear),
    inP3: inUnit(p3)
  };
};

export {
  CssFormat,
  MixSpace,
  MixSpaceInfo,
  WideColor,
  MIX_SPACES,
  parseHex,
  toHex,
  formatAll,
  rgbToHsl,
  hslToRgb,
  mixColors,
  oklchToWide
};
