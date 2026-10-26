import {Vec3} from './space';
import {cmf} from './cie';
import {D65} from './spectral';

type Point2 = [number, number];

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Cauchy 近似 n = A + B/λ²（λ 为 nm），系数按 F、C 谱线的色散拟合 */
const waterIndex = (l: number): number => 1.3240 + 3140 / (l * l);
const bk7Index = (l: number): number => 1.5045 + 4220 / (l * l);
const flintIndex = (l: number): number => 1.5943 + 8930 / (l * l);

/** 非偏振光的菲涅尔反射率，光从折射率 n1 的介质射向 n2，入射角 ti（弧度） */
const fresnel = (n1: number, n2: number, ti: number): number => {
  const st = n1 / n2 * Math.sin(ti);
  if (st >= 1) {
    return 1;
  }
  const tt = Math.asin(st);
  const ci = Math.cos(ti);
  const ct = Math.cos(tt);
  const rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct);
  const rp = (n1 * ct - n2 * ci) / (n1 * ct + n2 * ci);
  return (rs * rs + rp * rp) / 2;
};

interface PrismResult {
  r1: number;
  r2: number;
  i2: number;
  deviation: number;
}

/** 三棱镜：顶角 apex、入射角 inc（度），返回两个面的折射角、出射角与总偏向角；全反射时返回 null */
const prismRefract = (apex: number, inc: number, n: number): PrismResult | null => {
  const r1 = Math.asin(Math.sin(inc * RAD) / n);
  const r2 = apex * RAD - r1;
  const s2 = n * Math.sin(r2);
  if (s2 >= 1 || s2 <= -1) {
    return null;
  }
  const i2 = Math.asin(s2) * DEG;
  return {r1: r1 * DEG, r2: r2 * DEG, i2, deviation: inc + i2 - apex};
};

/** 最小偏向角，对应光在棱镜里平行于底边通过（入射角等于出射角） */
const minDeviation = (apex: number, n: number): {angle: number; incidence: number} | null => {
  const s = n * Math.sin(apex * RAD / 2);
  if (s >= 1) {
    return null;
  }
  const incidence = Math.asin(s) * DEG;
  return {angle: 2 * incidence - apex, incidence};
};

/** 雨滴内 k 次反射的偏向角（度），ti 为入射角（弧度） */
const dropDeviation = (ti: number, n: number, k: number): number => {
  const tr = Math.asin(Math.sin(ti) / n);
  return k * 180 + (2 * ti - 2 * (k + 1) * tr) * DEG;
};

/** 彩虹角：偏向角取极小值处，从反日点量起（主虹 k = 1，副虹 k = 2） */
const bowAngle = (n: number, k: number): number => {
  const ti = Math.acos(Math.sqrt((n * n - 1) / (k * (k + 2))));
  const d = dropDeviation(ti, n, k);
  return k === 1 ? 180 - d : d - 180;
};

/** 单条光线在雨滴（单位圆）内的路径，入射光沿 +x 方向、高度为 sin(ti) */
const dropPath = (ti: number, n: number, k: number): Point2[] => {
  const points: Point2[] = [[-2, Math.sin(ti)]];
  let p: Point2 = [-Math.cos(ti), Math.sin(ti)];
  points.push(p);
  const psi = -ti + Math.asin(Math.sin(ti) / n);
  let d: Point2 = [Math.cos(psi), Math.sin(psi)];
  for (let j = 0; j <= k; j++) {
    const t = -2 * (p[0] * d[0] + p[1] * d[1]);
    const q: Point2 = [p[0] + t * d[0], p[1] + t * d[1]];
    points.push(q);
    if (j < k) {
      const dot = d[0] * q[0] + d[1] * q[1];
      d = [d[0] - 2 * dot * q[0], d[1] - 2 * dot * q[1]];
      p = q;
    } else {
      const cosi = d[0] * q[0] + d[1] * q[1];
      const disc = 1 - n * n * (1 - cosi * cosi);
      if (disc > 0) {
        const c = n * cosi - Math.sqrt(disc);
        const out: Point2 = [n * d[0] - c * q[0], n * d[1] - c * q[1]];
        points.push([q[0] + 1.6 * out[0], q[1] + 1.6 * out[1]]);
      }
    }
  }
  return points;
};

