import type {Vec3} from './space';
import {cmf} from './cie';
import {WAVELENGTHS, D65, edge, gauss, invert3, mulVec} from './spectral';
import type {Matrix, Spectrum} from './spectral';

/**
 * 简化的晶状体光密度模型（示意，不是 CIE 203:2012 的完整公式）。
 * 400nm 处的增长速率取自 Pokorny、Smith 和 Lutze（1987）的摘要：
 * 20~60 岁每十年增加 0.12 个密度单位，60 岁以后每十年增加 0.40。
 * 20 岁的基线密度（0.6）与随波长衰减的尺度（40nm）是为演示而设的假设值，没有对照原表。
 */
const BASE_D400 = 0.6;
const DECAY_NM = 40;
const TAIL = 0.01;

const density400 = (age: number): number => {
  const a = Math.min(80, Math.max(20, age));
  return BASE_D400 + 0.012 * (Math.min(a, 60) - 20) + 0.04 * Math.max(0, a - 60);
};

const lensDensity = (l: number, age: number): number => {
  return density400(age) * Math.exp(-(l - 400) / DECAY_NM) + TAIL;
};

const lensTransmittance = (l: number, age: number): number => 10 ** -lensDensity(l, age);

const HPE: Matrix = [
  [0.38971, 0.68898, -0.07868],
  [-0.22981, 1.18340, 0.04641],
  [0, 0, 1]
];

/** L、M、S 视锥光谱响应：HPE 矩阵作用在 CIE 1931 匹配函数上，负值截为 0 */
const CONES: Spectrum[] = [0, 1, 2].map(row => WAVELENGTHS.map(l => Math.max(0, mulVec(HPE, cmf(l))[row])));

/** 近似 sRGB 三原色的宽带光谱（示意） */
const PRIMARIES: Spectrum[] = [
  WAVELENGTHS.map(l => edge(l, 585, 14)),
  WAVELENGTHS.map(l => gauss(l, 543, 38)),
  WAVELENGTHS.map(l => gauss(l, 455, 22) + 0.02)
];

const coneMatrix = (age: number | null): Matrix => {
  return CONES.map(cone => PRIMARIES.map(prim => {
    let sum = 0;
    WAVELENGTHS.forEach((l, i) => {
      sum += cone[i] * prim[i] * D65[i] * (age === null ? 1 : lensTransmittance(l, age));
    });
    return sum;
  }));
};

const YOUNG_RAW = coneMatrix(null);
const ROW_SUM = YOUNG_RAW.map(row => row[0] + row[1] + row[2]);

/** 线性 sRGB → 视锥响应，行已按“年轻眼睛看白色 = 1”归一化 */
const conesOf = (age: number | null): Matrix => coneMatrix(age).map((row, c) => row.map(v => v / ROW_SUM[c]));

const YOUNG = conesOf(null);
const YOUNG_INV = invert3(YOUNG);

const mul3 = (a: Matrix, b: Matrix): Matrix => {
  return a.map(row => [0, 1, 2].map(j => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));
};

/**
 * 把“老眼睛里的响应”映射回屏幕颜色，使年轻观察者看到的就是老眼睛的感受。
 * adapt 为 0 表示完全没有适应，1 表示视锥增益完全重新归一化（白色仍是白色）。
 */
const agedFilter = (age: number, adapt: number): Matrix => {
  const aged = conesOf(age);
  const white = aged.map(row => row[0] + row[1] + row[2]);
  const gains = white.map(w => (1 / w) ** adapt);
  const scaled = aged.map((row, c) => row.map(v => v * gains[c]));
  return mul3(YOUNG_INV, scaled);
};

const applyMatrix = (m: Matrix, c: Vec3): Vec3 => {
  return [0, 1, 2].map(i => m[i][0] * c[0] + m[i][1] * c[1] + m[i][2] * c[2]) as Vec3;
};

/** 年龄 age 的眼睛里，S 视锥的白色信号相对 20 岁的比例（未适应） */
const sConeSignal = (age: number): number => conesOf(age)[2].reduce((a, b) => a + b, 0);

export {
  density400,
  lensDensity,
  lensTransmittance,
  CONES,
  conesOf,
  agedFilter,
  applyMatrix,
  sConeSignal
};
