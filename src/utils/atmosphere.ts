import {Vec3, xyzToLinear} from './space';
import {cmf} from './cie';
import {minDeviation} from './optics';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** 冰的折射率近似（Cauchy 形式 n = A + B/λ²）：700nm 约 1.306，450nm 约 1.317 */
const iceIndex = (l: number): number => 1.29825 + 3797 / (l * l);

/** 单色光的线性 sRGB 颜色（色域外截断），一组采样波长加起来正好是白色 */
const spectralColors = (samples: number[]): Vec3[] => {
  const raw = samples.map(l => xyzToLinear(cmf(l)).map(v => Math.max(0, v)) as Vec3);
  const sums = [0, 1, 2].map(c => raw.reduce((s, v) => s + v[c], 0) || 1);
  return raw.map(v => v.map((x, c) => x / sums[c]) as Vec3);
};

const HALO_SAMPLES = Array.from({length: 13}, (_, i) => 400 + i * 25);
const HALO_COLORS = spectralColors(HALO_SAMPLES);

/** 某一波长的 22° 晕（顶角 60° 棱柱）和 46° 晕（顶角 90° 棱柱）的最小偏向角 */
const haloAngle = (apex: number, l: number): number => {
  const result = minDeviation(apex, iceIndex(l));
  return result ? result.angle : NaN;
};

const PROFILE_STEP = 0.1;
const PROFILE_MAX = 60;

/** 晕环的径向亮度表：下标 = 离太阳的角距离 / PROFILE_STEP，每项 3 个线性光值 */
const haloProfile = (w46 = 0.16): Float32Array => {
  const count = Math.round(PROFILE_MAX / PROFILE_STEP) + 1;
  const table = new Float32Array(count * 3);
  HALO_SAMPLES.forEach((l, k) => {
    const d22 = haloAngle(60, l);
    const d46 = haloAngle(90, l);
    for (let i = 0; i < count; i++) {
      const r = i * PROFILE_STEP;
      const v22 = r >= d22 ? Math.exp(-(r - d22) / 1.6) : Math.exp(-(((d22 - r) / 0.25) ** 2));
      const v46 = r >= d46 ? Math.exp(-(r - d46) / 2.4) : Math.exp(-(((d46 - r) / 0.3) ** 2));
      const v = v22 * 0.55 + v46 * w46;
      for (let c = 0; c < 3; c++) {
        table[i * 3 + c] += v * HALO_COLORS[k][c];
      }
    }
  });
  return table;
};

/**
 * 幻日：板状冰晶竖直下落，侧面构成顶角 60° 的棱镜。太阳高度 h（度）时光线与冰晶水平面有夹角，
 * 水平面内的等效折射率 n_eff = √(n² − sin²h) / cos h；返回方位角偏离 δ 和在天空上离太阳的角距离。
 */
interface Sundog {
  azimuth: number;
  distance: number;
  strength: number;
}

const sundog = (h: number, n: number): Sundog | null => {
  const sh = Math.sin(h * RAD);
  const ch = Math.cos(h * RAD);
  const ne = Math.sqrt(n * n - sh * sh) / ch;
  const s = ne * Math.sin(30 * RAD);
  if (s >= 1) {
    return null;
  }
  const azimuth = 2 * Math.asin(s) * DEG - 60;
  const cosD = sh * sh + ch * ch * Math.cos(azimuth * RAD);
  const distance = Math.acos(Math.min(1, cosD)) * DEG;
  const strength = Math.max(0, Math.min(1, (1 - s) / 0.2));
  return {azimuth, distance, strength};
};

/** 幻日沿水平方向的亮度表：下标 = 离幻日中心的水平角距离 / PROFILE_STEP（红色内缘离太阳更近） */
const sundogProfile = (h: number): Float32Array => {
  const count = Math.round(PROFILE_MAX / PROFILE_STEP) + 1;
  const table = new Float32Array(count * 3);
  HALO_SAMPLES.forEach((l, k) => {
    const s = sundog(h, iceIndex(l));
    if (!s) {
      return;
    }
    for (let i = 0; i < count; i++) {
      const dx = i * PROFILE_STEP;
      const v = dx >= s.distance ? Math.exp(-(dx - s.distance) / 2.2) : Math.exp(-(((s.distance - dx) / 0.45) ** 2));
      for (let c = 0; c < 3; c++) {
        table[i * 3 + c] += v * s.strength * HALO_COLORS[k][c];
      }
    }
  });
  return table;
};

