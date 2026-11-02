import type {Vec3} from './space';
import {linearToSrgb, rgbToLab} from './space';
import {invert3} from './spectral';

/** 单层成色染料的最大密度 */
const D_MAX = 2;
/** 中段对比度：密度随 log10 曝光的斜率（示意值，彩色负片大约在 0.6~0.7） */
const GAMMA = 0.65;
const SLOPE = 4 * GAMMA / D_MAX;
/** 18% 灰落在特性曲线的正中间 */
const X0 = Math.log10(0.18);
/** 片基加灰雾的中性密度 */
const FOG = 0.08;

/**
 * 每个染料每 1.0 成色密度，在 R、G、B 三个测量通道上的密度。
 * 行是测量通道 R、G、B，列是青、品红、黄。除对角线外都是“多余吸收”，
 * 数字是为了演示编的，不是柯达或富士的数据。
 */
const DYE_MATRIX: number[][] = [
  [1, 0.05, 0],
  [0.16, 1, 0.04],
  [0.06, 0.32, 1]
];

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** 对数曝光 x = log10(E) → 单层成色密度 */
const dyeDensity = (x: number): number => D_MAX / (1 + Math.exp(-SLOPE * (x - X0)));

/** 成色密度 → 对数曝光，D 贴近 0 或 D_MAX 时截断（曲线的趾部和肩部没有信息） */
const exposureLog = (density: number): number => {
  const p = Math.min(0.998, Math.max(0.002, density / D_MAX));
  return X0 + Math.log(p / (1 - p)) / SLOPE;
};

const exposeLog = (e: number): number => Math.log10(Math.max(e, 1e-4));

/**
 * 三层染料密度 [青, 品红, 黄] → 三个测量通道的总密度。
 * mask 是橙罩浓度（1 = 恰好抵消品红对蓝、青对绿的多余吸收）：
 * 品红层里的黄色耦合剂、青层里的粉红色耦合剂，成色的地方被消耗掉，没成色的地方留下，
 * 所以耦合剂剩下的密度 = mask × 多余吸收 × (D_MAX − 成色密度)。
 */
const measure = (dyes: Vec3, mask: number): Vec3 => {
  const [c, m, y] = dyes;
  const M = DYE_MATRIX;
  return [
    FOG + M[0][0] * c + M[0][1] * m + M[0][2] * y,
    FOG + mask * M[1][0] * D_MAX + (1 - mask) * M[1][0] * c + M[1][1] * m + M[1][2] * y,
    FOG + mask * M[2][1] * D_MAX + M[2][0] * c + (1 - mask) * M[2][1] * m + M[2][2] * y
  ];
};

/** 没有曝光的片基（也就是胶片边缘那条橙色）的三通道密度 */
const baseDensity = (mask: number): Vec3 => measure([0, 0, 0], mask);

const toTransmission = (d: Vec3): Vec3 => d.map(v => 10 ** -v) as Vec3;

const toByte = (v: number): number => Math.round(clamp01(linearToSrgb(clamp01(v))) * 255);

/** 线性光 → 透过胶片后的三通道密度。三个输入通道各自驱动一层染料 */
const exposeFilm = (linear: Vec3, mask: number): Vec3 => {
  const dyes = linear.map(e => dyeDensity(exposeLog(e))) as Vec3;
  return measure(dyes, mask);
};

/** 片基在灯箱上的颜色 */
const baseRgb = (mask: number): Vec3 => toTransmission(baseDensity(mask)).map(toByte) as Vec3;

/** 负片本身在灯箱上的样子（透过率当作线性光） */
const negativeRgb = (linear: Vec3, mask: number): Vec3 => toTransmission(exposeFilm(linear, mask)).map(toByte) as Vec3;

type PrintMode = 'invert' | 'base' | 'matrix';

/** 扫描软件假设的矩阵：橙罩已经抵消掉的两项不再校正 */
const assumedMatrix = (mask: number): number[][] => {
  return DYE_MATRIX.map((row, k) => row.map((v, j) => {
    if ((k === 1 && j === 0) || (k === 2 && j === 1)) {
      return v * (1 - mask);
    }
    return v;
  }));
};

const matrixCache = new Map<number, number[][]>();

const inverseOf = (mask: number): number[][] => {
  const key = Math.round(mask * 1000);
  let inv = matrixCache.get(key);
  if (!inv) {
    inv = invert3(assumedMatrix(mask));
    matrixCache.set(key, inv);
  }
  return inv;
};

/**
 * 把负片还原成正像（返回 0~255 的 sRGB）。
 * invert：把扫描出来的 sRGB 图像直接反色（255 − 码值），相当于修图软件里的“反相”；
 * base：先减掉“假定的片基密度”（相当于在片基上取白点），再沿特性曲线反推曝光；
 * matrix：在 base 之外，再用假定的染料矩阵反解，去掉剩下的多余吸收。
 * assumedMask 是扫描时假设的橙罩浓度，不一定等于胶片真实的浓度。
 */
const makePrinter = (mode: PrintMode, assumedMask: number): ((d: Vec3) => Vec3) => {
  const base = baseDensity(assumedMask);
  const inv = inverseOf(assumedMask);
  return (d: Vec3): Vec3 => {
    if (mode === 'invert') {
      return toTransmission(d).map(t => 255 - toByte(t)) as Vec3;
    }
    const r: Vec3 = [d[0] - base[0], d[1] - base[1], d[2] - base[2]];
    const dyes: Vec3 = mode === 'matrix'
      ? [0, 1, 2].map(k => inv[k][0] * r[0] + inv[k][1] * r[1] + inv[k][2] * r[2]) as Vec3
      : r;
    return dyes.map(v => toByte(10 ** exposureLog(v))) as Vec3;
  };
};

/** 中性灰（三通道曝光相同）在测量通道上，18% 灰附近的斜率 */
const midSlopes = (mask: number): Vec3 => {
  const dx = 0.3;
  const lo = measure([dyeDensity(X0 - dx), dyeDensity(X0 - dx), dyeDensity(X0 - dx)], mask);
  const hi = measure([dyeDensity(X0 + dx), dyeDensity(X0 + dx), dyeDensity(X0 + dx)], mask);
  return [0, 1, 2].map(k => (hi[k] - lo[k]) / (2 * dx)) as Vec3;
};

const GRAY_LEVELS = [0.04, 0.09, 0.18, 0.36, 0.6, 0.9];

/** 一组中性灰经过胶片再还原后的平均色度 C*，越接近 0 越中性 */
const grayCast = (filmMask: number, mode: PrintMode, assumedMask: number): number => {
  const print = makePrinter(mode, assumedMask);
  let sum = 0;
  GRAY_LEVELS.forEach(v => {
    const [, a, b] = rgbToLab(print(exposeFilm([v, v, v], filmMask)));
    sum += Math.hypot(a, b);
  });
  return sum / GRAY_LEVELS.length;
};

export {
  D_MAX,
  GAMMA,
  X0,
  FOG,
  DYE_MATRIX,
  dyeDensity,
  exposureLog,
  measure,
  baseDensity,
  exposeFilm,
  baseRgb,
  negativeRgb,
  makePrinter,
  midSlopes,
  grayCast,
  toTransmission,
  toByte
};
export type {PrintMode};
