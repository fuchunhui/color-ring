import {Vec3} from './space';
import {WAVELENGTHS, D65, spectrumXyz, xyzToSrgb} from './spectral';
import type {Spectrum} from './spectral';

const RAD = Math.PI / 180;
const COS_MIN = 1e-6;

interface Layer {
  n: number;
  d: number;
}

type Polarization = 's' | 'p';
type PolarizationMode = Polarization | 'avg';

const cosIn = (n: number, sinT: number): number => Math.sqrt(Math.max(COS_MIN * COS_MIN, 1 - (sinT / n) ** 2));

/**
 * 特征矩阵（传输矩阵）法：入射介质折射率 n0（默认空气），逐层相乘，末端是折射率 ns 的衬底。
 * 每层 M = [[cosδ, i·sinδ/η], [i·η·sinδ, cosδ]]，δ = 2π·n·d·cosθ / λ，
 * η 对 s 光为 n·cosθ，对 p 光为 n/cosθ。乘积始终是 [[A, iB], [iC, D]] 的形式，A~D 全是实数。
 */
const reflectanceAt = (layers: Layer[], ns: number, lambda: number, thetaDeg: number, pol: Polarization, n0 = 1): number => {
  const sinT = n0 * Math.sin(thetaDeg * RAD);
  const admittance = (n: number, cos: number): number => (pol === 's' ? n * cos : n / cos);
  let A = 1;
  let B = 0;
  let C = 0;
  let D = 1;
  for (const {n, d} of layers) {
    const cos = cosIn(n, sinT);
    const delta = 2 * Math.PI * n * d * cos / lambda;
    const a = Math.cos(delta);
    const s = Math.sin(delta);
    const eta = admittance(n, cos);
    const b = s / eta;
    const c = s * eta;
    const nA = A * a - B * c;
    const nB = A * b + B * a;
    const nC = C * a + D * c;
    const nD = D * a - C * b;
    A = nA;
    B = nB;
    C = nC;
    D = nD;
  }
  const eta0 = admittance(n0, cosIn(n0, sinT));
  const etaS = admittance(ns, cosIn(ns, sinT));
  const nr = eta0 * A - D * etaS;
  const ni = eta0 * B * etaS - C;
  const dr = eta0 * A + D * etaS;
  const di = eta0 * B * etaS + C;
  return (nr * nr + ni * ni) / (dr * dr + di * di);
};

