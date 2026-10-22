import {Vec3} from './space';
import {
  Spectrum,
  WAVELENGTHS,
  D65,
  sample,
  blackbody,
  spectrumXyz,
  xyzToSrgb
} from './spectral';
import {cmf} from './cie';

const DEG = Math.PI / 180;

// ---------- 薄膜干涉 ----------

interface FilmParams {
  n1: number; // 薄膜折射率
  n2: number; // 衬底折射率，环境为空气 n0 = 1
  d: number; // 厚度 nm
  theta: number; // 入射角，度
}

/** 菲涅耳振幅反射系数，c1、c2 为入射侧和透射侧的 cosθ */
const fresnel = (ni: number, nt: number, ci: number, ct: number, pol: 's' | 'p'): number => {
  return pol === 's' ? (ni * ci - nt * ct) / (ni * ci + nt * ct) : (nt * ci - ni * ct) / (nt * ci + ni * ct);
};

const cosines = (p: FilmParams): [number, number, number] => {
  const s0 = Math.sin(p.theta * DEG);
  const c0 = Math.cos(p.theta * DEG);
  const c1 = Math.sqrt(Math.max(0, 1 - (s0 / p.n1) ** 2));
  const c2 = Math.sqrt(Math.max(0, 1 - (s0 / p.n2) ** 2));
  return [c0, c1, c2];
};

/**
 * 单层薄膜的反射率（Airy 公式，只考虑相干的多次反射，s 光与 p 光取平均）。
 * r = (r01 + r12·e^(−2iδ)) / (1 + r01·r12·e^(−2iδ))，δ = 2π·n1·d·cosθ1 / λ
 */
const filmReflectance = (p: FilmParams, lambda: number): number => {
  const [c0, c1, c2] = cosines(p);
  const delta = 2 * Math.PI * p.n1 * p.d * c1 / lambda;
  const cos2 = Math.cos(2 * delta);
  const sin2 = Math.sin(2 * delta);
  return (['s', 'p'] as const).reduce((sum, pol) => {
    const r01 = fresnel(1, p.n1, c0, c1, pol);
    const r12 = fresnel(p.n1, p.n2, c1, c2, pol);
    const numRe = r01 + r12 * cos2;
    const numIm = -r12 * sin2;
    const denRe = 1 + r01 * r12 * cos2;
    const denIm = -r01 * r12 * sin2;
    return sum + (numRe * numRe + numIm * numIm) / (denRe * denRe + denIm * denIm) / 2;
  }, 0);
};

const filmSpectrum = (p: FilmParams): Spectrum => sample(l => filmReflectance(p, l));

/** 这层薄膜在该入射角下可能达到的最大反射率（相长干涉时），用来归一化显示亮度 */
const filmMaxReflectance = (p: FilmParams): number => {
  const [c0, c1, c2] = cosines(p);
  const peaks = (['s', 'p'] as const).map(pol => {
    const r01 = fresnel(1, p.n1, c0, c1, pol);
    const r12 = fresnel(p.n1, p.n2, c1, c2, pol);
    return Math.max(...[1, -1].map(e => ((r01 + r12 * e) / (1 + r01 * r12 * e)) ** 2));
  });
  return Math.max(1e-4, (peaks[0] + peaks[1]) / 2);
};

/** 薄膜在 D65 光下的颜色；normalise 为 true 时，把最亮的可能反射率拉到白，便于看清色相 */
const filmColor = (p: FilmParams, normalise = true): Vec3 => {
  const xyz = spectrumXyz(D65, filmSpectrum(p));
  const gain = normalise ? 1 / filmMaxReflectance(p) : 1;
  return xyzToSrgb(xyz.map(v => v * gain) as Vec3);
};

// ---------- 瑞利散射与天空（定性的单次散射模型） ----------

const TAU_550 = 0.1; // 天顶方向 550nm 处的瑞利光学厚度
const OZONE_PEAK = 0.04; // 臭氧 Chappuis 吸收带（峰值 600nm）天顶方向的光学厚度，示意值

const rayleighTau = (l: number): number => TAU_550 * (550 / l) ** 4;

const ozoneTau = (l: number): number => OZONE_PEAK * Math.exp(-0.5 * ((l - 600) / 45) ** 2);

