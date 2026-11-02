import type {Vec3} from './space';
import {planck, xyzToXy, xyzToDisplayRgb, toHex} from './cie';
import {WAVELENGTHS, D65, blackbody, spectrumXyz, adaptXyz, xyzToSrgb, rgbHex} from './spectral';
import type {Spectrum} from './spectral';
import {xyToCctDuv, planckianUv} from './colorimetry';

/** c2 = 1.4388e-2 m·K，换成 nm·K */
const C2_NM_K = 1.4388e7;
const MIRED_MIN_OUT = 50;
const TEMP_MIN = 1800;
const TEMP_MAX = 10000;

const toMired = (kelvin: number): number => 1e6 / kelvin;
const toKelvin = (mired: number): number => 1e6 / mired;

/** 滤镜平移 deltaM 迈尔德之后的色温；结果超出 [MIRED_MIN_OUT, ∞) 时返回 null */
const shiftedKelvin = (kelvin: number, deltaM: number): number | null => {
  const m = toMired(kelvin) + deltaM;
  return m >= MIRED_MIN_OUT ? toKelvin(m) : null;
};

const peakOne = (values: Spectrum): Spectrum => {
  const max = Math.max(...values);
  return max > 0 ? values.map(v => v / max) : values.map(() => 0);
};

/**
 * 近似“黑体到黑体”的滤镜：普朗克定律在可见光波段近似为 Wien 形式，
 * 两个黑体光谱之比 ≈ exp(-c2/λ · (1/T2 - 1/T1)) = exp(-14.388 · ΔM / λ)（λ 单位 nm）
 */
const wienFilter = (deltaM: number): Spectrum => {
  return peakOne(WAVELENGTHS.map(l => Math.exp(-C2_NM_K * 1e-6 * deltaM / l)));
};

/** 精确的普朗克比值：S(T2) / S(T1)，归一到最大透过率为 1 */
const planckRatioFilter = (t1: number, t2: number): Spectrum => {
  return peakOne(WAVELENGTHS.map(l => planck(l, t2) / planck(l, t1)));
};

const multiply = (a: Spectrum, b: Spectrum): Spectrum => a.map((v, i) => v * b[i]);

interface Chromaticity {
  xyz: Vec3;
  cct: number;
  duv: number;
}

const chromaticityOf = (spd: Spectrum): Chromaticity => {
  const xyz = spectrumXyz(spd);
  const {cct, duv} = xyToCctDuv(xyzToXy(xyz));
  return {xyz, cct, duv};
};

interface ShiftResult {
  mIn: number;
  mOut: number;
  tOut: number | null;
  /** Wien 近似滤镜作用后的光谱（归一到峰值 1） */
  spd: Spectrum;
  filter: Spectrum;
  exactFilter: Spectrum | null;
  result: Chromaticity | null;
  errMired: number | null;
}

const applyShift = (kelvin: number, deltaM: number): ShiftResult => {
  const mIn = toMired(kelvin);
  const tOut = shiftedKelvin(kelvin, deltaM);
  const source = blackbody(kelvin);
  const filter = wienFilter(deltaM);
  const spd = peakOne(multiply(source, filter));
  if (tOut === null) {
    return {mIn, mOut: mIn + deltaM, tOut, spd, filter, exactFilter: null, result: null, errMired: null};
  }
  const result = chromaticityOf(spd);
  return {
    mIn,
    mOut: mIn + deltaM,
    tOut,
    spd,
    filter,
    exactFilter: planckRatioFilter(kelvin, tOut),
    result,
    errMired: toMired(result.cct) - toMired(tOut)
  };
};

/** 沿 2000–10000 K 取 n 个点：kelvin 等间隔，或迈尔德等间隔 */
const scaleTemps = (kind: 'kelvin' | 'mired', n: number, lo = 2000, hi = 10000): number[] => {
  const steps = Math.max(2, n);
  if (kind === 'kelvin') {
    return Array.from({length: steps}, (_, i) => lo + (hi - lo) * i / (steps - 1));
  }
  const mLo = toMired(hi);
  const mHi = toMired(lo);
  return Array.from({length: steps}, (_, i) => toKelvin(mHi - (mHi - mLo) * i / (steps - 1)));
};

/** 相邻两点在 CIE 1960 (u, v) 上的距离 */
const stepDistances = (temps: number[]): number[] => {
  const uv = temps.map(planckianUv);
  return uv.slice(1).map((p, i) => Math.hypot(p[0] - uv[i][0], p[1] - uv[i][1]));
};

