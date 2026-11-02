import {Vec3, xyzToLinear} from './space';
import {wavelengthToXyz, xyzToClipRgb} from './cie';
import {mulberry32} from './scene';

const MAP_W = 300;
const MAP_H = 240;

type LineKey = 'sii' | 'ha' | 'oiii';

interface EmissionLine {
  key: LineKey;
  name: string;
  /** 谱线波长与相对强度（同一离子的双线按理论比例拆开） */
  waves: [number, number][];
  waveText: string;
  origin: string;
}

/** 顺序与哈勃调色板的 R、G、B 对应：波长最长的在前 */
const LINES: EmissionLine[] = [
  {
    key: 'sii',
    name: '[SII]',
    waves: [[671.6, 0.45], [673.1, 0.55]],
    waveText: '671.6 / 673.1 nm',
    origin: '单次电离的硫（S⁺，电离能约 10 eV），出现在电离较弱的外缘和冲击波区域'
  },
  {
    key: 'ha',
    name: 'Hα',
    waves: [[656.3, 1]],
    waveText: '656.3 nm',
    origin: '氢原子从 n=3 跃迁到 n=2，几乎所有电离氢区都有，通常最亮'
  },
  {
    key: 'oiii',
    name: '[OIII]',
    waves: [[500.7, 0.75], [495.9, 0.25]],
    waveText: '495.9 / 500.7 nm',
    origin: '双重电离的氧（O²⁺），要能量高于约 35 eV 的紫外光才能产生，集中在靠近热恒星的核心'
  }
];

/** 一份辐射功率的谱线对应的 XYZ（双线按权重叠加） */
const lineXyz = (line: EmissionLine): Vec3 => {
  const sum: Vec3 = [0, 0, 0];
  line.waves.forEach(([l, w]) => {
    const xyz = wavelengthToXyz(l);
    sum[0] += xyz[0] * w;
    sum[1] += xyz[1] * w;
    sum[2] += xyz[2] * w;
  });
  return sum;
};

/** 线性 sRGB，色域外的负值截为 0 */
const lineLinearRgb = (line: EmissionLine): Vec3 => {
  return xyzToLinear(lineXyz(line)).map(v => Math.max(0, v)) as Vec3;
};

const lineDisplayRgb = (line: EmissionLine): Vec3 => xyzToClipRgb(lineXyz(line));

/** 同样的辐射功率下，人眼觉得有多亮（ȳ 的加权值） */
const lineLuminous = (line: EmissionLine): number => lineXyz(line)[1];

// ---------- 程序生成的星云 ----------

const makeValueNoise = (seed: number, cell: number): (x: number, y: number) => number => {
  const rand = mulberry32(seed);
  const gw = Math.ceil(MAP_W / cell) + 2;
  const gh = Math.ceil(MAP_H / cell) + 2;
  const grid = Array.from({length: gw * gh}, () => rand());
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x, y) => {
    const gx = x / cell;
    const gy = y / cell;
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const tx = smooth(gx - ix);
    const ty = smooth(gy - iy);
    const at = (i: number, j: number) => grid[j * gw + i];
    const top = at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx;
    const bottom = at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx;
    return top * (1 - ty) + bottom * ty;
  };
};

const CELLS = [96, 48, 24, 12, 6];
const AMPS = [1, 0.55, 0.3, 0.16, 0.09];
const AMP_SUM = AMPS.reduce((a, b) => a + b, 0);

/** 多个倍频的值噪声叠加，0~1 */
const makeFbm = (seed: number): (x: number, y: number) => number => {
  const octaves = CELLS.map((cell, i) => makeValueNoise(seed + i * 101, cell));
  return (x, y) => octaves.reduce((sum, o, i) => sum + AMPS[i] * o(x, y), 0) / AMP_SUM;
};

interface Nebula {
  /** 依次为 [SII]、Hα、[OIII] 的线性强度图，Hα 最亮约 1，[OIII]、[SII] 依次更暗 */
  maps: Float32Array[];
  /** 每张图自己的最大值（由最亮的恒星决定），做假彩色时用来把各通道拉到满量程 */
  peaks: number[];
  /** 按谱线真实颜色合成的线性 RGB（三个值一组），恒星按白色计入，已除以最亮恒星的亮度 */
  trueRgb: Float32Array;
}

const gaussianNoise = (rand: () => number): number => {
  const u = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
};

/** 星云本身比最亮的恒星暗得多，这是线性数据几乎全黑的原因 */
const NEBULA_GAIN = 0.3;

