import type {Vec3} from './space';
import {srgbToLinear, linearToSrgb, rgbToLab, labToRgb, rgbToOklab, oklabToRgb} from './space';
import {invert3} from './spectral';

/** RGBA，每像素 4 字节，sRGB 编码值 */
interface Img {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

type Space = 'lab' | 'oklab';

interface Stats {
  mean: Vec3;
  std: Vec3;
}

// ---------- 确定性噪声 ----------

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const mixC = (a: Vec3, b: Vec3, t: number): Vec3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const smooth = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const scale = (c: Vec3, k: number): Vec3 => [c[0] * k, c[1] * k, c[2] * k];
const add = (c: Vec3, d: Vec3, k: number): Vec3 => [c[0] + d[0] * k, c[1] + d[1] * k, c[2] + d[2] * k];

const hash = (x: number, y: number, seed: number): number => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

const noise = (x: number, y: number, cell: number, seed: number): number => {
  const gx = x / cell;
  const gy = y / cell;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = smooth(gx - x0);
  const fy = smooth(gy - y0);
  const top = mix(hash(x0, y0, seed), hash(x0 + 1, y0, seed), fx);
  const bottom = mix(hash(x0, y0 + 1, seed), hash(x0 + 1, y0 + 1, seed), fx);
  return mix(top, bottom, fy);
};

const fbm = (x: number, y: number, cell: number, seed: number): number => {
  return 0.6 * noise(x, y, cell, seed) + 0.3 * noise(x, y, cell / 2, seed + 1) + 0.1 * noise(x, y, cell / 4, seed + 2);
};

// ---------- 程序生成的场景 ----------

type PixelFn = (x: number, y: number, u: number, v: number) => Vec3;

const dusk: PixelFn = (x, y, u, v) => {
  const horizon = 0.56;
  const sunX = 0.62;
  const sunY = 0.5;
  if (v < horizon) {
    const t = v / horizon;
    let c = mixC([60, 55, 120], [238, 118, 72], smooth(t ** 1.3));
    c = mixC(c, [255, 205, 120], smooth((t - 0.8) / 0.2));
    const cloud = smooth((fbm(x, y * 3.2, 28, 11) - 0.52) * 4) * smooth(1 - Math.abs(t - 0.55) * 2.2);
    c = mixC(c, [255, 165, 130], cloud * 0.7);
    const d = Math.hypot((u - sunX) * 1.5, v - sunY);
    c = add(c, [110, 80, 30], Math.exp(-(d * d) / 0.012));
    return d < 0.05 ? [255, 238, 185] : c;
  }
  if (v < 0.86) {
    const t = (v - horizon) / (0.86 - horizon);
    let c = mixC([225, 135, 92], [28, 44, 92], smooth(t ** 0.8));
    c = scale(c, 0.8 + 0.4 * fbm(x * 0.6, y * 4, 18, 21));
    const spread = 0.03 + 0.07 * t;
    const glint = Math.exp(-((u - sunX) ** 2) / (spread * spread)) * (0.4 + 0.6 * noise(x, y * 6, 10, 31)) * (1 - t * 0.5);
    return add(c, [255, 190, 110], glint * 0.9);
  }
  const t = (v - 0.86) / 0.14;
  const foam = smooth(1 - Math.abs(t - 0.06 - 0.03 * Math.sin(x * 0.2)) * 18);
  const sand = mixC([150, 110, 98], [205, 165, 122], smooth(t * 1.4));
  return mixC(scale(sand, 0.9 + 0.2 * noise(x, y, 3, 41)), [245, 225, 205], foam * 0.8);
};

const inPine = (u: number, v: number, cx: number, base: number, height: number, halfWidth: number): number => {
  const k = (base - v) / height;
  if (k < 0 || k > 1) {
    return 0;
  }
  const tiers = 0.65 + 0.35 * Math.abs(Math.sin(k * 14));
  return Math.abs(u - cx) < halfWidth * (1 - k) * tiers ? 1 : 0;
};

const snow: PixelFn = (x, y, u, v) => {
  const ridge = 0.36 + 0.07 * Math.sin(u * 7 + 1) + 0.04 * Math.sin(u * 17) + 0.05 * noise(x, 0, 24, 5);
  const groundTop = 0.58;
  if (v < ridge) {
    return mixC([180, 198, 226], [228, 235, 247], smooth(v / ridge));
  }
  if (v < groundTop) {
    const t = (v - ridge) / (groundTop - ridge);
    const rock = mixC([140, 156, 190], [206, 216, 236], smooth(t * 1.2));
    return mixC(rock, [250, 252, 255], smooth((0.35 - t) * 4) * 0.8);
  }
  let c = mixC([232, 240, 252], [168, 188, 224], smooth(fbm(x, y * 2.5, 30, 51) * 1.4 - 0.3));
  c = scale(c, 0.95 + 0.08 * noise(x, y, 3, 61));
  const trees = [[0.12, 0.8, 0.44, 0.07], [0.3, 0.74, 0.34, 0.06], [0.52, 0.86, 0.5, 0.08], [0.76, 0.76, 0.38, 0.065], [0.92, 0.84, 0.46, 0.075]];
  for (const [cx, base, height, half] of trees) {
    if (inPine(u * 1.5, v, cx * 1.5, base, height, half * 1.5)) {
      const frost = noise(x, y, 4, 71);
      c = mixC([28, 62, 72], [214, 228, 240], smooth((frost - 0.55) * 3) * 0.7);
    }
  }
  return c;
};

const forest: PixelFn = (x, y, u, v) => {
  const gap = noise(x, y, 26, 81);
  if (v < 0.4 && gap > 0.68) {
    return mixC([150, 196, 232], [200, 224, 244], smooth(v / 0.4));
  }
  const trunks = [0.14, 0.37, 0.62, 0.86];
  for (const tx of trunks) {
    const w = 0.022 + 0.01 * v;
    const dx = u - (tx + 0.012 * Math.sin(v * 5 + tx * 9));
    if (Math.abs(dx) < w) {
      const lit = 0.75 + 0.25 * Math.cos((dx / w) * 1.4);
      return scale([92, 62, 38], lit * (0.85 + 0.3 * noise(x, y * 0.3, 4, 91)));
    }
  }
  if (v > 0.8) {
    return scale(mixC([52, 76, 34], [38, 54, 28], (v - 0.8) / 0.2), 0.85 + 0.3 * noise(x, y, 3, 101));
  }
  const leaf = fbm(x, y, 12, 111);
  let c = mixC([22, 78, 30], [112, 178, 52], smooth(leaf * 1.5 - 0.2));
  c = scale(c, 0.8 + 0.4 * noise(x, y, 3, 121));
  return add(c, [60, 54, 10], smooth((noise(x * 0.4, y, 40, 131) - 0.7) * 5) * 0.6);
};
const NEON_SIGNS: {x0: number; x1: number; y0: number; y1: number; color: Vec3}[] = [
  {x0: 0.1, x1: 0.34, y0: 0.3, y1: 0.35, color: [255, 40, 180]},
  {x0: 0.42, x1: 0.46, y0: 0.18, y1: 0.55, color: [30, 230, 255]},
  {x0: 0.58, x1: 0.84, y0: 0.4, y1: 0.45, color: [255, 220, 60]},
  {x0: 0.7, x1: 0.74, y0: 0.2, y1: 0.4, color: [255, 40, 180]}
];

const neon: PixelFn = (x, y, u, v) => {
  let c = mixC([6, 8, 28], [38, 16, 56], v);
  const skyline = 0.34 + 0.2 * hash(Math.floor(u * 9), 0, 7) + 0.04 * hash(Math.floor(u * 9), 1, 8);
  if (v > skyline && v < 0.8) {
    c = [12, 12, 26];
    const wx = Math.floor(x / 6);
    const wy = Math.floor(y / 7);
    if (x % 6 < 3 && y % 7 < 4 && hash(wx, wy, 17) > 0.55) {
      c = hash(wx, wy, 18) > 0.5 ? [250, 208, 110] : [120, 190, 235];
    }
  }
  for (const s of NEON_SIGNS) {
    const dx = Math.max(s.x0 - u, 0, u - s.x1);
    const dy = Math.max(s.y0 - v, 0, v - s.y1);
    const d2 = dx * dx * 2.25 + dy * dy;
    c = d2 === 0 ? mixC(c, s.color, 1) : add(c, s.color, 0.55 * Math.exp(-d2 / 0.0016));
  }
  if (v >= 0.8) {
    const t = (v - 0.8) / 0.2;
    c = scale(mixC([20, 20, 36], [8, 8, 18], t), 1);
    for (const s of NEON_SIGNS) {
      const dx = Math.max(s.x0 - u, 0, u - s.x1);
      c = add(c, s.color, 0.35 * Math.exp(-(dx * dx * 2.25) / 0.004) * (0.5 + 0.5 * noise(x * 2, y, 6, 19)) * (1 - t));
    }
  }
  return c;
};

const desert: PixelFn = (x, y, u, v) => {
  const far = 0.46 + 0.08 * Math.sin(u * 5 + 1) + 0.02 * noise(x, 0, 14, 29);
  const near = 0.64 + 0.09 * Math.sin(u * 3.2 + 3) + 0.02 * noise(x, 0, 20, 39);
  if (v < far) {
    return mixC([84, 144, 218], [196, 220, 242], smooth(v / far));
  }
  const grain = 0.94 + 0.12 * noise(x, y, 2, 49);
  if (v < near) {
    const shade = Math.cos(u * 5 + 1) > 0 ? 0.72 : 1;
    return scale(mixC([232, 178, 112], [210, 150, 96], smooth((v - far) / (near - far))), shade * grain);
  }
  const shade = Math.cos(u * 3.2 + 3) > 0 ? 0.74 : 1.02;
  const t = smooth((v - near) / (1 - near));
  return scale(mixC([240, 194, 124], [226, 168, 100], t), shade * grain);
};

const ocean: PixelFn = (x, y, u, v) => {
  const horizon = 0.5;
  if (v < horizon) {
    let c = mixC([52, 112, 200], [176, 214, 246], smooth(v / horizon));
    const cloud = smooth((fbm(x, y * 2.4, 34, 59) - 0.55) * 4) * (1 - v / horizon);
    c = mixC(c, [248, 250, 255], cloud * 0.9);
    return c;
  }
  const t = (v - horizon) / (1 - horizon);
  let c = mixC([34, 108, 176], [8, 44, 104], smooth(t ** 0.7));
  c = scale(c, 0.8 + 0.4 * fbm(x * 0.7, y * 4, 16, 69));
  c = add(c, [200, 230, 255], smooth((noise(x, y * 5, 7, 79) - 0.78) * 6) * 0.5 * (1 - t));
  const boatY = 0.58 - Math.abs(u - 0.7) * 0.9;
  if (Math.abs(u - 0.7) < 0.035 && v > boatY - 0.1 && v < boatY && v > 0.46) {
    return [248, 248, 252];
  }
  return c;
};

const SCENES: {key: string; name: string; fn: PixelFn}[] = [
  {key: 'dusk', name: '暖色黄昏海边', fn: dusk},
  {key: 'snow', name: '冷色雪景', fn: snow},
  {key: 'forest', name: '绿色森林', fn: forest},
  {key: 'neon', name: '夜景霓虹', fn: neon},
  {key: 'desert', name: '沙漠', fn: desert},
  {key: 'ocean', name: '蓝色海天', fn: ocean}
];

const SCENE_W = 240;
const SCENE_H = 160;
const sceneCache = new Map<string, Img>();

const makeScene = (key: string): Img => {
  const cached = sceneCache.get(key);
  if (cached) {
    return cached;
  }
  const scene = SCENES.find(item => item.key === key) || SCENES[0];
  const data = new Uint8ClampedArray(SCENE_W * SCENE_H * 4);
  for (let y = 0; y < SCENE_H; y++) {
    for (let x = 0; x < SCENE_W; x++) {
      const [r, g, b] = scene.fn(x, y, x / SCENE_W, y / SCENE_H);
      const i = (y * SCENE_W + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  const img = {width: SCENE_W, height: SCENE_H, data};
  sceneCache.set(key, img);
  return img;
};

// ---------- 通道统计 ----------

const pixelCount = (img: Img): number => img.width * img.height;

/** 三个通道的值依次排列：[c0, c1, c2, c0, c1, c2, ...] */
type Triples = Float64Array;

const triplesStats = (t: Triples): Stats => {
  const n = t.length / 3;
  const mean: Vec3 = [0, 0, 0];
  for (let i = 0; i < t.length; i++) {
    mean[i % 3] += t[i] / n;
  }
  const variance: Vec3 = [0, 0, 0];
  for (let i = 0; i < t.length; i++) {
    const d = t[i] - mean[i % 3];
    variance[i % 3] += d * d / n;
  }
  return {mean, std: variance.map(Math.sqrt) as Vec3};
};

const correlations = (t: Triples): Vec3 => {
  const n = t.length / 3;
  const {mean, std} = triplesStats(t);
  const pair = (a: number, b: number): number => {
    if (std[a] < 1e-9 || std[b] < 1e-9) {
      return 0;
    }
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += (t[i * 3 + a] - mean[a]) * (t[i * 3 + b] - mean[b]);
    }
    return sum / n / (std[a] * std[b]);
  };
  return [pair(0, 1), pair(0, 2), pair(1, 2)];
};

/** 逐通道把 src 的均值、标准差调成 ref 的；某通道标准差几乎为 0 时只平移不缩放 */
const matchTriples = (src: Triples, ref: Triples): Triples => {
  const s = triplesStats(src);
  const r = triplesStats(ref);
  const gain = s.std.map((v, k) => (v < 1e-9 ? 1 : r.std[k] / v));
  const out = new Float64Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const k = i % 3;
    out[i] = (src[i] - s.mean[k]) * gain[k] + r.mean[k];
  }
  return out;
};
// ---------- 颜色空间：lαβ（Ruderman）----------

/** Reinhard 2001 论文里的线性 RGB → LMS 矩阵 */
const RGB_TO_LMS: number[][] = [
  [0.3811, 0.5783, 0.0402],
  [0.1967, 0.7244, 0.0782],
  [0.0241, 0.1288, 0.8444]
];
const LMS_TO_RGB = invert3(RGB_TO_LMS);
const LOG_EPS = 1e-4;
const SQRT3 = Math.sqrt(3);
const SQRT6 = Math.sqrt(6);
const SQRT2 = Math.sqrt(2);

const DECODE = Array.from({length: 256}, (_, i) => srgbToLinear(i / 255));

const toLab = (img: Img): Triples => {
  const n = pixelCount(img);
  const out = new Float64Array(n * 3);
  for (let p = 0; p < n; p++) {
    const r = DECODE[img.data[p * 4]];
    const g = DECODE[img.data[p * 4 + 1]];
    const b = DECODE[img.data[p * 4 + 2]];
    const L = Math.log10(Math.max(RGB_TO_LMS[0][0] * r + RGB_TO_LMS[0][1] * g + RGB_TO_LMS[0][2] * b, LOG_EPS));
    const M = Math.log10(Math.max(RGB_TO_LMS[1][0] * r + RGB_TO_LMS[1][1] * g + RGB_TO_LMS[1][2] * b, LOG_EPS));
    const S = Math.log10(Math.max(RGB_TO_LMS[2][0] * r + RGB_TO_LMS[2][1] * g + RGB_TO_LMS[2][2] * b, LOG_EPS));
    out[p * 3] = (L + M + S) / SQRT3;
    out[p * 3 + 1] = (L + M - 2 * S) / SQRT6;
    out[p * 3 + 2] = (L - M) / SQRT2;
  }
  return out;
};

/** lαβ → 线性 RGB（未截断） */
const labToLinear = (l: number, a: number, b: number): Vec3 => {
  const L = 10 ** (l / SQRT3 + a / SQRT6 + b / SQRT2);
  const M = 10 ** (l / SQRT3 + a / SQRT6 - b / SQRT2);
  const S = 10 ** (l / SQRT3 - 2 * a / SQRT6);
  return LMS_TO_RGB.map(row => row[0] * L + row[1] * M + row[2] * S) as Vec3;
};

const fromLab = (t: Triples, width: number, height: number): Img => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const lin = labToLinear(t[p * 3], t[p * 3 + 1], t[p * 3 + 2]);
    for (let k = 0; k < 3; k++) {
      data[p * 4 + k] = linearToSrgb(Math.min(1, Math.max(0, lin[k]))) * 255;
    }
    data[p * 4 + 3] = 255;
  }
  return {width, height, data};
};