const BOW_STEP = 0.05;
const BOW_MAX = 80;
const BOW_COUNT = Math.round(BOW_MAX / BOW_STEP);
const BOW_SIGMA = 0.3;

const bowHistogram = (k: number, lambda: number): Float64Array => {
  const n = waterIndex(lambda);
  const hist = new Float64Array(BOW_COUNT);
  const dt = 0.005 * RAD;
  for (let ti = dt / 2; ti < Math.PI / 2; ti += dt) {
    const tr = Math.asin(Math.sin(ti) / n);
    const alpha = k === 1 ? 180 - dropDeviation(ti, n, 1) : dropDeviation(ti, n, 2) - 180;
    const index = Math.floor(alpha / BOW_STEP);
    if (index >= 0 && index < BOW_COUNT) {
      const through = 1 - fresnel(1, n, ti);
      const inner = fresnel(n, 1, tr);
      hist[index] += Math.sin(ti) * Math.cos(ti) * through * through * inner ** k * dt / BOW_STEP;
    }
  }
  return hist;
};

const blur = (hist: Float64Array, sigma: number): Float64Array => {
  const radius = Math.ceil(sigma * 4 / BOW_STEP);
  const kernel: number[] = [];
  for (let i = -radius; i <= radius; i++) {
    kernel.push(Math.exp(-0.5 * (i * BOW_STEP / sigma) ** 2));
  }
  const out = new Float64Array(hist.length);
  hist.forEach((v, i) => {
    if (v > 0) {
      kernel.forEach((w, j) => {
        const t = i + j - radius;
        if (t >= 0 && t < out.length) {
          out[t] += v * w;
        }
      });
    }
  });
  return out;
};

interface BowTables {
  primary: Float32Array;
  secondary: Float32Array;
}

let bowCache: BowTables | null = null;

/**
 * 主虹、副虹的颜色表：下标 i 对应反日点起算 i·0.05° 处，每项 3 个 XYZ 值（太阳光取 D65，水滴按几何光学统计光线密度）。
 * 边缘处用 0.3° 的高斯模糊代替干涉造成的柔化。
 */
const rainbowTables = (): BowTables => {
  if (bowCache) {
    return bowCache;
  }
  const tables = [1, 2].map(() => new Float32Array(BOW_COUNT * 3));
  for (let l = 400; l <= 700; l += 10) {
    const sun = D65[(l - 380) / 5];
    const c = cmf(l);
    [1, 2].forEach(k => {
      const b = blur(bowHistogram(k, l), BOW_SIGMA);
      b.forEach((v, i) => {
        for (let j = 0; j < 3; j++) {
          tables[k - 1][i * 3 + j] += v * sun * c[j];
        }
      });
    });
  }
  let peak = 0;
  for (let i = 0; i < BOW_COUNT; i++) {
    peak = Math.max(peak, tables[0][i * 3 + 1]);
  }
  tables.forEach(t => {
    for (let i = 0; i < t.length; i++) {
      t[i] /= peak;
    }
  });
  bowCache = {primary: tables[0], secondary: tables[1]};
  return bowCache;
};

const sinc2 = (x: number): number => (Math.abs(x) < 1e-9 ? 1 : (Math.sin(x) / x) ** 2);

/** n 缝衍射的相对强度（主极大为 1）：beta = π·d·sinθ/λ，alpha = π·a·sinθ/λ（a 为缝宽） */
const nSlit = (n: number, beta: number, alpha: number): number => {
  const s = Math.sin(beta);
  const comb = Math.abs(s) < 1e-9 ? 1 : (Math.sin(n * beta) / (n * s)) ** 2;
  return comb * sinc2(alpha);
};

/** 双折射片（延迟量 retard，单位 nm，快慢轴与起偏方向夹角 theta，弧度）两侧各放一片偏振片时的透过率 */
const retarderTransmission = (retard: number, theta: number, lambda: number, crossed: boolean): number => {
  const t = Math.sin(2 * theta) ** 2 * Math.sin(Math.PI * retard / lambda) ** 2;
  return crossed ? t : 1 - t;
};