/** 一次性散列，让“随机”的层厚起伏每次重绘都一样 */
const hash01 = (seed: number): number => {
  let t = (seed + 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const ENSEMBLE = 10;

const jittered = (layers: Layer[], jitter: number, k: number): Layer[] => {
  return layers.map((layer, j) => ({n: layer.n, d: layer.d * (1 + jitter * (2 * hash01(k * 1009 + j * 31 + 7) - 1))}));
};

/**
 * 叠层的反射光谱。jitter > 0 时每层厚度各自随机起伏 ±jitter，取 ENSEMBLE 组随机叠层的平均，
 * 相当于许多互不相干的小区域叠在一起（强度相加，不是振幅相加）。
 */
const stackSpectrum = (layers: Layer[], ns: number, thetaDeg: number, mode: PolarizationMode, jitter = 0): Spectrum => {
  const count = jitter > 0 ? ENSEMBLE : 1;
  const out = WAVELENGTHS.map(() => 0);
  for (let k = 0; k < count; k++) {
    const ls = jitter > 0 ? jittered(layers, jitter, k) : layers;
    WAVELENGTHS.forEach((l, i) => {
      const r = mode === 'avg'
        ? (reflectanceAt(ls, ns, l, thetaDeg, 's') + reflectanceAt(ls, ns, l, thetaDeg, 'p')) / 2
        : reflectanceAt(ls, ns, l, thetaDeg, mode);
      out[i] += r / count;
    });
  }
  return out;
};

/** 反射带的中心：取高于峰值一半的部分的重心，峰值太低时返回 null */
const bandCenter = (spec: Spectrum): number | null => {
  const max = Math.max(...spec);
  if (!(max > 0.02)) {
    return null;
  }
  let sum = 0;
  let weight = 0;
  spec.forEach((v, i) => {
    if (v >= max / 2) {
      sum += WAVELENGTHS[i] * v;
      weight += v;
    }
  });
  return weight > 0 ? sum / weight : null;
};

/** 反射率 × D65 日光 → sRGB。gain 用来把偏暗的反射带提亮，便于看清色相 */
const reflectColor = (spec: Spectrum, gain = 1): Vec3 => {
  const xyz = spectrumXyz(D65, spec);
  return xyzToSrgb(xyz.map(v => v * gain) as Vec3);
};

// ---------- 叠层预设 ----------

interface StackPreset {
  key: string;
  name: string;
  /** 是否按设计波长取四分之一波长厚度（false 表示厚度固定） */
  tunable: boolean;
  note: string;
}

const PRESETS: StackPreset[] = [
  {
    key: 'dielectric',
    name: '介质镜：TiO₂ / SiO₂',
    tunable: true,
    note: 'TiO₂（n = 2.35）与 SiO₂（n = 1.46）交替，镀在玻璃（n = 1.52）上，每层光学厚度 n·d = λ₀ / 4，两端都是高折射率层。折射率差大，几层就能反射几乎全部的光。'
  },
  {
    key: 'weak',
    name: '低对比度：n = 1.60 / 1.45',
    tunable: true,
    note: '折射率只差 0.15（像两种聚合物交替叠成的多层膜），每层光学厚度同样是 λ₀ / 4。每个界面只反射约 0.2% 的光，要叠很多层才有明显的颜色，反射带也窄得多。'
  },
  {
    key: 'morpho',
    name: '闪蝶鳞片（示意）',
    tunable: false,
    note: '几丁质薄片（n = 1.56，厚 65 nm）与空气间隙（厚 115 nm）交替，下面是实心的几丁质。数字只取了文献里常见的量级，是示意，不是某个物种的实测值。垂直入射时中心波长 2(n₁d₁ + n₂d₂) ≈ 433 nm。'
  }
];

const buildStack = (key: string, periods: number, center: number): {layers: Layer[]; ns: number} => {
  const count = Math.max(1, Math.round(periods));
  const layers: Layer[] = [];
  if (key === 'morpho') {
    for (let i = 0; i < count; i++) {
      layers.push({n: 1.56, d: 65}, {n: 1, d: 115});
    }
    return {layers, ns: 1.56};
  }
  const nH = key === 'weak' ? 1.6 : 2.35;
  const nL = key === 'weak' ? 1.45 : 1.46;
  const dH = center / (4 * nH);
  const dL = center / (4 * nL);
  for (let i = 0; i < count; i++) {
    layers.push({n: nH, d: dH}, {n: nL, d: dL});
  }
  layers.push({n: nH, d: dH});
  return {layers, ns: 1.52};
};

/** 以 0° 时的反射峰值归一化亮度，这样斜看时颜色变暗、变色都能看出来 */
const colorGain = (layers: Layer[], ns: number, jitter: number): number => {
  const peak = Math.max(...stackSpectrum(layers, ns, 0, 'avg', jitter));
  return Math.min(20, 1 / Math.max(0.05, peak));
};

// ---------- 蛋白石 / 胶体晶体 ----------

const FCC_FILL = 0.74;
/** fcc 的 (111) 面间距 = D·√(2/3) ≈ 0.816·D */
const D111_RATIO = Math.sqrt(2 / 3);

interface OpalSphere {
  key: string;
  name: string;
  n: number;
}

interface OpalMedium {
  key: string;
  name: string;
  n: number;
}

const SPHERES: OpalSphere[] = [
  {key: 'silica', name: '二氧化硅（n = 1.45）', n: 1.45},
  {key: 'ps', name: '聚苯乙烯（n = 1.59）', n: 1.59}
];

const MEDIA: OpalMedium[] = [
  {key: 'air', name: '空气（n = 1.00）', n: 1},
  {key: 'water', name: '水（n = 1.33）', n: 1.33}
];

const effectiveIndex2 = (nSphere: number, nVoid: number): number => FCC_FILL * nSphere ** 2 + (1 - FCC_FILL) * nVoid ** 2;

/** Bragg–Snell：λ = 2·d111·√(n_eff² − sin²θ)，θ 是空气中测得的、相对 (111) 面法线的入射角 */
const opalPeak = (diameter: number, nSphere: number, nVoid: number, thetaDeg: number): number => {
  const s = Math.sin(thetaDeg * RAD);
  return 2 * D111_RATIO * diameter * Math.sqrt(Math.max(0, effectiveIndex2(nSphere, nVoid) - s * s));
};

const OPAL_FWHM = 0.08;
const OPAL_AMP = 0.9;

/** 示意用的反射带：高斯形，半高宽取中心波长的 8%，峰值反射率 amp */
const opalSpectrum = (peak: number, amp = OPAL_AMP): Spectrum => {
  const sigma = Math.max(1, OPAL_FWHM * peak / 2.3548);
  return WAVELENGTHS.map(l => amp * Math.exp(-0.5 * ((l - peak) / sigma) ** 2));
};

const opalColor = (peak: number, amp = OPAL_AMP): Vec3 => reflectColor(opalSpectrum(peak, amp));

export {
  Layer,
  Polarization,
  PolarizationMode,
  StackPreset,
  OpalSphere,
  OpalMedium,
  PRESETS,
  SPHERES,
  MEDIA,
  reflectanceAt,
  stackSpectrum,
  bandCenter,
  reflectColor,
  buildStack,
  colorGain,
  effectiveIndex2,
  opalPeak,
  opalSpectrum,
  opalColor,
  hash01
};
