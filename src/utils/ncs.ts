import {Vec3, oklabToRgb, oklchToRgb} from './space';

/**
 * NCS（Natural Colour System）的近似实现，不是官方 NCS 数据。
 * 色相：Y、R、B、G 四个“原色”，两两之间分 10 档，共 40 档（如 Y90R）。
 * 色相角：沿 OKLCH 色相环以 Y≈100°、R≈25°、B≈250°、G≈155° 为锚点分段线性插值。
 * 纯色：该色相在 sRGB 色域内彩度最大的点（色域尖点）。
 * 配色：白、黑、纯色按 (白度 w, 黑度 s, 彩度 c) 的比例在 OKLab 中线性混合。
 */

const LETTERS = ['Y', 'R', 'B', 'G'];
// 沿 Y → R → B → G → Y 方向，OKLCH 色相角单调递减，展开成连续角度便于插值
const ANCHORS = [100, 25, -110, -205, -260];

const hueName = (index: number): string => {
  const base = Math.floor(index / 10) % 4;
  const step = index % 10;
  return step === 0 ? LETTERS[base] : `${LETTERS[base]}${step * 10}${LETTERS[(base + 1) % 4]}`;
};

const NCS_HUES: string[] = Array.from({length: 40}, (_, i) => hueName(i));

const hueAngle = (index: number): number => {
  const base = Math.floor(index / 10) % 4;
  const t = (index % 10) / 10;
  const angle = ANCHORS[base] + (ANCHORS[base + 1] - ANCHORS[base]) * t;
  return ((angle % 360) + 360) % 360;
};

interface Pure {
  L: number;
  C: number;
  h: number;
  rgb: Vec3;
}

const cache = new Map<number, Pure>();

const pureColor = (index: number): Pure => {
  const cached = cache.get(index);
  if (cached) {
    return cached;
  }
  const h = hueAngle(index);
  let best = {L: 0.5, C: 0};
  for (let L = 0.15; L <= 0.99; L += 0.01) {
    let lo = 0;
    let hi = 0.4;
    for (let k = 0; k < 18; k++) {
      const mid = (lo + hi) / 2;
      if (oklchToRgb([L, mid, h]).inGamut) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    if (lo > best.C) {
      best = {L, C: lo};
    }
  }
  const result = {...best, h, rgb: oklchToRgb([best.L, best.C, h]).rgb};
  cache.set(index, result);
  return result;
};

/** 黑度 s、彩度 c 为 0~100 的百分数，白度 w = 100 − s − c */
const nuanceColor = (index: number, s: number, c: number): Vec3 => {
  const pure = pureColor(index);
  const w = Math.max(0, 100 - s - c) / 100;
  const k = c / 100;
  const rad = pure.h * Math.PI / 180;
  const L = w + k * pure.L;
  const a = k * pure.C * Math.cos(rad);
  const b = k * pure.C * Math.sin(rad);
  return oklabToRgb([L, a, b]).rgb;
};

const pad = (n: number): string => String(Math.round(n)).padStart(2, '0');

const notation = (index: number, s: number, c: number): string => {
  return `S ${pad(s)}${pad(Math.min(c, 99))}-${NCS_HUES[index]}`;
};

export {
  NCS_HUES,
  hueAngle,
  pureColor,
  nuanceColor,
  notation
};
