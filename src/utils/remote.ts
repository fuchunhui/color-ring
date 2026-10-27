import {makeNoise, mulberry32} from './scene';

/** 平滑的值噪声（无白噪声成分），0~1 */
const smoothNoise = (width: number, height: number, cell: number, seed: number): (x: number, y: number) => number => {
  const rand = mulberry32(seed);
  const gw = Math.ceil(width / cell) + 3;
  const gh = Math.ceil(height / cell) + 3;
  const grid = Array.from({length: gw * gh}, () => rand());
  return (x, y) => {
    const gx = x / cell;
    const gy = y / cell;
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const fx = gx - ix;
    const fy = gy - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const at = (a: number, b: number) => grid[b * gw + a];
    const top = at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx;
    const bottom = at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx;
    return top * (1 - sy) + bottom * sy;
  };
};

/** 示意用的光谱反射率，波长范围 400~1000 nm，每 5 nm 一个值 */
const R_MIN = 400;
const R_MAX = 1000;
const R_STEP = 5;
const R_WAVELENGTHS: number[] = Array.from({length: (R_MAX - R_MIN) / R_STEP + 1}, (_, i) => R_MIN + i * R_STEP);

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));
const bell = (l: number, mu: number, s: number): number => Math.exp(-0.5 * ((l - mu) / s) ** 2);

interface Endmember {
  key: string;
  label: string;
  color: string;
  note: string;
  reflectance: (l: number) => number;
}

const ENDMEMBERS: Endmember[] = [
  {
    key: 'veg',
    label: '健康植被',
    color: '#2e9e3a',
    note: '叶绿素吸收蓝光和红光，反射一点绿光；680~750 nm 反射率陡升（红边），近红外叶片内部多次散射，反射率很高',
    reflectance: l => 0.04 + 0.1 * bell(l, 550, 22) + 0.46 * sigmoid((l - 722) / 13) - 0.07 * bell(l, 975, 18)
  },
  {
    key: 'dry',
    label: '干草',
    color: '#c9a227',
    note: '叶绿素褪去，红光反射变多，没有明显红边',
    reflectance: l => 0.06 + 0.16 * sigmoid((l - 560) / 50) + 0.12 * sigmoid((l - 720) / 30)
  },
  {
    key: 'soil',
    label: '裸土',
    color: '#8a5a33',
    note: '反射率随波长平缓上升',
    reflectance: l => 0.08 + 0.0004 * (l - 400)
  },
  {
    key: 'water',
    label: '水体',
    color: '#1f5fbf',
    note: '蓝光反射最多，往长波迅速衰减，近红外几乎全被吸收',
    reflectance: l => 0.07 * Math.exp(-(l - 400) / 110)
  },
  {
    key: 'snow',
    label: '雪／云',
    color: '#8fb8d6',
    note: '可见光波段反射率都很高，所以是白的；近红外略降',
    reflectance: l => 0.95 - 0.00035 * (l - 400)
  },
  {
    key: 'concrete',
    label: '混凝土／屋顶',
    color: '#777777',
    note: '灰色，反射率平坦且中等',
    reflectance: l => 0.2 + 0.00015 * (l - 400)
  }
];

const ENDMEMBER_SPECTRA: number[][] = ENDMEMBERS.map(e => R_WAVELENGTHS.map(e.reflectance));

interface Band {
  key: string;
  label: string;
  center: number;
  fwhm: number;
}

/** 类似 Sentinel-2 的波段设置（中心波长与带宽取近似值） */
const BANDS: Band[] = [
  {key: 'B2', label: '蓝 B2', center: 490, fwhm: 65},
  {key: 'B3', label: '绿 B3', center: 560, fwhm: 35},
  {key: 'B4', label: '红 B4', center: 665, fwhm: 30},
  {key: 'B8', label: '近红外 B8', center: 842, fwhm: 115}
];

const BAND_INDEX = {B2: 0, B3: 1, B4: 2, B8: 3};