/** Kasten–Young (1989) 大气质量；h 为高度角（度），低于地平线按 0° 处理 */
const airMass = (h: number): number => {
  const e = Math.max(0, h);
  return 1 / (Math.sin(e * DEG) + 0.50572 * (e + 6.07995) ** -1.6364);
};

/** 太阳光穿过臭氧层（约 22km 高）的相对路径；日落后随太阳继续下沉而增大 */
const ozoneMass = (h: number): number => {
  if (h < 0) {
    return 12 + 4 * -h;
  }
  const r = 1 / (1 + 22 / 6371);
  return 1 / Math.sqrt(1 - (Math.cos(h * DEG) * r) ** 2);
};

/** 日落后（太阳在地平线以下）天空整体变暗的粗略系数 */
const twilightFactor = (h: number): number => (h >= 0 ? 1 : Math.exp(h / 1.8));

const SUN: Spectrum = blackbody(5778);
const YBAR: number[] = WAVELENGTHS.map(l => cmf(l)[1]);

/** 光谱的相对亮度：∑ 光谱 × ȳ */
const luminance = (spd: Spectrum): number => spd.reduce((sum, v, i) => sum + v * YBAR[i], 0);

/** 直射阳光穿过大气后的光谱（太阳在地平线以下时为 0） */
const sunBeam = (h: number, ozone = true): Spectrum => {
  if (h < 0) {
    return WAVELENGTHS.map(() => 0);
  }
  const ms = airMass(h);
  const mo = ozoneMass(h);
  return WAVELENGTHS.map((l, i) => {
    const t = rayleighTau(l) * ms + (ozone ? ozoneTau(l) * mo : 0);
    return SUN[i] * Math.exp(-t);
  });
};

/**
 * 某个观察方向上的天空光谱。平行平面大气里的单次散射：
 * 散射点以上的阳光路径 ms·u、以下的视线路径 mv·(1−u)，对高度分数 u 积分得到
 * (e^(−τ·mv) − e^(−τ·ms)) / (ms − mv)。不含多次散射和地面反照，所以地平线附近只是近似。
 */
const skyRadiance = (h: number, viewElev: number, ozone = true): Spectrum => {
  const ms = h >= 0 ? airMass(h) : airMass(0) * (1 + -h / 2);
  const mv = airMass(viewElev);
  const mo = ozoneMass(h) + 1;
  const k = twilightFactor(h);
  return WAVELENGTHS.map((l, i) => {
    const tau = rayleighTau(l);
    const f = Math.abs(ms - mv) < 1e-3
      ? tau * Math.exp(-tau * mv)
      : (Math.exp(-tau * mv) - Math.exp(-tau * ms)) / (ms - mv);
    const oz = ozone ? Math.exp(-ozoneTau(l) * mo) : 1;
    return SUN[i] * f * oz * k;
  });
};

// ---------- Kubelka–Munk ----------

/** 不透明涂层：K/S → 反射率 R∞ */
const ksToReflectance = (ks: number): number => 1 + ks - Math.sqrt(ks * ks + 2 * ks);

/** 不透明涂层：反射率 R∞ → K/S */
const reflectanceToKs = (r: number): number => (1 - r) ** 2 / (2 * r);

interface KsComponent {
  k: Spectrum;
  s: Spectrum;
  c: number; // 浓度（相对权重）
}

/** K_mix = Σ c·K，S_mix = Σ c·S，再换算成反射率 */
const mixKubelkaMunk = (list: KsComponent[]): Spectrum => {
  const total = list.reduce((sum, item) => sum + item.c, 0) || 1;
  return WAVELENGTHS.map((_, i) => {
    const k = list.reduce((sum, item) => sum + item.c * item.k[i], 0) / total;
    const s = list.reduce((sum, item) => sum + item.c * item.s[i], 0) / total;
    return ksToReflectance(k / s);
  });
};

export {
  FilmParams,
  filmReflectance,
  filmSpectrum,
  filmMaxReflectance,
  filmColor,
  rayleighTau,
  ozoneTau,
  airMass,
  ozoneMass,
  twilightFactor,
  SUN,
  luminance,
  sunBeam,
  skyRadiance,
  KsComponent,
  ksToReflectance,
  reflectanceToKs,
  mixKubelkaMunk
};