// ---------- 绿闪 ----------

/** 标准大气（干空气，15°C，101.325 kPa）折射率的经典 Cauchy 型公式，λ 单位 nm，是简化模型 */
const airIndexMinus1 = (l: number): number => {
  const um = l / 1000;
  return (287.6155 + 1.62887 / (um * um) + 0.0136 / (um ** 4)) * 1e-6;
};

const REF_WAVELENGTH = 575;

/** 太阳半径（角分） */
const SUN_RADIUS = 16;

/** Sæmundsson 公式：真高度 t（度）处的折射（角分），对应约 575nm 的可见光 */
const refractionRef = (t: number): number => 1.02 / Math.tan((t + 10.3 / (t + 5.11)) * RAD);

/** 波长 l 的折射 = 参考折射 × (n_λ − 1) / (n_575 − 1) */
const refraction = (t: number, l: number): number => {
  return refractionRef(t) * airIndexMinus1(l) / airIndexMinus1(REF_WAVELENGTH);
};

/** 真高度 t（度）的天体在波长 l 下的视高度（度） */
const apparentAltitude = (t: number, l: number): number => t + refraction(t, l) / 60;

interface DiscImage {
  center: number; // 视圆心高度（度）
  semiY: number; // 竖直半轴（度），大气折射使日轮被压扁
}

/** 太阳圆心真高度 t（度）时，波长 l 的日轮像：上缘、下缘分别折射，所以日轮被压扁 */
const discImage = (t: number, l: number): DiscImage => {
  const r = SUN_RADIUS / 60;
  const top = apparentAltitude(t + r, l);
  const bottom = apparentAltitude(t - r, l);
  return {center: (top + bottom) / 2, semiY: (top - bottom) / 2};
};

// ---------- 极光 ----------

interface AuroraLine {
  key: string;
  label: string;
  wavelength: number;
  note: string;
}

const AURORA_LINES: AuroraLine[] = [
  {key: 'n391', label: 'N₂⁺ 391.4', wavelength: 391.4, note: '氮分子离子，紫外边缘的蓝紫色'},
  {key: 'n428', label: 'N₂⁺ 427.8', wavelength: 427.8, note: '氮分子离子，蓝紫色'},
  {key: 'o558', label: 'O 557.7', wavelength: 557.7, note: '氧原子绿线，最常见'},
  {key: 'o630', label: 'O 630.0', wavelength: 630.0, note: '氧原子红线，寿命长，只在高空出现'},
  {key: 'o636', label: 'O 636.4', wavelength: 636.4, note: '氧原子红线的伴线'}
];

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 各发射成分随高度（km）的相对强度，示意曲线 */
const auroraProfile = (alt: number): {green: number; red: number; blue: number} => {
  const green = Math.exp(-(((alt - 112) / 16) ** 2)) + 0.3 * Math.exp(-(((alt - 150) / 45) ** 2));
  const red = 0.8 * smooth(140, 220, alt) * Math.exp(-(((alt - 270) / 70) ** 2));
  const blue = 0.9 * Math.exp(-(((alt - 98) / 7) ** 2));
  return {green, red, blue};
};

export {
  RAD,
  DEG,
  HALO_SAMPLES,
  PROFILE_STEP,
  PROFILE_MAX,
  AURORA_LINES,
  SUN_RADIUS,
  REF_WAVELENGTH,
  iceIndex,
  spectralColors,
  haloAngle,
  haloProfile,
  sundog,
  sundogProfile,
  airIndexMinus1,
  refraction,
  apparentAltitude,
  discImage,
  auroraProfile
};
export type {Sundog, DiscImage, AuroraLine};
