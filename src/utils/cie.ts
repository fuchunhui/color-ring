import {Vec3, xyzToLinear, linearToSrgb} from './space';

type Point = [number, number];

const gauss = (l: number, mu: number, s1: number, s2: number): number => {
  const t = (l - mu) / (l < mu ? s1 : s2);
  return Math.exp(-0.5 * t * t);
};

/** CIE 1931 2° 颜色匹配函数（Wyman–Sloan–Shirley 2013 多瓣解析拟合） */
const cmf = (l: number): Vec3 => [
  1.056 * gauss(l, 599.8, 37.9, 31.0) + 0.362 * gauss(l, 442.0, 16.0, 26.7) - 0.065 * gauss(l, 501.1, 20.4, 26.2),
  0.821 * gauss(l, 568.8, 46.9, 40.5) + 0.286 * gauss(l, 530.9, 16.3, 31.1),
  1.217 * gauss(l, 437.0, 11.8, 36.0) + 0.681 * gauss(l, 459.0, 26.0, 13.8)
];

/** CIE 1931 2° 光谱轨迹色度坐标，380~700nm，每 10nm 一个点（标准表值） */
const LOCUS_TABLE: Point[] = [
  [0.1741, 0.0050], [0.1738, 0.0049], [0.1733, 0.0048], [0.1726, 0.0048],
  [0.1714, 0.0051], [0.1689, 0.0069], [0.1644, 0.0109], [0.1566, 0.0177],
  [0.1440, 0.0297], [0.1241, 0.0578], [0.0913, 0.1327], [0.0454, 0.2950],
  [0.0082, 0.5384], [0.0139, 0.7502], [0.0743, 0.8338], [0.1547, 0.8059],
  [0.2296, 0.7543], [0.3016, 0.6923], [0.3731, 0.6245], [0.4441, 0.5547],
  [0.5125, 0.4866], [0.5752, 0.4242], [0.6270, 0.3725], [0.6658, 0.3340],
  [0.6915, 0.3083], [0.7079, 0.2920], [0.7190, 0.2809], [0.7260, 0.2740],
  [0.7300, 0.2700], [0.7320, 0.2680], [0.7334, 0.2666], [0.7344, 0.2656],
  [0.7347, 0.2653]
];

const LOCUS_START = 380;
const LOCUS_STEP = 10;

/** 单色光的色度坐标：对标准表做 Catmull-Rom 插值，380nm 以下、700nm 以上取端点 */
const locusXy = (l: number): Point => {
  const pos = (Math.min(700, Math.max(380, l)) - LOCUS_START) / LOCUS_STEP;
  const i = Math.min(LOCUS_TABLE.length - 2, Math.floor(pos));
  const t = pos - i;
  const p0 = LOCUS_TABLE[Math.max(0, i - 1)];
  const p1 = LOCUS_TABLE[i];
  const p2 = LOCUS_TABLE[i + 1];
  const p3 = LOCUS_TABLE[Math.min(LOCUS_TABLE.length - 1, i + 2)];
  const spline = (a: number, b: number, c: number, d: number) => {
    return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t ** 3);
  };
  return [spline(p0[0], p1[0], p2[0], p3[0]), spline(p0[1], p1[1], p2[1], p3[1])];
};

/** 单色光的 XYZ：色度取标准轨迹表（解析拟合在两端偏差大），亮度取拟合的 ȳ */
const wavelengthToXyz = (l: number): Vec3 => {
  const [x, y] = locusXy(l);
  const lum = Math.max(cmf(l)[1], 1e-6);
  const xyz = xyToXyz(x, y);
  return [xyz[0] * lum, lum, xyz[2] * lum];
};

const xyzToXy = ([x, y, z]: Vec3): Point => {
  const sum = x + y + z;
  return sum ? [x / sum, y / sum] : [0, 0];
};

/** 色度坐标 (x, y) 转 XYZ，约定 Y = 1 */
const xyToXyz = (x: number, y: number): Vec3 => [x / y, 1, (1 - x - y) / y];

const C2 = 1.4388e-2;

/** 黑体光谱辐射度（相对值）。l 为波长 nm，t 为开尔文温度 */
const planck = (l: number, t: number): number => {
  const lm = l * 1e-9;
  return (560e-9 / lm) ** 5 / (Math.exp(C2 / (lm * t)) - 1);
};

const blackbodyCache = new Map<number, Vec3>();

/** 黑体辐射颜色的 XYZ，按 Y = 1 归一化 */
const blackbodyXyz = (t: number): Vec3 => {
  const cached = blackbodyCache.get(t);
  if (cached) {
    return cached;
  }
  let x = 0;
  let y = 0;
  let z = 0;
  for (let l = 380; l <= 780; l += 5) {
    const p = planck(l, t);
    const [cx, cy, cz] = cmf(l);
    x += p * cx;
    y += p * cy;
    z += p * cz;
  }
  const result: Vec3 = [x / y, 1, z / y];
  blackbodyCache.set(t, result);
  return result;
};

/**
 * XYZ 转显示用 sRGB：色域外的颜色向白色去饱和，再按最大通道归一化。
 */
const xyzToDisplayRgb = (xyz: Vec3): Vec3 => {
  let linear = xyzToLinear(xyz);
  const min = Math.min(...linear);
  if (min < 0) {
    linear = linear.map(v => v - min) as Vec3;
  }
  const max = Math.max(...linear);
  if (max <= 0) {
    return [0, 0, 0];
  }
  return linear.map(v => {
    const encoded = linearToSrgb(v / max);
    return Math.round(Math.min(1, Math.max(0, encoded)) * 255);
  }) as Vec3;
};

/**
 * XYZ 转显示用 sRGB（色域外直接截断负值，保持高饱和，适合光谱色带）。
 */
const xyzToClipRgb = (xyz: Vec3): Vec3 => {
  const linear = xyzToLinear(xyz).map(v => Math.max(0, v));
  const max = Math.max(...linear);
  if (max <= 0) {
    return [0, 0, 0];
  }
  return linear.map(v => Math.round(Math.min(1, linearToSrgb(v / max)) * 255)) as Vec3;
};

const toHex = (rgb: Vec3): string => {
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
};

/** 光谱轨迹（马蹄形边界），从 start 到 end 每 step nm 一个点 */
const spectralLocus = (start = 380, end = 700, step = 1): Point[] => {
  const points: Point[] = [];
  for (let l = start; l <= end; l += step) {
    points.push(locusXy(l));
  }
  return points;
};

const pointInPolygon = ([px, py]: Point, polygon: Point[]): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

interface Gamut {
  key: string;
  label: string;
  color: string;
  points: [Point, Point, Point];
}

const GAMUTS: Gamut[] = [
  {
    key: 'srgb',
    label: 'sRGB',
    color: '#111111',
    points: [[0.64, 0.33], [0.30, 0.60], [0.15, 0.06]]
  },
  {
    key: 'p3',
    label: 'Display P3',
    color: '#D9480F',
    points: [[0.680, 0.320], [0.265, 0.690], [0.150, 0.060]]
  },
  {
    key: 'rec2020',
    label: 'Rec.2020',
    color: '#1971C2',
    points: [[0.708, 0.292], [0.170, 0.797], [0.131, 0.046]]
  }
];

const D65: Point = [0.3127, 0.3290];

export {
  Point,
  Gamut,
  GAMUTS,
  D65,
  cmf,
  locusXy,
  wavelengthToXyz,
  xyzToXy,
  xyToXyz,
  planck,
  blackbodyXyz,
  xyzToDisplayRgb,
  xyzToClipRgb,
  toHex,
  spectralLocus,
  pointInPolygon
};