const spread = (values: number[]): number => {
  const min = Math.min(...values);
  return min > 0 ? Math.max(...values) / min : Infinity;
};

/** 光源本身的颜色：只表现色度（按最大通道归一） */
const lightHex = (xyz: Vec3): string => toHex(xyzToDisplayRgb(xyz));

const WHITE_D65 = spectrumXyz(D65);

/**
 * 一张反射率为 gray 的灰卡，在光谱 spd 下，经过“按 wb 白点做白平衡”之后的显示颜色。
 * 用 Bradford 把 wb 白点换到 D65 白点，再转成 sRGB。
 */
const balancedHex = (spd: Spectrum, wbSpd: Spectrum, gray = 0.4): string => {
  const card = spectrumXyz(spd).map(v => v * gray) as Vec3;
  const adapted = adaptXyz(card, spectrumXyz(wbSpd), WHITE_D65);
  return rgbHex(xyzToSrgb(adapted));
};

interface FilterItem {
  key: string;
  name: string;
  shift: number;
  note: string;
}

/** 常见滤镜的典型迈尔德平移值，各厂家略有差别 */
const FILTERS: FilterItem[] = [
  {key: '80A', name: 'Wratten 80A', shift: -131, note: '3200 → 5500 K，日光型胶片在钨丝灯下'},
  {key: '80B', name: 'Wratten 80B', shift: -112, note: '3400 → 5500 K'},
  {key: '80C', name: 'Wratten 80C', shift: -81, note: '3800 → 5500 K'},
  {key: '80D', name: 'Wratten 80D', shift: -56, note: '4200 → 5500 K'},
  {key: '82C', name: 'Wratten 82C', shift: -45, note: '浅蓝，微调偏暖的光'},
  {key: '82B', name: 'Wratten 82B', shift: -32, note: '浅蓝'},
  {key: '82A', name: 'Wratten 82A', shift: -18, note: '浅蓝'},
  {key: '82', name: 'Wratten 82', shift: -10, note: '极浅蓝'},
  {key: '81', name: 'Wratten 81', shift: 9, note: '极浅橙'},
  {key: '81A', name: 'Wratten 81A', shift: 18, note: '浅橙，阴天或阴影下略微加暖'},
  {key: '81B', name: 'Wratten 81B', shift: 27, note: '浅橙'},
  {key: '81C', name: 'Wratten 81C', shift: 35, note: '浅橙'},
  {key: '81D', name: 'Wratten 81D', shift: 42, note: '浅橙'},
  {key: '81EF', name: 'Wratten 81EF', shift: 52, note: '浅橙'},
  {key: '85C', name: 'Wratten 85C', shift: 81, note: '5500 → 3800 K'},
  {key: '85', name: 'Wratten 85', shift: 112, note: '5500 → 3400 K'},
  {key: '85B', name: 'Wratten 85B', shift: 131, note: '5500 → 3200 K，钨丝灯型胶片在日光下'},
  {key: 'cto', name: '整张 CTO 色片', shift: 131, note: '灯光色片，按 +131 近似'},
  {key: 'cto2', name: '1/2 CTO', shift: 81, note: '按 +81 近似'},
  {key: 'cto4', name: '1/4 CTO', shift: 42, note: '按 +42 近似'},
  {key: 'ctb', name: '整张 CTB 色片', shift: -131, note: '灯光色片，按 -131 近似'},
  {key: 'ctb2', name: '1/2 CTB', shift: -81, note: '按 -81 近似'},
  {key: 'ctb4', name: '1/4 CTB', shift: -42, note: '按 -42 近似'}
];

const WB_OPTIONS = [
  {value: 2800, label: '2800 K 白炽灯'},
  {value: 3200, label: '3200 K 影视钨丝灯'},
  {value: 4300, label: '4300 K 荧光灯 / 暖白'},
  {value: 5500, label: '5500 K 日光'},
  {value: 6500, label: '6500 K 阴天 / 屏幕'}
];

const MODEL_SHIFTS = [-200, -131, -81, -42, 42, 81, 131, 200];

export {
  TEMP_MIN,
  TEMP_MAX,
  MIRED_MIN_OUT,
  FILTERS,
  WB_OPTIONS,
  MODEL_SHIFTS,
  toMired,
  toKelvin,
  shiftedKelvin,
  wienFilter,
  planckRatioFilter,
  applyShift,
  scaleTemps,
  stepDistances,
  spread,
  lightHex,
  balancedHex,
  chromaticityOf,
  peakOne,
  ShiftResult,
  FilterItem,
  Chromaticity
};