const bandWeights = (b: Band): number[] => {
  const sigma = b.fwhm / 2.355;
  const w = R_WAVELENGTHS.map(l => bell(l, b.center, sigma));
  const sum = w.reduce((a, v) => a + v, 0);
  return w.map(v => v / sum);
};

const BAND_WEIGHTS = BANDS.map(bandWeights);

/** 光谱 → 4 个波段的平均反射率 */
const bandValues = (spectrum: number[]): number[] => {
  return BAND_WEIGHTS.map(w => w.reduce((s, v, i) => s + v * spectrum[i], 0));
};

const ENDMEMBER_BANDS: number[][] = ENDMEMBER_SPECTRA.map(bandValues);

const ndvi = (nir: number, red: number): number => (nir - red) / (nir + red + 1e-9);

interface NdviRow {
  label: string;
  red: number;
  nir: number;
  value: number;
}

const ndviRows = (): NdviRow[] => {
  return ENDMEMBERS.map((e, i) => {
    const b = ENDMEMBER_BANDS[i];
    const red = b[BAND_INDEX.B4];
    const nir = b[BAND_INDEX.B8];
    return {label: e.label, red, nir, value: ndvi(nir, red)};
  });
};

// ---------- 程序生成的地表 ----------

const MAP_W = 256;
const MAP_H = 192;
const COUNT = ENDMEMBERS.length;

interface LandMap {
  abundance: Float32Array; // 每像素 COUNT 个端元占比
  shade: Float32Array; // 地形明暗
  bands: Float32Array; // 每像素 4 个波段反射率（已含明暗）
}

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const V = 0;
const D = 1;
const S = 2;
const W = 3;
const SN = 4;
const C = 5;

let cached: LandMap | null = null;

const buildLandMap = (): LandMap => {
  const coarse = smoothNoise(MAP_W, MAP_H, 40, 11);
  const mid = smoothNoise(MAP_W, MAP_H, 12, 5);
  const fine = makeNoise(MAP_W, MAP_H, 4, 9);
  const abundance = new Float32Array(MAP_W * MAP_H * COUNT);
  const shade = new Float32Array(MAP_W * MAP_H);
  const bands = new Float32Array(MAP_W * MAP_H * 4);

  const elevation = (x: number, y: number): number => {
    const cx = Math.min(MAP_W - 1, Math.max(0, x));
    const cy = Math.min(MAP_H - 1, Math.max(0, y));
    return coarse(cx, cy) * 0.7 + (1 - Math.min(1, cy / 75)) * 0.55;
  };

  const FIELD_VIGOUR = [0.95, 0.75, 0.5, 0.25, 0.05, -1, 0.85, 0.6];

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const a = new Array<number>(COUNT).fill(0);
      const texture = 0.85 + 0.3 * fine(x, y);
      const hills = y < 78 && x < 175;
      const e = elevation(x, y);

      const lakeD = ((x - 205) / 36) ** 2 + ((y - 36) / 19) ** 2;
      const riverX = 204 + 14 * Math.sin((y - 55) * 0.075);
      const inRiver = y > 52 && Math.abs(x - riverX) < 2.6;

      if (lakeD < 1 || inRiver) {
        a[W] = 1;
      } else if (hills) {
        const snow = smoothstep(0.8, 0.92, e + 0.12 * (mid(x, y) - 0.5));
        const rock = smoothstep(0.62, 0.78, e);
        const meadow = (1 - rock) * (0.55 + 0.4 * (1 - e)) * texture;
        a[SN] = snow;
        a[S] = (1 - snow) * rock;
        a[V] = (1 - snow) * (1 - rock) * Math.min(1, meadow);
        a[D] = (1 - snow) * (1 - rock) * (1 - Math.min(1, meadow));
      } else if (x > 176 && y > 70 && y < 148) {
        const forest = smoothstep(0.35, 0.55, mid(x, y) + 0.1);
        a[V] = (0.9 + 0.1 * fine(x, y)) * forest;
        a[S] = 1 - a[V];
      } else if (x >= 176 && y >= 150) {
        const bx = (x - 176) % 14;
        const by = (y - 150) % 14;
        const block = bx < 10 && by < 9 && (Math.floor((x - 176) / 14) + Math.floor((y - 150) / 14)) % 3 !== 2;
        if (block) {
          a[C] = 1;
        } else if (bx < 12) {
          a[C] = 0.55;
          a[V] = 0.25 * texture;
          a[S] = 1 - a[C] - a[V];
        } else {
          a[V] = 0.4 * texture;
          a[S] = 1 - a[V];
        }
      } else {
        const fy = Math.floor((y - 80) / 36);
        const inFieldX = x >= 4 && x < 172;
        const inFieldY = y >= 80 && y < 188;
        const gapX = (x - 4) % 42 > 38;
        const gapY = (y - 80) % 36 > 32;
        if (inFieldX && inFieldY && !gapX && !gapY) {
          const k = (fy * 4 + Math.floor((x - 4) / 42)) % FIELD_VIGOUR.length;
          const vigour = FIELD_VIGOUR[k];
          if (vigour < 0) {
            a[D] = 0.85 * texture;
            a[S] = 1 - a[D];
          } else {
            a[V] = Math.min(1, vigour * texture);
            a[S] = 1 - a[V];
          }
        } else if (inFieldX && inFieldY) {
          a[C] = 0.8;
          a[S] = 0.2;
        } else {
          const v = Math.min(1, 0.55 + 0.4 * mid(x, y));
          a[V] = v;
          a[D] = (1 - v) * 0.7;
          a[S] = 1 - a[V] - a[D];
        }
      }

      const sum = a.reduce((s, v) => s + v, 0) || 1;
      const p = y * MAP_W + x;
      for (let k = 0; k < COUNT; k++) {
        abundance[p * COUNT + k] = a[k] / sum;
      }

      const slope = elevation(x - 1, y - 1) - elevation(x + 1, y + 1);
      shade[p] = hills ? Math.min(1.15, Math.max(0.5, 0.85 + slope * 5)) : 0.92 + 0.12 * fine(x, y);

      for (let b = 0; b < 4; b++) {
        let v = 0;
        for (let k = 0; k < COUNT; k++) {
          v += abundance[p * COUNT + k] * ENDMEMBER_BANDS[k][b];
        }
        bands[p * 4 + b] = v * shade[p];
      }
    }
  }
  return {abundance, shade, bands};
};

