import type {Vec3} from './space';
import {rgbToLab, labToRgb, rgbToXyz, xyzToRgb} from './space';

type SpaceKey = 'lab' | 'hsv' | 'ycbcr' | 'ycbcr420' | 'xyz';

interface SpaceInfo {
  key: SpaceKey;
  label: string;
  quantised: string;
}

const SPACES: SpaceInfo[] = [
  {key: 'lab', label: 'sRGB → Lab → sRGB', quantised: 'L* 映射到 0~255，a*、b* 加 128 后取整截断到 0~255（8 位 Lab，类似 TIFF）'},
  {key: 'hsv', label: 'sRGB → HSV → sRGB', quantised: 'H 映射到 0~255（360° 分成 256 份），S、V 各取 0~255'},
  {key: 'ycbcr', label: 'sRGB → YCbCr 4:4:4 → sRGB', quantised: 'JPEG 全范围 YCbCr，Y、Cb、Cr 各取 0~255'},
  {key: 'ycbcr420', label: 'sRGB → YCbCr 4:2:0 → sRGB', quantised: '同上，另外 Cb、Cr 在 2×2 范围内取平均，再放大回去'},
  {key: 'xyz', label: 'sRGB → XYZ → sRGB', quantised: '线性光 XYZ 按 X/0.9505、Y、Z/1.089 线性缩放到 0~255（暗部只剩很少的码值）'}
];

const clamp8 = (v: number): number => Math.min(255, Math.max(0, Math.round(v)));

const toHsv = (r: number, g: number, b: number): Vec3 => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) {
      h = ((g - b) / d + 6) % 6;
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
  }
  return [h / 6, max === 0 ? 0 : d / max, max / 255];
};

const fromHsv = (h: number, s: number, v: number): Vec3 => {
  const k = (n: number): number => (n + h * 6) % 6;
  const f = (n: number): number => v - v * s * Math.max(0, Math.min(k(n), 4 - k(n), 1));
  return [f(5) * 255, f(3) * 255, f(1) * 255];
};

const hop: Record<SpaceKey, (px: Uint8ClampedArray, w: number, h: number) => void> = {
  lab(px) {
    for (let i = 0; i < px.length; i += 4) {
      const [l, a, b] = rgbToLab([px[i], px[i + 1], px[i + 2]]);
      const ql = clamp8(l * 2.55);
      const qa = clamp8(a + 128);
      const qb = clamp8(b + 128);
      const out = labToRgb([ql / 2.55, qa - 128, qb - 128]).rgb;
      px[i] = out[0];
      px[i + 1] = out[1];
      px[i + 2] = out[2];
    }
  },
  hsv(px) {
    for (let i = 0; i < px.length; i += 4) {
      const [h, s, v] = toHsv(px[i], px[i + 1], px[i + 2]);
      const qh = clamp8(h * 256) % 256;
      const out = fromHsv(qh / 256, clamp8(s * 255) / 255, clamp8(v * 255) / 255);
      px[i] = clamp8(out[0]);
      px[i + 1] = clamp8(out[1]);
      px[i + 2] = clamp8(out[2]);
    }
  },
  ycbcr(px) {
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      const y = clamp8(0.299 * r + 0.587 * g + 0.114 * b);
      const cb = clamp8(128 - 0.168736 * r - 0.331264 * g + 0.5 * b);
      const cr = clamp8(128 + 0.5 * r - 0.418688 * g - 0.081312 * b);
      px[i] = clamp8(y + 1.402 * (cr - 128));
      px[i + 1] = clamp8(y - 0.344136 * (cb - 128) - 0.714136 * (cr - 128));
      px[i + 2] = clamp8(y + 1.772 * (cb - 128));
    }
  },
  ycbcr420(px, w, h) {
    const n = w * h;
    const y = new Uint8Array(n);
    const cb = new Float32Array(n);
    const cr = new Float32Array(n);
    for (let p = 0; p < n; p++) {
      const r = px[p * 4];
      const g = px[p * 4 + 1];
      const b = px[p * 4 + 2];
      y[p] = clamp8(0.299 * r + 0.587 * g + 0.114 * b);
      cb[p] = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      cr[p] = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    }
    for (let by = 0; by < h; by += 2) {
      for (let bx = 0; bx < w; bx += 2) {
        let sb = 0;
        let sr = 0;
        let c = 0;
        for (let dy = 0; dy < 2 && by + dy < h; dy++) {
          for (let dx = 0; dx < 2 && bx + dx < w; dx++) {
            sb += cb[(by + dy) * w + bx + dx];
            sr += cr[(by + dy) * w + bx + dx];
            c++;
          }
        }
        const qb = clamp8(sb / c);
        const qr = clamp8(sr / c);
        for (let dy = 0; dy < 2 && by + dy < h; dy++) {
          for (let dx = 0; dx < 2 && bx + dx < w; dx++) {
            cb[(by + dy) * w + bx + dx] = qb;
            cr[(by + dy) * w + bx + dx] = qr;
          }
        }
      }
    }
    for (let p = 0; p < n; p++) {
      px[p * 4] = clamp8(y[p] + 1.402 * (cr[p] - 128));
      px[p * 4 + 1] = clamp8(y[p] - 0.344136 * (cb[p] - 128) - 0.714136 * (cr[p] - 128));
      px[p * 4 + 2] = clamp8(y[p] + 1.772 * (cb[p] - 128));
    }
  },
  xyz(px) {
    for (let i = 0; i < px.length; i += 4) {
      const [x, y, z] = rgbToXyz([px[i], px[i + 1], px[i + 2]]);
      const qx = clamp8(x / 0.95047 * 255);
      const qy = clamp8(y * 255);
      const qz = clamp8(z / 1.08883 * 255);
      const out = xyzToRgb([qx / 255 * 0.95047, qy / 255, qz / 255 * 1.08883]).rgb;
      px[i] = out[0];
      px[i + 1] = out[1];
      px[i + 2] = out[2];
    }
  }
};

