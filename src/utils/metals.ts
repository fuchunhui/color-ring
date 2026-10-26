/**
 * 金属复折射率 n + ik，380~780nm，每 20nm 一个点。
 * 数据来自 refractiveindex.info 公共数据库（CC0）中的原始表，在 20nm 网格上线性插值：
 *   金、铜、银：Johnson & Christy 1972, Phys. Rev. B 6, 4370；
 *   铝：Rakić 1995, Appl. Opt. 34, 4755。
 */
import type {Vec3} from './space';
import {WAVELENGTHS, D65, spectrumXyz, xyzToSrgb} from './spectral';
import type {Spectrum} from './spectral';

interface Metal {
  key: string;
  name: string;
  source: string;
  table: number[][]; // [波长nm, n, k]
}

const JC = 'Johnson & Christy 1972';

const METALS: Metal[] = [
  {
    key: 'Au',
    name: '金',
    source: JC,
    table: [
      [380, 1.462, 1.929], [400, 1.468, 1.953], [420, 1.456, 1.954], [440, 1.417, 1.932],
      [460, 1.349, 1.885], [480, 1.215, 1.843], [500, 0.971, 1.874], [520, 0.635, 2.072],
      [540, 0.489, 2.339], [560, 0.382, 2.594], [580, 0.299, 2.837], [600, 0.249, 3.074],
      [620, 0.205, 3.304], [640, 0.172, 3.503], [660, 0.14, 3.702], [680, 0.135, 3.882],
      [700, 0.131, 4.062], [720, 0.133, 4.235], [740, 0.137, 4.406], [760, 0.141, 4.575],
      [780, 0.147, 4.741]
    ]
  },
  {
    key: 'Cu',
    name: '铜',
    source: JC,
    table: [
      [380, 1.333, 2.037], [400, 1.313, 2.131], [420, 1.268, 2.245], [440, 1.245, 2.348],
      [460, 1.244, 2.435], [480, 1.239, 2.511], [500, 1.213, 2.571], [520, 1.181, 2.606],
      [540, 1.07, 2.587], [560, 0.911, 2.62], [580, 0.72, 2.696], [600, 0.494, 2.962],
      [620, 0.294, 3.246], [640, 0.257, 3.499], [660, 0.22, 3.752], [680, 0.215, 3.956],
      [700, 0.211, 4.159], [720, 0.219, 4.343], [740, 0.231, 4.522], [760, 0.241, 4.697],
      [780, 0.247, 4.855]
    ]
  },
  {
    key: 'Ag',
    name: '银',
    source: JC,
    table: [
      [380, 0.052, 1.841], [400, 0.05, 2.104], [420, 0.046, 2.348], [440, 0.04, 2.553],
      [460, 0.044, 2.751], [480, 0.05, 2.948], [500, 0.05, 3.131], [520, 0.05, 3.316],
      [540, 0.057, 3.505], [560, 0.057, 3.679], [580, 0.051, 3.841], [600, 0.055, 4.01],
      [620, 0.059, 4.177], [640, 0.055, 4.332], [660, 0.05, 4.487], [680, 0.045, 4.645],
      [700, 0.041, 4.802], [720, 0.037, 4.96], [740, 0.033, 5.116], [760, 0.031, 5.272],
      [780, 0.034, 5.421]
    ]
  },
  {
    key: 'Al',
    name: '铝',
    source: 'Rakić 1995',
    table: [
      [380, 0.437, 4.587], [400, 0.488, 4.836], [420, 0.541, 5.084], [440, 0.6, 5.333],
      [460, 0.668, 5.575], [480, 0.739, 5.815], [500, 0.813, 6.048], [520, 0.888, 6.281],
      [540, 0.973, 6.512], [560, 1.058, 6.743], [580, 1.158, 6.965], [600, 1.262, 7.185],
      [620, 1.366, 7.406], [640, 1.494, 7.61], [660, 1.627, 7.804], [680, 1.768, 7.982],
      [700, 1.921, 8.142], [720, 2.085, 8.288], [740, 2.267, 8.388], [760, 2.467, 8.447],
      [780, 2.654, 8.465]
    ]
  }
];

const nk = (metal: Metal, l: number): [number, number] => {
  const t = metal.table;
  const pos = Math.min(t.length - 1.0001, Math.max(0, (l - 380) / 20));
  const i = Math.floor(pos);
  const f = pos - i;
  return [t[i][1] * (1 - f) + t[i + 1][1] * f, t[i][2] * (1 - f) + t[i + 1][2] * f];
};

/** 复折射率 n+ik 的金属，空气入射，θ 为入射角（弧度）；返回 s、p 偏振反射率的平均 */
const fresnel = (n: number, k: number, theta: number): number => {
  const sin2 = Math.sin(theta) ** 2;
  const cos = Math.cos(theta);
  // 复数 N² = (n+ik)²；cosθt = sqrt(1 - sin²θ / N²)
  const nr = n * n - k * k;
  const ni = 2 * n * k;
  const den = nr * nr + ni * ni;
  // sin²θ / N² = sin2 * conj(N²) / |N²|²
  const ar = 1 - sin2 * nr / den;
  const ai = sin2 * ni / den;
  const mod = Math.hypot(ar, ai);
  const cr = Math.sqrt((mod + ar) / 2);
  const ci = ai >= 0 ? Math.sqrt((mod - ar) / 2) : -Math.sqrt((mod - ar) / 2);
  const div = (a: number, b: number, c: number, d: number): [number, number] => {
    const q = c * c + d * d;
    return [(a * c + b * d) / q, (b * c - a * d) / q];
  };
  const norm2 = (re: number, im: number) => re * re + im * im;
  // rs = (cosθ − N cosθt) / (cosθ + N cosθt)
  const ncr = n * cr - k * ci;
  const nci = n * ci + k * cr;
  const [rsr, rsi] = div(cos - ncr, -nci, cos + ncr, nci);
  // rp = (N cosθ − cosθt) / (N cosθ + cosθt)
  const [rpr, rpi] = div(n * cos - cr, k * cos - ci, n * cos + cr, k * cos + ci);
  return (norm2(rsr, rsi) + norm2(rpr, rpi)) / 2;
};

const reflectance = (metal: Metal, theta: number): Spectrum => {
  return WAVELENGTHS.map(l => {
    const [n, k] = nk(metal, l);
    return fresnel(n, k, theta);
  });
};

/** 反射光在 D65 下的 sRGB；也返回线性 RGB，便于对比 PBR 的 F0 */
const reflectedColor = (metal: Metal, theta: number): {srgb: Vec3; linear: Vec3} => {
  const r = reflectance(metal, theta);
  const xyz = spectrumXyz(D65, r);
  const srgb = xyzToSrgb(xyz);
  const linear = srgb.map(v => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Vec3;
  return {srgb, linear};
};

export {
  Metal,
  METALS,
  nk,
  fresnel,
  reflectance,
  reflectedColor
};
