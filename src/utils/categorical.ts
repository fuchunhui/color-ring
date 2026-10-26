import {Vec3, oklchToRgb, rgbToLab, srgbToLinear, linearToSrgb} from './space';
import {deltaE2000} from './deltae';
import {MATRICES} from './colorblind';

type Cvd = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia';

interface Options {
  count: number;
  lMin: number;
  lMax: number;
  cMin: number;
  cvdSafe: boolean;
}

interface Candidate {
  rgb: Vec3;
  l: number;
  c: number;
  labs: Vec3[];
}

interface VariantStat {
  min: number;
  mean: number;
}

const VARIANTS: Cvd[] = ['normal', 'protanopia', 'deuteranopia', 'tritanopia'];

const VARIANT_LABELS: Record<Cvd, string> = {
  normal: '正常视觉',
  protanopia: '红色盲',
  deuteranopia: '绿色盲',
  tritanopia: '蓝黄色盲'
};

const OKABE_ITO = ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];

const TABLEAU10 = [
  '#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F',
  '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC'
];

const hexToRgb = (hex: string): Vec3 => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgbToHex = (rgb: Vec3): string => {
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
};

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

const simulate = (rgb: Vec3, type: Cvd): Vec3 => {
  if (type === 'normal') {
    return rgb;
  }
  const m = MATRICES[type];
  const lin = rgb.map(v => srgbToLinear(v / 255));
  return [0, 1, 2].map(i => {
    const v = clamp01(m[i][0] * lin[0] + m[i][1] * lin[1] + m[i][2] * lin[2]);
    return Math.round(clamp01(linearToSrgb(v)) * 255);
  }) as Vec3;
};

const variantLabs = (rgb: Vec3): Vec3[] => VARIANTS.map(type => rgbToLab(simulate(rgb, type)));

const distance = (a: Vec3[], b: Vec3[], variants: number[]): number => {
  let min = Infinity;
  variants.forEach(i => {
    min = Math.min(min, deltaE2000(a[i], b[i]));
  });
  return min;
};

const pools = new Map<string, Candidate[]>();

const candidatePool = (lMin: number, lMax: number, cMin: number): Candidate[] => {
  const key = `${lMin.toFixed(3)}|${lMax.toFixed(3)}|${cMin.toFixed(3)}`;
  const cached = pools.get(key);
  if (cached) {
    return cached;
  }
  const seen = new Set<string>();
  const list: Candidate[] = [];
  for (let l = lMin; l <= lMax + 1e-9; l += 0.04) {
    for (let c = cMin; c <= 0.32 + 1e-9; c += 0.02) {
      for (let h = 0; h < 360; h += 6) {
        const result = oklchToRgb([l, c, h]);
        if (!result.inGamut) {
          continue;
        }
        const hex = rgbToHex(result.rgb);
        if (seen.has(hex)) {
          continue;
        }
        seen.add(hex);
        list.push({rgb: result.rgb, l, c, labs: variantLabs(result.rgb)});
      }
    }
  }
  if (pools.size > 20) {
    pools.clear();
  }
  pools.set(key, list);
  return list;
};

/** 贪心最远点：每次选出与已选颜色最小色差最大的候选 */
const generatePalette = (options: Options): string[] => {
  const pool = candidatePool(options.lMin, options.lMax, options.cMin);
  if (!pool.length) {
    return [];
  }
  const variants = options.cvdSafe ? [0, 1, 2, 3] : [0];
  const count = Math.min(options.count, pool.length);
  const midL = (options.lMin + options.lMax) / 2;

  let first = 0;
  pool.forEach((item, i) => {
    const best = pool[first];
    if (item.c > best.c + 1e-9 || (Math.abs(item.c - best.c) < 1e-9 && Math.abs(item.l - midL) < Math.abs(best.l - midL))) {
      first = i;
    }
  });

  const chosen = [first];
  const minDist = pool.map(item => distance(item.labs, pool[first].labs, variants));
  while (chosen.length < count) {
    let next = -1;
    let best = -1;
    minDist.forEach((d, i) => {
      if (d > best) {
        best = d;
        next = i;
      }
    });
    chosen.push(next);
    pool.forEach((item, i) => {
      minDist[i] = Math.min(minDist[i], distance(item.labs, pool[next].labs, variants));
    });
  }
  return chosen.map(i => rgbToHex(pool[i].rgb));
};

/** 每种视觉类型下，调色板内两两 ΔE2000 的最小值和平均值 */
const paletteStats = (hexes: string[]): Record<Cvd, VariantStat> => {
  const labs = hexes.map(hex => variantLabs(hexToRgb(hex)));
  const result = {} as Record<Cvd, VariantStat>;
  VARIANTS.forEach((type, v) => {
    let min = Infinity;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < labs.length; i++) {
      for (let j = i + 1; j < labs.length; j++) {
        const d = deltaE2000(labs[i][v], labs[j][v]);
        min = Math.min(min, d);
        sum += d;
        n++;
      }
    }
    result[type] = n ? {min, mean: sum / n} : {min: 0, mean: 0};
  });
  return result;
};

export {
  Cvd,
  Options,
  VARIANTS,
  VARIANT_LABELS,
  OKABE_ITO,
  TABLEAU10,
  hexToRgb,
  rgbToHex,
  generatePalette,
  paletteStats
};