interface RoundTripStats {
  max: number[];
  mean: number[];
  unique: number[];
  /** 第 n 次往返后的图像（n 从 1 开始，超过收敛点后保持不变） */
  snapshots: Uint8ClampedArray[];
  converged: number;
}

const uniqueColors = (px: Uint8ClampedArray): number => {
  const set = new Set<number>();
  for (let i = 0; i < px.length; i += 4) {
    set.add((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
  }
  return set.size;
};

const diffStats = (a: Uint8ClampedArray, b: Uint8ClampedArray): {max: number; mean: number} => {
  let max = 0;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const d = Math.abs(a[i + c] - b[i + c]);
      max = Math.max(max, d);
      sum += d;
      n++;
    }
  }
  return {max, mean: sum / n};
};

const same = (a: Uint8ClampedArray, b: Uint8ClampedArray): boolean => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

const runRoundTrips = (src: Uint8ClampedArray, w: number, h: number, key: SpaceKey, count: number): RoundTripStats => {
  const stats: RoundTripStats = {max: [], mean: [], unique: [], snapshots: [], converged: count};
  let cur = new Uint8ClampedArray(src);
  for (let n = 1; n <= count; n++) {
    const next = new Uint8ClampedArray(cur);
    hop[key](next, w, h);
    const d = diffStats(src, next);
    stats.max.push(d.max);
    stats.mean.push(d.mean);
    stats.unique.push(uniqueColors(next));
    stats.snapshots.push(next);
    if (same(cur, next)) {
      stats.converged = n;
      for (let k = n + 1; k <= count; k++) {
        stats.max.push(d.max);
        stats.mean.push(d.mean);
        stats.unique.push(stats.unique[n - 1]);
        stats.snapshots.push(next);
      }
      break;
    }
    cur = next;
  }
  return stats;
};

// ---------- 位深 ----------

const BAYER8 = (() => {
  const build = (n: number): number[][] => {
    if (n === 2) {
      return [[0, 2], [3, 1]];
    }
    const prev = build(n / 2);
    const size = n / 2;
    const m: number[][] = Array.from({length: n}, () => new Array(n).fill(0));
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = prev[y][x] * 4;
        m[y][x] = v;
        m[y][x + size] = v + 2;
        m[y + size][x] = v + 3;
        m[y + size][x + size] = v + 1;
      }
    }
    return m;
  };
  return build(8);
})();

/** 把 0~1 的值量化到 levels 级；dither 时用 8×8 Bayer 阈值（在编码值空间里做） */
const quantise = (v: number, levels: number, dither: boolean, x: number, y: number): number => {
  const scaled = Math.min(1, Math.max(0, v)) * (levels - 1);
  if (!dither) {
    return Math.round(scaled) / (levels - 1);
  }
  const t = (BAYER8[y & 7][x & 7] + 0.5) / 64;
  return Math.floor(scaled + t) / (levels - 1);
};

const BIT_MODES: {key: string; label: string; bits: [number, number, number]}[] = [
  {key: '3', label: '3 位', bits: [3, 3, 3]},
  {key: '4', label: '4 位', bits: [4, 4, 4]},
  {key: '5', label: '5 位', bits: [5, 5, 5]},
  {key: '565', label: 'RGB565', bits: [5, 6, 5]},
  {key: '6', label: '6 位', bits: [6, 6, 6]},
  {key: '8', label: '8 位', bits: [8, 8, 8]},
  {key: '10', label: '10 位', bits: [10, 10, 10]},
  {key: '12', label: '12 位', bits: [12, 12, 12]}
];

/** 对比度拉伸：以 0.5 为中心放大 gain 倍，输出固定为 8 位 */
const stretch = (v: number, gain: number): number => Math.min(1, Math.max(0, (v - 0.5) * gain + 0.5));

export {
  SpaceKey,
  SpaceInfo,
  RoundTripStats,
  SPACES,
  BIT_MODES,
  runRoundTrips,
  quantise,
  stretch,
  uniqueColors
};
