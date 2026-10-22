import {Vec3, linearToSrgb, linearToXyz, xyzToLinear, xyzToLab, labToXyz, lchToRgb} from './space';

const RAD = Math.PI / 180;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

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

const oklchToOklab = ([L, C, h]: Vec3): Vec3 => [L, C * Math.cos(h * RAD), C * Math.sin(h * RAD)];

/** OKLCH 转线性 sRGB，不截断，色域外的颜色会有 <0 或 >1 的分量 */
const oklchToLinear = (lch: Vec3): Vec3 => oklabToLinear(oklchToOklab(lch));

const linearToOklch = (linear: Vec3): Vec3 => {
  const [L, a, b] = linearToOklab(linear);
  return [L, Math.hypot(a, b), (Math.atan2(b, a) / RAD + 360) % 360];
};

const inGamutLinear = (linear: Vec3, eps = 1e-6): boolean => {
  return linear.every(v => v >= -eps && v <= 1 + eps);
};

const clipLinear = (linear: Vec3): Vec3 => linear.map(clamp01) as Vec3;

const linearToRgb8 = (linear: Vec3): Vec3 => {
  return clipLinear(linear).map(v => Math.round(clamp01(linearToSrgb(v)) * 255)) as Vec3;
};

const isInSrgb = (lch: Vec3): boolean => inGamutLinear(oklchToLinear(lch));

/** 未截断的 XYZ（Y = 亮度），用于计算 xy 色度坐标和 Lab */
const oklchToXyz = (lch: Vec3): Vec3 => linearToXyz(oklchToLinear(lch));

const oklchToLab = (lch: Vec3): Vec3 => xyzToLab(oklchToXyz(lch));

interface MapResult {
  rgb: Vec3;
  oklch: Vec3;
  /** 在 OKLCH 切片图上的路径点：[色度 C, 亮度 L] */
  path: [number, number][];
}

const settle = (linear: Vec3, path: [number, number][]): MapResult => {
  const clipped = clipLinear(linear);
  const oklch = linearToOklch(clipped);
  return {rgb: linearToRgb8(clipped), oklch, path: [...path, [oklch[1], oklch[0]]]};
};

const solid = (lch: Vec3, value: number): MapResult => {
  const rgb: Vec3 = [value, value, value];
  return {rgb, oklch: [value ? 1 : 0, 0, lch[2]], path: [[lch[1], lch[0]], [0, value ? 1 : 0]]};
};

/** (a) 直接截断各通道 */
const clipMap = (lch: Vec3): MapResult => {
  const linear = oklchToLinear(lch);
  return settle(linear, [[lch[1], lch[0]]]);
};

/** (b) 保持 CIE LCH 的 L*、h 不变，二分降低色度直到进入 sRGB */
const chromaReduceMap = (lch: Vec3): MapResult => {
  const linear = oklchToLinear(lch);
  const origin: [number, number] = [lch[1], lch[0]];
  if (inGamutLinear(linear)) {
    return settle(linear, [origin]);
  }
  const [ls, la, lb] = xyzToLab(linearToXyz(linear));
  const c0 = Math.hypot(la, lb);
  const h0 = (Math.atan2(lb, la) / RAD + 360) % 360;
  if (ls >= 100) {
    return solid(lch, 255);
  }
  if (ls <= 0) {
    return solid(lch, 0);
  }
  let lo = 0;
  let hi = c0;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (lchToRgb([ls, mid, h0]).inGamut) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const path: [number, number][] = [origin];
  for (let i = 1; i <= 24; i++) {
    const c = c0 + (lo - c0) * i / 24;
    const rad = h0 * RAD;
    const lin = xyzToLinear(labToXyz([ls, c * Math.cos(rad), c * Math.sin(rad)]));
    const ok = linearToOklch(lin);
    path.push([ok[1], ok[0]]);
  }
  const rad = h0 * RAD;
  const final = xyzToLinear(labToXyz([ls, lo * Math.cos(rad), lo * Math.sin(rad)]));
  return {rgb: linearToRgb8(final), oklch: linearToOklch(clipLinear(final)), path};
};

const okDistance = (linear: Vec3, lch: Vec3): number => {
  const a = linearToOklab(linear);
  const b = oklchToOklab(lch);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
};

/** (c) CSS Color 4 色域映射：在 OKLCH 中二分色度，直到截断结果与原色的 ΔE_OK 小于 JND */
const css4Map = (lch: Vec3): MapResult => {
  const [L, C, h] = lch;
  if (L >= 1) {
    return solid(lch, 255);
  }
  if (L <= 0) {
    return solid(lch, 0);
  }
  const origin = oklchToLinear(lch);
  const start: [number, number] = [C, L];
  if (inGamutLinear(origin)) {
    return settle(origin, [start]);
  }
  const jnd = 0.02;
  const epsilon = 0.0001;
  let min = 0;
  let max = C;
  let minInGamut = true;
  let chroma = C;
  let current = origin;
  let clipped = clipLinear(origin);
  if (okDistance(clipped, lch) < jnd) {
    return settle(origin, [start]);
  }
  while (max - min > epsilon) {
    chroma = (min + max) / 2;
    current = oklchToLinear([L, chroma, h]);
    if (minInGamut && inGamutLinear(current)) {
      min = chroma;
      continue;
    }
    clipped = clipLinear(current);
    const e = okDistance(clipped, [L, chroma, h]);
    if (e < jnd) {
      if (jnd - e < epsilon) {
        break;
      }
      minInGamut = false;
      min = chroma;
    } else {
      max = chroma;
    }
  }
  return settle(clipped, [start, [chroma, L]]);
};

export {
  MapResult,
  oklchToLinear,
  linearToOklch,
  isInSrgb,
  oklchToXyz,
  oklchToLab,
  clipMap,
  chromaReduceMap,
  css4Map
};