const buildNebula = (): Nebula => {
  const n = MAP_W * MAP_H;
  const sii = new Float32Array(n);
  const ha = new Float32Array(n);
  const oiii = new Float32Array(n);
  const rand = mulberry32(8675309);
  const f1 = makeFbm(11);
  const f2 = makeFbm(23);
  const f3 = makeFbm(37);
  const f4 = makeFbm(51);
  const warp = makeFbm(77);
  const cx = MAP_W * 0.5;
  const cy = MAP_H * 0.52;

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const p = y * MAP_W + x;
      const dx = (x - cx) / (MAP_W * 0.4);
      const dy = (y - cy) / (MAP_H * 0.44);
      const theta = Math.atan2(dy, dx);
      const r = Math.hypot(dx, dy) * (1 + 0.45 * (warp(x, y) - 0.5) + 0.12 * Math.sin(2 * theta + 0.7));

      const shell = Math.exp(-(((r - 0.62) / 0.3) ** 2)) + 0.35 * Math.exp(-((r / 0.45) ** 2));
      ha[p] = NEBULA_GAIN * shell * (0.15 + 1.3 * f1(x, y) ** 2) + 0.012 + 0.02 * f4(x, y);

      const core = Math.exp(-((r / 0.52) ** 2));
      oiii[p] = NEBULA_GAIN * 0.55 * core * (0.1 + 1.5 * f2(x, y) ** 2.2) + 0.006;

      const edge = Math.exp(-(((r - 0.95) / 0.14) ** 2));
      const ridge = 1 - Math.abs(2 * f3(x, y) - 1);
      const haze = 0.12 * Math.exp(-(((r - 0.7) / 0.3) ** 2)) * f4(x, y) ** 2;
      sii[p] = NEBULA_GAIN * 0.32 * (edge * ridge ** 3 + haze) + 0.004;
    }
  }

  const stars = new Float32Array(n);
  const add = (x0: number, y0: number, sigma: number, amps: number[]) => {
    const reach = Math.ceil(sigma * 4);
    for (let y = Math.max(0, Math.round(y0) - reach); y <= Math.min(MAP_H - 1, Math.round(y0) + reach); y++) {
      for (let x = Math.max(0, Math.round(x0) - reach); x <= Math.min(MAP_W - 1, Math.round(x0) + reach); x++) {
        const g = Math.exp(-((x - x0) ** 2 + (y - y0) ** 2) / (2 * sigma * sigma));
        const p = y * MAP_W + x;
        sii[p] += amps[0] * g;
        ha[p] += amps[1] * g;
        oiii[p] += amps[2] * g;
      }
    }
  };

  for (let i = 0; i < 6; i++) {
    const angle = rand() * 2 * Math.PI;
    add(cx + Math.cos(angle) * MAP_W * 0.34, cy + Math.sin(angle) * MAP_H * 0.37, 3.5, [0.06, 0.015, 0]);
  }
  for (let i = 0; i < 70; i++) {
    const amp = 10 ** (-1.4 + 1.4 * rand());
    const sx = rand() * MAP_W;
    const sy = rand() * MAP_H;
    const sigma = 1 + 0.6 * amp;
    const reach = Math.ceil(sigma * 4);
    for (let y = Math.max(0, Math.round(sy) - reach); y <= Math.min(MAP_H - 1, Math.round(sy) + reach); y++) {
      for (let x = Math.max(0, Math.round(sx) - reach); x <= Math.min(MAP_W - 1, Math.round(sx) + reach); x++) {
        stars[y * MAP_W + x] += amp * Math.exp(-((x - sx) ** 2 + (y - sy) ** 2) / (2 * sigma * sigma));
      }
    }
  }

  const bases = [sii, ha, oiii];
  const starWeights = [0.85, 1, 0.9];
  bases.forEach(m => {
    for (let p = 0; p < n; p++) {
      m[p] = Math.max(0, m[p] + 0.008 * gaussianNoise(rand));
    }
  });
  const maps = bases.map((m, i) => m.map((v, p) => v + starWeights[i] * stars[p]));

  let starMax = 1e-6;
  for (let p = 0; p < n; p++) {
    starMax = Math.max(starMax, stars[p]);
  }
  const rgbs = LINES.map(lineLinearRgb);
  const trueRgb = new Float32Array(n * 3);
  for (let p = 0; p < n; p++) {
    for (let c = 0; c < 3; c++) {
      const lines = bases[0][p] * rgbs[0][c] + bases[1][p] * rgbs[1][c] + bases[2][p] * rgbs[2][c];
      trueRgb[p * 3 + c] = (lines + stars[p]) / starMax;
    }
  }
  return {maps, peaks: maps.map(m => m.reduce((a, b) => Math.max(a, b), 1e-6)), trueRgb};
};

let cached: Nebula | null = null;

const getNebula = (): Nebula => {
  if (!cached) {
    cached = buildNebula();
  }
  return cached;
};

/** 滑块 0~100 → arcsinh 的强度 k；0 表示不拉伸（线性） */
const stretchStrength = (slider: number): number => {
  return slider <= 0 ? 0 : 10 ** (slider / 25) - 1;
};

/** 反双曲正弦拉伸：暗处近似线性，亮处近似对数，输入输出都在 0~1 */
const stretch = (value: number, k: number): number => {
  const v = Math.min(1, Math.max(0, value));
  return k < 1e-6 ? v : Math.asinh(k * v) / Math.asinh(k);
};

export {
  MAP_W,
  MAP_H,
  LineKey,
  EmissionLine,
  LINES,
  lineXyz,
  lineLinearRgb,
  lineDisplayRgb,
  lineLuminous,
  getNebula,
  stretchStrength,
  stretch,
  Nebula
};
