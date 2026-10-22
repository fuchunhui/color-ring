import {Vec3, srgbToLinear} from './space';
import {mulberry32} from './scene';

type Method = 'nearest' | 'bayer4' | 'bayer8' | 'floyd' | 'atkinson' | 'random';

interface Palette {
  colors: Vec3[]; // sRGB 编码值 0~255
  spread: number; // 有序抖动的幅度，编码空间 0~1
}

const METHODS: {key: Method; label: string}[] = [
  {key: 'nearest', label: '最近色（无抖动）'},
  {key: 'bayer4', label: '有序抖动 Bayer 4×4'},
  {key: 'bayer8', label: '有序抖动 Bayer 8×8'},
  {key: 'floyd', label: 'Floyd–Steinberg'},
  {key: 'atkinson', label: 'Atkinson'},
  {key: 'random', label: '随机噪声'}
];

const bayerMatrix = (size: number): number[][] => {
  let m = [[0]];
  const base = [[0, 2], [3, 1]];
  while (m.length < size) {
    const n = m.length;
    const next = Array.from({length: n * 2}, () => new Array<number>(n * 2).fill(0));
    for (let y = 0; y < n * 2; y++) {
      for (let x = 0; x < n * 2; x++) {
        next[y][x] = 4 * m[y % n][x % n] + base[Math.floor(y / n)][Math.floor(x / n)];
      }
    }
    m = next;
  }
  return m.map(row => row.map(v => (v + 0.5) / (size * size)));
};

const BAYER4 = bayerMatrix(4);
const BAYER8 = bayerMatrix(8);

const FLOYD: [number, number, number][] = [
  [1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]
];

const ATKINSON: [number, number, number][] = [
  [1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]
];

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

const toWorking = (code: number, linear: boolean): number => {
  return linear ? srgbToLinear(code / 255) : code / 255;
};

/** 在已排序的工作空间灰阶 levels 中选一级；t 为阈值（0.5 即最近色） */
const pickLevel = (levels: number[], v: number, t: number): number => {
  const last = levels.length - 1;
  if (v <= levels[0]) {
    return 0;
  }
  if (v >= levels[last]) {
    return last;
  }
  let i = 0;
  while (levels[i + 1] <= v) {
    i++;
  }
  const frac = (v - levels[i]) / (levels[i + 1] - levels[i]);
  return frac > t ? i + 1 : i;
};

const kernelOf = (method: Method): [number, number, number][] | null => {
  if (method === 'floyd') {
    return FLOYD;
  }
  return method === 'atkinson' ? ATKINSON : null;
};

const thresholdOf = (method: Method, x: number, y: number, rand: () => number): number => {
  if (method === 'bayer4') {
    return BAYER4[y % 4][x % 4];
  }
  if (method === 'bayer8') {
    return BAYER8[y % 8][x % 8];
  }
  return method === 'random' ? rand() : 0.5;
};

/** 灰度量化：levels 级灰阶，linear 为真时在线性光里判定与扩散误差 */
const ditherGray = (
  src: Uint8ClampedArray,
  width: number,
  height: number,
  levelCount: number,
  method: Method,
  linear: boolean
): Uint8ClampedArray => {
  const codes = Array.from({length: levelCount}, (_, k) => Math.round(255 * k / (levelCount - 1)));
  const levels = codes.map(c => toWorking(c, linear));
  const out = new Uint8ClampedArray(width * height * 4);
  const kernel = kernelOf(method);
  const buf = new Float32Array(width * height);
  const rand = mulberry32(11);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = toWorking(src[i * 4], linear);
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const v = clamp01(buf[i]);
      const idx = pickLevel(levels, v, kernel ? 0.5 : thresholdOf(method, x, y, rand));
      if (kernel) {
        const err = v - levels[idx];
        kernel.forEach(([dx, dy, w]) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny < height) {
            buf[ny * width + nx] += err * w;
          }
        });
      }
      out[i * 4] = codes[idx];
      out[i * 4 + 1] = codes[idx];
      out[i * 4 + 2] = codes[idx];
      out[i * 4 + 3] = 255;
    }
  }
  return out;
};

const gridPalette = (counts: [number, number, number]): Palette => {
  const colors: Vec3[] = [];
  const level = (k: number, n: number) => Math.round(255 * k / (n - 1));
  for (let r = 0; r < counts[0]; r++) {
    for (let g = 0; g < counts[1]; g++) {
      for (let b = 0; b < counts[2]; b++) {
        colors.push([level(r, counts[0]), level(g, counts[1]), level(b, counts[2])]);
      }
    }
  }
  return {colors, spread: 1 / (Math.min(...counts) - 1)};
};

