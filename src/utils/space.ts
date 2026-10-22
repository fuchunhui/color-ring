/**
 * 色彩空间换算：sRGB(8位) <-> 线性RGB <-> CIE XYZ(D65) <-> CIE Lab/LCH <-> OKLab/OKLCH
 * 除特别说明外，rgb 均为 0~255 的 [r, g, b]；线性值、XYZ 为 0~1 附近的小数。
 */

export type Vec3 = [number, number, number];

export interface Converted {
  rgb: Vec3; // 已截断到 0~255 并取整，可直接传给 Color
  inGamut: boolean; // 换算结果是否落在 sRGB 色域内（未截断前）
}

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

// ---------- gamma ----------

/** sRGB编码值(0~1) -> 线性光(0~1) */
const srgbToLinear = (c: number): number => {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** 线性光(0~1) -> sRGB编码值(0~1)，不做截断 */
const linearToSrgb = (c: number): number => {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
};

const rgbToLinear = (rgb: Vec3): Vec3 => {
  return rgb.map(v => srgbToLinear(v / 255)) as Vec3;
};

const finish = (linear: Vec3): Converted => {
  const eps = 1e-6;
  const encoded = linear.map(linearToSrgb);
  const inGamut = encoded.every(v => v >= -eps && v <= 1 + eps);
  const rgb = encoded.map(v => Math.round(clamp(v, 0, 1) * 255)) as Vec3;
  return {rgb, inGamut};
};

// ---------- XYZ (D65) ----------

const WHITE: Vec3 = [0.95047, 1, 1.08883];

const linearToXyz = ([r, g, b]: Vec3): Vec3 => [
  0.4124564 * r + 0.3575761 * g + 0.1804375 * b,
  0.2126729 * r + 0.7151522 * g + 0.0721750 * b,
  0.0193339 * r + 0.1191920 * g + 0.9503041 * b
];

const xyzToLinear = ([x, y, z]: Vec3): Vec3 => [
  3.2404542 * x - 1.5371385 * y - 0.4985314 * z,
  -0.9692660 * x + 1.8760108 * y + 0.0415560 * z,
  0.0556434 * x - 0.2040259 * y + 1.0572252 * z
];

const rgbToXyz = (rgb: Vec3): Vec3 => linearToXyz(rgbToLinear(rgb));

const xyzToRgb = (xyz: Vec3): Converted => finish(xyzToLinear(xyz));

// ---------- CIE Lab / LCH ----------

const EPSILON = 216 / 24389;
const KAPPA = 24389 / 27;

const labF = (t: number): number => (t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116);
const labFInv = (t: number): number => (t ** 3 > EPSILON ? t ** 3 : (116 * t - 16) / KAPPA);

const xyzToLab = ([x, y, z]: Vec3): Vec3 => {
  const fx = labF(x / WHITE[0]);
  const fy = labF(y / WHITE[1]);
  const fz = labF(z / WHITE[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

const labToXyz = ([l, a, b]: Vec3): Vec3 => {
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const yr = l > KAPPA * EPSILON ? fy ** 3 : l / KAPPA;
  return [labFInv(fx) * WHITE[0], yr * WHITE[1], labFInv(fz) * WHITE[2]];
};

const rgbToLab = (rgb: Vec3): Vec3 => xyzToLab(rgbToXyz(rgb));

const labToRgb = (lab: Vec3): Converted => xyzToRgb(labToXyz(lab));

const toPolar = ([l, a, b]: Vec3): Vec3 => {
  const h = (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
  return [l, Math.hypot(a, b), h];
};

const toCartesian = ([l, c, h]: Vec3): Vec3 => {
  const rad = h * Math.PI / 180;
  return [l, c * Math.cos(rad), c * Math.sin(rad)];
};

const rgbToLch = (rgb: Vec3): Vec3 => toPolar(rgbToLab(rgb));

const lchToRgb = (lch: Vec3): Converted => labToRgb(toCartesian(lch));

// ---------- OKLab / OKLCH ----------

const linearToOklab = ([r, g, b]: Vec3): Vec3 => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  ];
};

const oklabToLinear = ([L, a, b]: Vec3): Vec3 => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ];
};

const rgbToOklab = (rgb: Vec3): Vec3 => linearToOklab(rgbToLinear(rgb));

const oklabToRgb = (lab: Vec3): Converted => finish(oklabToLinear(lab));

const rgbToOklch = (rgb: Vec3): Vec3 => toPolar(rgbToOklab(rgb));

const oklchToRgb = (lch: Vec3): Converted => oklabToRgb(toCartesian(lch));

// ---------- 亮度与对比度 ----------

/** WCAG 相对亮度，0(黑)~1(白) */
const relativeLuminance = (rgb: Vec3): number => {
  const [r, g, b] = rgbToLinear(rgb);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG 对比度，1~21 */
const contrastRatio = (a: Vec3, b: Vec3): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

export {
  srgbToLinear,
  linearToSrgb,
  rgbToLinear,
  rgbToXyz,
  xyzToRgb,
  linearToXyz,
  xyzToLinear,
  xyzToLab,
  labToXyz,
  rgbToLab,
  labToRgb,
  rgbToLch,
  lchToRgb,
  rgbToOklab,
  oklabToRgb,
  rgbToOklch,
  oklchToRgb,
  relativeLuminance,
  contrastRatio
};
