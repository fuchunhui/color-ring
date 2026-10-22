/**
 * HSLuv / HPLuv：把 CIELUV 的 LCH 重新参数化，使“饱和度”恒在 sRGB 色域内，亮度与 CIE L* 一致。
 * 算法参考 hsluv.org 的官方实现。
 */
import {Vec3} from './space';

const M = [
  [3.240969941904521, -1.537383177570093, -0.498610760293],
  [-0.96924363628087, 1.87596750150772, 0.041555057407175],
  [0.055630079696993, -0.20397695888897, 1.056971514242878]
];
const REF_U = 0.19783000664283;
const REF_V = 0.46831999493879;
const KAPPA = 903.2962962;
const EPSILON = 0.0088564516;

interface Line {
  slope: number;
  intercept: number;
}

const getBounds = (l: number): Line[] => {
  const result: Line[] = [];
  const sub1 = (l + 16) ** 3 / 1560896;
  const sub2 = sub1 > EPSILON ? sub1 : l / KAPPA;
  for (const [m1, m2, m3] of M) {
    for (let t = 0; t < 2; t++) {
      const top1 = (284517 * m1 - 94839 * m3) * sub2;
      const top2 = (838422 * m3 + 769860 * m2 + 731718 * m1) * l * sub2 - 769860 * t * l;
      const bottom = (632260 * m3 - 126452 * m2) * sub2 + 126452 * t;
      result.push({slope: top1 / bottom, intercept: top2 / bottom});
    }
  }
  return result;
};

/** 给定亮度 L 和色相 H（度）时，sRGB 色域内最大的 CIELUV 色度 */
const maxChromaForLH = (l: number, h: number): number => {
  const rad = h / 360 * Math.PI * 2;
  let min = Infinity;
  getBounds(l).forEach(line => {
    const len = line.intercept / (Math.sin(rad) - line.slope * Math.cos(rad));
    if (len >= 0) {
      min = Math.min(min, len);
    }
  });
  return min;
};

/** 给定亮度 L 时，对所有色相都在色域内的最大色度（HPLuv 用） */
const maxSafeChromaForL = (l: number): number => {
  let min = Infinity;
  getBounds(l).forEach(line => {
    const perpendicular = -1 / line.slope;
    const x = line.intercept / (perpendicular - line.slope);
    const y = perpendicular * x;
    min = Math.min(min, Math.hypot(x, y));
  });
  return min;
};

const dot = (row: number[], v: Vec3): number => row[0] * v[0] + row[1] * v[1] + row[2] * v[2];

const fromLinear = (c: number): number => {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
};

const toLinear = (c: number): number => {
  return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92;
};

const yToL = (y: number): number => (y <= EPSILON ? y * KAPPA : 116 * Math.cbrt(y) - 16);
const lToY = (l: number): number => (l <= 8 ? l / KAPPA : ((l + 16) / 116) ** 3);

const M_INV = [
  [0.41239079926595, 0.35758433938387, 0.18048078840183],
  [0.21263900587151, 0.71516867876775, 0.072192315360733],
  [0.019330818715591, 0.11919477979462, 0.95053215224966]
];

const xyzToLuv = (xyz: Vec3): Vec3 => {
  const [x, y, z] = xyz;
  const divider = x + 15 * y + 3 * z;
  const l = yToL(y);
  if (l === 0 || divider === 0) {
    return [0, 0, 0];
  }
  const varU = 4 * x / divider;
  const varV = 9 * y / divider;
  return [l, 13 * l * (varU - REF_U), 13 * l * (varV - REF_V)];
};

const luvToXyz = ([l, u, v]: Vec3): Vec3 => {
  if (l === 0) {
    return [0, 0, 0];
  }
  const varU = u / (13 * l) + REF_U;
  const varV = v / (13 * l) + REF_V;
  const y = lToY(l);
  const x = 0 - 9 * y * varU / ((varU - 4) * varV - varU * varV);
  const z = (9 * y - 15 * varV * y - varV * x) / (3 * varV);
  return [x, y, z];
};

const lchToRgb = (l: number, c: number, h: number): Vec3 => {
  const rad = h / 180 * Math.PI;
  const xyz = luvToXyz([l, Math.cos(rad) * c, Math.sin(rad) * c]);
  return M.map(row => {
    const v = fromLinear(dot(row, xyz));
    return Math.round(Math.min(1, Math.max(0, v)) * 255);
  }) as Vec3;
};

const rgbToLch = (rgb: Vec3): Vec3 => {
  const linear = rgb.map(v => toLinear(v / 255)) as Vec3;
  const [l, u, v] = xyzToLuv(M_INV.map(row => dot(row, linear)) as Vec3);
  const c = Math.hypot(u, v);
  if (c < 1e-8) {
    return [l, 0, 0];
  }
  const h = Math.atan2(v, u) * 180 / Math.PI;
  return [l, c, h < 0 ? h + 360 : h];
};

const FULL = 99.9999999;
const ZERO = 1e-8;

/** HSLuv：h 0~360，s、l 0~100，返回 0~255 的 RGB */
const hsluvToRgb = (h: number, s: number, l: number): Vec3 => {
  if (l > FULL) {
    return [255, 255, 255];
  }
  if (l < ZERO) {
    return [0, 0, 0];
  }
  return lchToRgb(l, maxChromaForLH(l, h) / 100 * s, h);
};

const rgbToHsluv = (rgb: Vec3): Vec3 => {
  const [l, c, h] = rgbToLch(rgb);
  if (l > FULL) {
    return [h, 0, 100];
  }
  if (l < ZERO) {
    return [h, 0, 0];
  }
  return [h, c / maxChromaForLH(l, h) * 100, l];
};

/** HPLuv：只取对所有色相都安全的色度，因此只能得到柔和的颜色 */
const hpluvToRgb = (h: number, s: number, l: number): Vec3 => {
  if (l > FULL) {
    return [255, 255, 255];
  }
  if (l < ZERO) {
    return [0, 0, 0];
  }
  return lchToRgb(l, maxSafeChromaForL(l) / 100 * s, h);
};

const rgbToHpluv = (rgb: Vec3): Vec3 => {
  const [l, c, h] = rgbToLch(rgb);
  if (l > FULL) {
    return [h, 0, 100];
  }
  if (l < ZERO) {
    return [h, 0, 0];
  }
  return [h, c / maxSafeChromaForL(l) * 100, l];
};

export {
  maxChromaForLH,
  maxSafeChromaForL,
  lchToRgb,
  rgbToLch,
  hsluvToRgb,
  rgbToHsluv,
  hpluvToRgb,
  rgbToHpluv
};