/** 中位切分：不断沿范围最大的通道把最大的色盒从中位数切开，取各盒均值 */
const medianCutPalette = (src: Uint8ClampedArray, count: number): Palette => {
  const pixels: Vec3[] = [];
  for (let i = 0; i < src.length; i += 4) {
    pixels.push([src[i], src[i + 1], src[i + 2]]);
  }
  const rangeOf = (box: Vec3[]): [number, number] => {
    let best = 0;
    let channel = 0;
    for (let c = 0; c < 3; c++) {
      let lo = 255;
      let hi = 0;
      box.forEach(p => {
        lo = Math.min(lo, p[c]);
        hi = Math.max(hi, p[c]);
      });
      if (hi - lo > best) {
        best = hi - lo;
        channel = c;
      }
    }
    return [best, channel];
  };
  const boxes: Vec3[][] = [pixels];
  while (boxes.length < count) {
    let target = -1;
    let widest = 0;
    boxes.forEach((box, i) => {
      const [range] = rangeOf(box);
      if (box.length > 1 && range > widest) {
        widest = range;
        target = i;
      }
    });
    if (target < 0) {
      break;
    }
    const box = boxes[target];
    const channel = rangeOf(box)[1];
    box.sort((a, b) => a[channel] - b[channel]);
    const mid = Math.floor(box.length / 2);
    boxes.splice(target, 1, box.slice(0, mid), box.slice(mid));
  }
  const colors = boxes.map(box => {
    const sum = [0, 0, 0];
    box.forEach(p => {
      sum[0] += p[0];
      sum[1] += p[1];
      sum[2] += p[2];
    });
    return sum.map(v => Math.round(v / box.length)) as Vec3;
  });
  return {colors, spread: 1 / Math.cbrt(colors.length)};
};

interface PaletteOption {
  key: string;
  label: string;
}

const PALETTE_OPTIONS: PaletteOption[] = [
  {key: 'grid2', label: '每通道 2 级（8 色）'},
  {key: 'median4', label: '中位切分 4 色'},
  {key: 'median8', label: '中位切分 8 色'},
  {key: 'median16', label: '中位切分 16 色'},
  {key: 'rgb332', label: 'RGB332（256 色）'},
  {key: 'web216', label: '网页安全色（216 色）'}
];

const buildPalette = (key: string, src: Uint8ClampedArray): Palette => {
  switch (key) {
    case 'grid2':
      return gridPalette([2, 2, 2]);
    case 'rgb332':
      return gridPalette([8, 8, 4]);
    case 'web216':
      return gridPalette([6, 6, 6]);
    default:
      return medianCutPalette(src, Number(key.replace('median', '')));
  }
};

/** 彩色量化到调色板 */
const ditherColor = (
  src: Uint8ClampedArray,
  width: number,
  height: number,
  palette: Palette,
  method: Method,
  linear: boolean
): Uint8ClampedArray => {
  const pal = palette.colors;
  const pw = pal.map(c => c.map(v => toWorking(v, linear)));
  const out = new Uint8ClampedArray(width * height * 4);
  const kernel = kernelOf(method);
  const rand = mulberry32(5);
  const buf = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    for (let c = 0; c < 3; c++) {
      buf[i * 3 + c] = toWorking(src[i * 4 + c], linear);
    }
  }

  const nearest = (r: number, g: number, b: number): number => {
    let best = 0;
    let bestD = Infinity;
    for (let k = 0; k < pw.length; k++) {
      const dr = r - pw[k][0];
      const dg = g - pw[k][1];
      const db = b - pw[k][2];
      const d = dr * dr + dg * dg + db * db;
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    return best;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let idx: number;
      if (kernel) {
        const v = [0, 1, 2].map(c => clamp01(buf[i * 3 + c]));
        idx = nearest(v[0], v[1], v[2]);
        kernel.forEach(([dx, dy, w]) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny < height) {
            for (let c = 0; c < 3; c++) {
              buf[(ny * width + nx) * 3 + c] += (v[c] - pw[idx][c]) * w;
            }
          }
        });
      } else if (method === 'nearest') {
        idx = nearest(buf[i * 3], buf[i * 3 + 1], buf[i * 3 + 2]);
      } else {
        const offset = (thresholdOf(method, x, y, rand) - 0.5) * palette.spread;
        const v = [0, 1, 2].map(c => toWorking(clamp01(src[i * 4 + c] / 255 + offset) * 255, linear));
        idx = nearest(v[0], v[1], v[2]);
      }
      out[i * 4] = pal[idx][0];
      out[i * 4 + 1] = pal[idx][1];
      out[i * 4 + 2] = pal[idx][2];
      out[i * 4 + 3] = 255;
    }
  }
  return out;
};

export {
  Method,
  Palette,
  PaletteOption,
  METHODS,
  PALETTE_OPTIONS,
  buildPalette,
  ditherGray,
  ditherColor
};