interface Birefringent {
  key: string;
  name: string;
  dn: number;
}

/** 典型的近似双折射值，实际数值因材料和工艺而异 */
const BIREFRINGENT: Birefringent[] = [
  {key: 'tape', name: '透明胶带（BOPP 薄膜）', dn: 0.015},
  {key: 'cellophane', name: '玻璃纸', dn: 0.006},
  {key: 'quartz', name: '石英', dn: 0.009},
  {key: 'calcite', name: '方解石', dn: 0.172}
];

interface SpectralLine {
  l: number;
  i: number;
}

interface LineSource {
  key: string;
  name: string;
  symbol: string;
  note: string;
  lines: SpectralLine[];
}

const lines = (...pairs: [number, number][]): SpectralLine[] => pairs.map(([l, i]) => ({l, i}));

/** 谱线波长取自常见数据，相对强度为示意值 */
const LINE_SOURCES: LineSource[] = [
  {
    key: 'h',
    name: '氢',
    symbol: 'H',
    note: '巴尔末系：n = 3、4、5、6 跃迁到 n = 2',
    lines: lines([656.3, 1], [486.1, 0.35], [434.0, 0.15], [410.2, 0.08])
  },
  {
    key: 'he',
    name: '氦',
    symbol: 'He',
    note: '587.6 nm 最强，整体偏淡黄白',
    lines: lines([447.1, 0.25], [471.3, 0.12], [492.2, 0.1], [501.6, 0.3], [587.6, 1], [667.8, 0.35])
  },
  {
    key: 'ne',
    name: '氖',
    symbol: 'Ne',
    note: '集中在 585–700 nm 的大量谱线，霓虹灯的红橙色',
    lines: lines(
      [585.2, 0.5], [588.2, 0.3], [594.5, 0.35], [597.5, 0.25], [603.0, 0.4], [607.4, 0.5], [609.6, 0.5],
      [614.3, 0.6], [616.4, 0.55], [621.7, 0.5], [626.6, 0.5], [630.5, 0.45], [633.4, 0.6], [638.3, 0.8],
      [640.2, 1], [650.6, 0.55], [653.3, 0.5], [659.9, 0.45], [667.8, 0.3], [692.9, 0.45]
    )
  },
  {
    key: 'na',
    name: '钠',
    symbol: 'Na',
    note: '589.0 与 589.6 nm 的 D 线双线，几乎是单色黄光',
    lines: lines([589.0, 1], [589.6, 0.5])
  },
  {
    key: 'hg',
    name: '汞',
    symbol: 'Hg',
    note: '蓝紫与绿的谱线为主，日光灯、路灯里常见',
    lines: lines([404.7, 0.4], [435.8, 0.9], [546.1, 0.8], [577.0, 0.25], [579.1, 0.25])
  },
  {
    key: 'li',
    name: '锂',
    symbol: 'Li',
    note: '670.8 nm 的深红是焰色反应里“胭脂红”的来源',
    lines: lines([670.8, 1], [610.4, 0.15], [460.3, 0.05])
  }
];

/** 谱线列表 → XYZ（每条线直接乘颜色匹配函数后相加） */
const linesXyz = (list: SpectralLine[]): Vec3 => {
  const sum: Vec3 = [0, 0, 0];
  list.forEach(({l, i}) => {
    const c = cmf(l);
    for (let j = 0; j < 3; j++) {
      sum[j] += i * c[j];
    }
  });
  return sum;
};

export {
  Point2,
  PrismResult,
  Birefringent,
  SpectralLine,
  LineSource,
  BIREFRINGENT,
  LINE_SOURCES,
  BOW_STEP,
  BOW_COUNT,
  waterIndex,
  bk7Index,
  flintIndex,
  fresnel,
  prismRefract,
  minDeviation,
  dropDeviation,
  bowAngle,
  dropPath,
  rainbowTables,
  sinc2,
  nSlit,
  retarderTransmission,
  linesXyz
};
