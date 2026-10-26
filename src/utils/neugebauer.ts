import {D65, WAVELENGTHS, edge, gauss, spectrumXyz, xyzToSrgb} from './spectral';
import type {Spectrum} from './spectral';
import type {Vec3} from './space';

/** Neugebauer 原色：纸白、三种单色油墨、三种双色叠印、三色叠印 */
const PRIMARY_KEYS = ['W', 'C', 'M', 'Y', 'CM', 'CY', 'MY', 'CMY'] as const;
type PrimaryKey = typeof PRIMARY_KEYS[number];

const PRIMARY_LABELS: Record<PrimaryKey, string> = {
  W: '纸白',
  C: '青',
  M: '品红',
  Y: '黄',
  CM: '青+品红',
  CY: '青+黄',
  MY: '品红+黄',
  CMY: '三色叠印'
};

/** 以下油墨透射率、纸张反射率都是平滑的示意函数，不是实测数据 */
const PAPER: Spectrum = WAVELENGTHS.map(() => 0.92);

const T_CYAN: Spectrum = WAVELENGTHS.map(l => (0.03 + 0.95 * (1 - edge(l, 580, 20))) * (1 - 0.3 * gauss(l, 540, 45)));

const T_MAGENTA: Spectrum = WAVELENGTHS.map(l => {
  const band = edge(l, 495, 12) - edge(l, 590, 14);
  return Math.max(0.03, 1 - 0.96 * band);
});

const T_YELLOW: Spectrum = WAVELENGTHS.map(l => 0.03 + 0.95 * edge(l, 505, 10));

const product = (...parts: Spectrum[]): Spectrum => WAVELENGTHS.map((_, i) => parts.reduce((p, s) => p * s[i], 1));

const PRIMARIES: Record<PrimaryKey, Spectrum> = {
  W: PAPER,
  C: product(PAPER, T_CYAN),
  M: product(PAPER, T_MAGENTA),
  Y: product(PAPER, T_YELLOW),
  CM: product(PAPER, T_CYAN, T_MAGENTA),
  CY: product(PAPER, T_CYAN, T_YELLOW),
  MY: product(PAPER, T_MAGENTA, T_YELLOW),
  CMY: product(PAPER, T_CYAN, T_MAGENTA, T_YELLOW)
};

/** Demichel 权重：网点随机叠印时，8 种组合各占的面积比例 */
const demichel = (c: number, m: number, y: number): Record<PrimaryKey, number> => ({
  W: (1 - c) * (1 - m) * (1 - y),
  C: c * (1 - m) * (1 - y),
  M: (1 - c) * m * (1 - y),
  Y: (1 - c) * (1 - m) * y,
  CM: c * m * (1 - y),
  CY: c * (1 - m) * y,
  MY: (1 - c) * m * y,
  CMY: c * m * y
});

/** Neugebauer（n = 1）与 Yule–Nielsen 修正（n > 1）：R^(1/n) = Σ w_i · R_i^(1/n) */
const predictSpectrum = (c: number, m: number, y: number, n: number): Spectrum => {
  const w = demichel(c, m, y);
  return WAVELENGTHS.map((_, i) => {
    const sum = PRIMARY_KEYS.reduce((s, k) => s + w[k] * PRIMARIES[k][i] ** (1 / n), 0);
    return sum ** n;
  });
};

const spectrumColor = (r: Spectrum): Vec3 => xyzToSrgb(spectrumXyz(D65, r));

const luminanceFactor = (r: Spectrum): number => spectrumXyz(D65, r)[1];

const PRIMARY_COLORS: Record<PrimaryKey, Vec3> = PRIMARY_KEYS.reduce((acc, k) => {
  acc[k] = spectrumColor(PRIMARIES[k]);
  return acc;
}, {} as Record<PrimaryKey, Vec3>);

/** 机械网点扩大：标称面积 a → 实际面积 a + g·4a(1−a)，50% 处增加 g */
const mechanicalGain = (a: number, g: number): number => Math.min(1, Math.max(0, a + g * 4 * a * (1 - a)));

const clampCode = (v: number): number => Math.min(255, Math.max(0, Math.round(v)));

/** 把 8 种原色的 sRGB 值按面积加权平均（在 sRGB 数值里做 Neugebauer） */
const naiveColor = (c: number, m: number, y: number): Vec3 => {
  const w = demichel(c, m, y);
  return [0, 1, 2].map(ch => clampCode(PRIMARY_KEYS.reduce((s, k) => s + w[k] * PRIMARY_COLORS[k][ch], 0))) as Vec3;
};

/** 把 1 − RGB 当作 CMY：青 = 1 − R，……（本项目“印刷四色”页的简化做法） */
const invertColor = (c: number, m: number, y: number): Vec3 => {
  return [clampCode(255 * (1 - c)), clampCode(255 * (1 - m)), clampCode(255 * (1 - y))];
};

/** 青色油墨按面积 a 的反射率光谱（可带 Yule–Nielsen 修正），用于网点扩大曲线 */
const cyanSpectrum = (a: number, n: number): Spectrum => {
  return WAVELENGTHS.map((_, i) => (a * PRIMARIES.C[i] ** (1 / n) + (1 - a) * PAPER[i] ** (1 / n)) ** n);
};

/** Murray–Davies 表观网点面积：由明度因子反推 */
const apparentArea = (a: number, n: number): number => {
  const yp = luminanceFactor(PAPER);
  const ys = luminanceFactor(PRIMARIES.C);
  const y = luminanceFactor(cyanSpectrum(a, n));
  return (yp - y) / (yp - ys);
};

export {
  PRIMARY_KEYS,
  PRIMARY_LABELS,
  PRIMARIES,
  PRIMARY_COLORS,
  PAPER,
  T_CYAN,
  T_MAGENTA,
  T_YELLOW,
  demichel,
  predictSpectrum,
  spectrumColor,
  luminanceFactor,
  mechanicalGain,
  naiveColor,
  invertColor,
  cyanSpectrum,
  apparentArea
};
export type {PrimaryKey};
