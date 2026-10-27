import {makePhotoScene, toSrgbBytes} from '../utils/scene';
import {SPACES, BIT_MODES, runRoundTrips, quantise, stretch} from '../utils/roundtrip';
import type {SpaceKey, RoundTripStats} from '../utils/roundtrip';
import {hsvToRgb} from '../utils/testimage';
import {text} from '../utils/spectral';
import type {DrawFn} from '../utils/spectral';

const IMG_W = 192;
const IMG_H = 128;
const MAX_N = 50;

type InputKey = 'gradient' | 'photo';

const inputCache: Record<string, Uint8ClampedArray> = {};

const gradientImage = (): Uint8ClampedArray => {
  const px = new Uint8ClampedArray(IMG_W * IMG_H * 4);
  for (let y = 0; y < IMG_H; y++) {
    for (let x = 0; x < IMG_W; x++) {
      const u = x / (IMG_W - 1);
      let rgb: [number, number, number];
      if (y < 32) {
        rgb = hsvToRgb(u * 360, 1, 1);
      } else if (y < 64) {
        rgb = hsvToRgb(u * 360, 0.45, 0.8);
      } else if (y < 96) {
        const g = Math.round(u * 255);
        rgb = [g, g, g];
      } else {
        rgb = [0, 0, Math.round(u * 255)];
      }
      const i = (y * IMG_W + x) * 4;
      px[i] = Math.round(rgb[0]);
      px[i + 1] = Math.round(rgb[1]);
      px[i + 2] = Math.round(rgb[2]);
      px[i + 3] = 255;
    }
  }
  return px;
};

const getInput = (key: InputKey): Uint8ClampedArray => {
  if (!inputCache[key]) {
    inputCache[key] = key === 'gradient' ? gradientImage() : toSrgbBytes(makePhotoScene(IMG_W, IMG_H).image);
  }
  return inputCache[key];
};

const statsCache = new Map<string, RoundTripStats>();

const getStats = (input: InputKey, space: SpaceKey): RoundTripStats => {
  const id = `${input}/${space}`;
  let s = statsCache.get(id);
  if (!s) {
    s = runRoundTrips(getInput(input), IMG_W, IMG_H, space, MAX_N);
    statsCache.set(id, s);
  }
  return s;
};

const putBytes = (ctx: CanvasRenderingContext2D, bytes: Uint8ClampedArray, x: number, y: number): void => {
  const data = new ImageData(new Uint8ClampedArray(bytes), IMG_W, IMG_H);
  ctx.putImageData(data, x, y);
};

const makeTilesDraw = (input: () => InputKey, space: () => SpaceKey, count: () => number): DrawFn => (ctx, w, h) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const src = getInput(input());
  const stats = getStats(input(), space());
  const n = count();
  const after = stats.snapshots[n - 1];
  const err = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const d = (Math.abs(src[i] - after[i]) + Math.abs(src[i + 1] - after[i + 1]) + Math.abs(src[i + 2] - after[i + 2])) / 3;
    const v = 255 - Math.min(255, d * 16);
    err[i] = v;
    err[i + 1] = v;
    err[i + 2] = v;
    err[i + 3] = 255;
  }
  const gap = 12;
  putBytes(ctx, src, 0, 20);
  putBytes(ctx, after, IMG_W + gap, 20);
  putBytes(ctx, err, (IMG_W + gap) * 2, 20);
  text(ctx, '原图', 0, 10, 'left', '#333', '12px sans-serif');
  text(ctx, `往返 ${n} 次后`, IMG_W + gap, 10, 'left', '#333', '12px sans-serif');
  text(ctx, '误差（放大 16 倍，越黑越大）', (IMG_W + gap) * 2, 10, 'left', '#333', '12px sans-serif');
};

const TILES_W = IMG_W * 3 + 24;
const TILES_H = IMG_H + 24;
const PLOT_W = 560;
const PLOT_H = 220;

const makeErrorPlotDraw = (input: () => InputKey, space: () => SpaceKey, count: () => number): DrawFn => (ctx, w, h) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const stats = getStats(input(), space());
  const a = {x: 46, y: 16, w: w - 70, h: h - 50};
  const maxY = Math.max(1, ...stats.max) * 1.1;
  const px = (n: number): number => a.x + (n - 1) / (MAX_N - 1) * a.w;
  const py = (v: number): number => a.y + a.h - v / maxY * a.h;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;
  for (let k = 0; k <= 4; k++) {
    const v = maxY * k / 4;
    ctx.beginPath();
    ctx.moveTo(a.x, Math.round(py(v)) + 0.5);
    ctx.lineTo(a.x + a.w, Math.round(py(v)) + 0.5);
    ctx.stroke();
    text(ctx, v.toFixed(1), a.x - 6, py(v), 'right', '#555', '11px sans-serif');
  }
  [1, 10, 20, 30, 40, 50].forEach(n => text(ctx, `${n}`, px(n), a.y + a.h + 12, 'center', '#555', '11px sans-serif'));
  text(ctx, '往返次数', a.x + a.w / 2, h - 8, 'center', '#333', '12px sans-serif');
  const series: [number[], string, string][] = [[stats.max, '#E03131', '最大误差（码值）'], [stats.mean, '#1C7ED6', '平均误差（码值）']];
  series.forEach(([values, color, label], i) => {
    ctx.beginPath();
    values.forEach((v, k) => {
      if (k === 0) {
        ctx.moveTo(px(k + 1), py(v));
      } else {
        ctx.lineTo(px(k + 1), py(v));
      }
    });
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(a.x + 10, a.y + 6 + i * 16, 16, 3);
    text(ctx, label, a.x + 32, a.y + 8 + i * 16, 'left', '#222', '11px sans-serif');
  });
  const n = count();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = '#888';
  ctx.beginPath();
  ctx.moveTo(px(n), a.y);
  ctx.lineTo(px(n), a.y + a.h);
  ctx.stroke();
  ctx.setLineDash([]);
};