const getLandMap = (): LandMap => {
  if (!cached) {
    cached = buildLandMap();
  }
  return cached;
};

interface PixelInfo {
  abundance: number[];
  bands: number[];
  ndvi: number;
  spectrum: number[];
  dominant: string;
}

const pixelInfo = (x: number, y: number): PixelInfo => {
  const map = getLandMap();
  const px = Math.min(MAP_W - 1, Math.max(0, Math.floor(x)));
  const py = Math.min(MAP_H - 1, Math.max(0, Math.floor(y)));
  const p = py * MAP_W + px;
  const abundance = Array.from({length: COUNT}, (_, k) => map.abundance[p * COUNT + k]);
  const bands = Array.from({length: 4}, (_, b) => map.bands[p * 4 + b]);
  const spectrum = R_WAVELENGTHS.map((_, i) => {
    let v = 0;
    abundance.forEach((f, k) => {
      v += f * ENDMEMBER_SPECTRA[k][i];
    });
    return v * map.shade[p];
  });
  let best = 0;
  abundance.forEach((f, k) => {
    if (f > abundance[best]) {
      best = k;
    }
  });
  return {
    abundance,
    bands,
    ndvi: ndvi(bands[BAND_INDEX.B8], bands[BAND_INDEX.B4]),
    spectrum,
    dominant: ENDMEMBERS[best].label
  };
};

export {
  R_MIN,
  R_MAX,
  R_WAVELENGTHS,
  ENDMEMBERS,
  ENDMEMBER_SPECTRA,
  BANDS,
  BAND_INDEX,
  MAP_W,
  MAP_H,
  COUNT,
  ndvi,
  ndviRows,
  getLandMap,
  pixelInfo
};
export type {Endmember, Band, LandMap, PixelInfo, NdviRow};