// ---------- 其他空间 ----------

const toRgbTriples = (img: Img): Triples => {
  const n = pixelCount(img);
  const out = new Float64Array(n * 3);
  for (let p = 0; p < n; p++) {
    out[p * 3] = img.data[p * 4];
    out[p * 3 + 1] = img.data[p * 4 + 1];
    out[p * 3 + 2] = img.data[p * 4 + 2];
  }
  return out;
};

const fromRgbTriples = (t: Triples, width: number, height: number): Img => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    data[p * 4] = t[p * 3];
    data[p * 4 + 1] = t[p * 3 + 1];
    data[p * 4 + 2] = t[p * 3 + 2];
    data[p * 4 + 3] = 255;
  }
  return {width, height, data};
};

const SPACES = {
  lab: {forward: rgbToLab, inverse: labToRgb},
  oklab: {forward: rgbToOklab, inverse: oklabToRgb}
};

const toSpace = (img: Img, space: Space): Triples => {
  const n = pixelCount(img);
  const out = new Float64Array(n * 3);
  for (let p = 0; p < n; p++) {
    const c = SPACES[space].forward([img.data[p * 4], img.data[p * 4 + 1], img.data[p * 4 + 2]]);
    out[p * 3] = c[0];
    out[p * 3 + 1] = c[1];
    out[p * 3 + 2] = c[2];
  }
  return out;
};