const originalUnique = (input: InputKey): number => {
  const px = getInput(input);
  const set = new Set<number>();
  for (let i = 0; i < px.length; i += 4) {
    set.add((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
  }
  return set.size;
};

// ---------- 位深条带 ----------

const BAND_W = 560;
const BAND_H = BIT_MODES.length * 44 + 30;

const drawBands: DrawFn = (ctx, w, h) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const left = 70;
  const bw = w - left - 8;
  text(ctx, '每格上：直接取整；下：Bayer 8×8 抖动', left, 10, 'left', '#555', '11px sans-serif');
  BIT_MODES.forEach((m, r) => {
    const y0 = 22 + r * 44;
    text(ctx, m.label, left - 8, y0 + 19, 'right', '#222', '12px sans-serif');
    [false, true].forEach((dither, k) => {
      const img = ctx.createImageData(bw, 18);
      for (let y = 0; y < 18; y++) {
        for (let x = 0; x < bw; x++) {
          const v = x / (bw - 1);
          const i = (y * bw + x) * 4;
          for (let c = 0; c < 3; c++) {
            img.data[i + c] = Math.round(quantise(v, 2 ** m.bits[c], dither, x, y + k * 18) * 255);
          }
          img.data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, left, y0 + k * 19);
    });
  });
};

// ---------- 拉伸后的直方图 ----------

const HIST_W = 560;
const HIST_H = 330;

const SRC_W = 512;

/** 一条低反差的平滑渐变（只占中间一小段亮度），线性分布 */
const smoothValue = (x: number): number => 0.42 + 0.16 * x;

const makeHistDraw = (gain: () => number): DrawFn => (ctx, w, h) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const g = gain();
  const modes: [string, boolean][] = [['8 位源文件', true], ['16 位 / 浮点源文件', false]];
  modes.forEach(([label, is8], m) => {
    const y0 = m * 160 + 8;
    const hist = new Array(256).fill(0);
    const img = ctx.createImageData(SRC_W, 20);
    const samples = SRC_W * 16;
    for (let s = 0; s < samples; s++) {
      let v = smoothValue(s / (samples - 1));
      if (is8) {
        v = Math.round(v * 255) / 255;
      }
      hist[Math.round(stretch(v, g) * 255)] += 1;
    }
    for (let x = 0; x < SRC_W; x++) {
      let v = smoothValue(x / (SRC_W - 1));
      if (is8) {
        v = Math.round(v * 255) / 255;
      }
      const out = Math.round(stretch(v, g) * 255);
      for (let y = 0; y < 20; y++) {
        const i = (y * SRC_W + x) * 4;
        img.data[i] = out;
        img.data[i + 1] = out;
        img.data[i + 2] = out;
        img.data[i + 3] = 255;
      }
    }
    text(ctx, `${label}（拉伸 ${g.toFixed(1)}×后的 8 位输出）`, 8, y0 + 4, 'left', '#333', '12px sans-serif');
    ctx.putImageData(img, 8, y0 + 14);
    const hx = 8;
    const hy = y0 + 40;
    const hh = 100;
    const maxH = Math.max(...hist, 1);
    ctx.fillStyle = '#F1F3F5';
    ctx.fillRect(hx, hy, 512, hh);
    ctx.fillStyle = '#495057';
    hist.forEach((c, i) => {
      const bar = c / maxH * (hh - 4);
      ctx.fillRect(hx + i * 2, hy + hh - bar, 2, bar);
    });
    const first = hist.findIndex(c => c > 0);
    const last = hist.length - 1 - [...hist].reverse().findIndex(c => c > 0);
    const empty = hist.filter((c, i) => c === 0 && i > first && i < last).length;
    text(ctx, `空缺的码值：${empty}`, hx + 512 - 4, hy + 10, 'right', '#C92A2A', '12px sans-serif');
  });
};

export {
  SPACES,
  IMG_W,
  IMG_H,
  MAX_N,
  TILES_W,
  TILES_H,
  PLOT_W,
  PLOT_H,
  BAND_W,
  BAND_H,
  HIST_W,
  HIST_H,
  getStats,
  originalUnique,
  makeTilesDraw,
  makeErrorPlotDraw,
  drawBands,
  makeHistDraw
};
export type {InputKey};