const fromSpace = (t: Triples, space: Space, width: number, height: number): Img => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const rgb = SPACES[space].inverse([t[p * 3], t[p * 3 + 1], t[p * 3 + 2]]).rgb;
    data[p * 4] = rgb[0];
    data[p * 4 + 1] = rgb[1];
    data[p * 4 + 2] = rgb[2];
    data[p * 4 + 3] = 255;
  }
  return {width, height, data};
};

// ---------- 三种迁移方法 ----------

/** Reinhard 2001：线性光 → LMS → log → lαβ，逐通道匹配均值与标准差 */
const transferReinhard = (src: Img, ref: Img): Img => {
  return fromLab(matchTriples(toLab(src), toLab(ref)), src.width, src.height);
};

/** 直接在 sRGB 编码值上逐通道匹配 */
const transferRgb = (src: Img, ref: Img): Img => {
  return fromRgbTriples(matchTriples(toRgbTriples(src), toRgbTriples(ref)), src.width, src.height);
};

/** 在 CIELAB 或 OKLab 里逐通道匹配 */
const transferSpace = (src: Img, ref: Img, space: Space): Img => {
  return fromSpace(matchTriples(toSpace(src, space), toSpace(ref, space)), space, src.width, src.height);
};

/** strength = 0 是原图，1 是完整结果；在输出的 sRGB 码值上线性混合 */
const blend = (src: Img, out: Img, strength: number): Img => {
  const data = new Uint8ClampedArray(src.data.length);
  for (let i = 0; i < data.length; i++) {
    data[i] = i % 4 === 3 ? 255 : src.data[i] + (out.data[i] - src.data[i]) * strength;
  }
  return {width: src.width, height: src.height, data};
};

/** Reinhard 迁移后有多少比例的像素超出 sRGB 范围（会被截断） */
const reinhardClipShare = (src: Img, ref: Img): number => {
  const t = matchTriples(toLab(src), toLab(ref));
  const n = t.length / 3;
  let clipped = 0;
  for (let p = 0; p < n; p++) {
    const lin = labToLinear(t[p * 3], t[p * 3 + 1], t[p * 3 + 2]);
    if (lin.some(v => !(v >= 0 && v <= 1))) {
      clipped++;
    }
  }
  return clipped / n;
};

const labStats = (img: Img): Stats => triplesStats(toLab(img));
const rgbCorrelations = (img: Img): Vec3 => correlations(toRgbTriples(img));
const labCorrelations = (img: Img): Vec3 => correlations(toLab(img));

export {
  Img,
  Space,
  Stats,
  SCENES,
  SCENE_W,
  SCENE_H,
  makeScene,
  transferReinhard,
  transferRgb,
  transferSpace,
  blend,
  reinhardClipShare,
  labStats,
  rgbCorrelations,
  labCorrelations
};
