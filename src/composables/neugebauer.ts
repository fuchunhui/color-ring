import {rgbCss, text} from '../utils/spectral';
import type {Vec3} from '../utils/space';
import {
  PRIMARY_COLORS,
  PRIMARY_KEYS,
  PRIMARY_LABELS,
  apparentArea,
  cyanSpectrum,
  demichel,
  mechanicalGain,
  predictSpectrum,
  spectrumColor
} from '../utils/neugebauer';

const BARS_W = 580;
const BARS_H = 230;
const CURVE_W = 380;
const CURVE_H = 346;
const RAMP_W = 640;
const RAMP_H = 178;
const DOT_SIZE = 200;
const DOT_CELLS = 8;

/** 8 个 Demichel 权重（每种组合所占面积）的柱状图 */
const drawDemichel = (ctx: CanvasRenderingContext2D, c: number, m: number, y: number): void => {
  const weights = demichel(c, m, y);
  const base = 170;
  const barW = 48;
  const gap = 20;
  ctx.strokeStyle = '#CCC';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, base + 0.5);
  ctx.lineTo(BARS_W - 10, base + 0.5);
  ctx.stroke();
  PRIMARY_KEYS.forEach((key, i) => {
    const x = 40 + i * (barW + gap);
    const h = weights[key] * 140;
    ctx.fillStyle = rgbCss(PRIMARY_COLORS[key]);
    ctx.fillRect(x, base - h, barW, h);
    ctx.strokeStyle = '#999';
    ctx.strokeRect(x + 0.5, base - h + 0.5, barW - 1, h);
    text(ctx, `${(weights[key] * 100).toFixed(1)}%`, x + barW / 2, base - h - 9, 'center', '#333', '11px sans-serif');
    text(ctx, PRIMARY_LABELS[key], x + barW / 2, base + 14, 'center', '#333', '11px sans-serif');
  });
  text(ctx, 'Demichel 权重：8 种叠印组合各占的面积', 30, 12, 'left', '#333', '12px sans-serif');
};

/** 网点扩大曲线：标称面积 → 表观面积 */
const drawGainCurve = (ctx: CanvasRenderingContext2D, g: number, n: number): void => {
  const area = {x: 50, y: 34, w: 290, h: 270};
  const px = (v: number): number => area.x + v * area.w;
  const py = (v: number): number => area.y + area.h - v * area.h;
  ctx.strokeStyle = '#E4E4E4';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const v = i / 4;
    ctx.beginPath();
    ctx.moveTo(px(v) + 0.5, area.y);
    ctx.lineTo(px(v) + 0.5, area.y + area.h);
    ctx.moveTo(area.x, py(v) + 0.5);
    ctx.lineTo(area.x + area.w, py(v) + 0.5);
    ctx.stroke();
    text(ctx, `${v * 100}%`, px(v), area.y + area.h + 12, 'center', '#555', '11px sans-serif');
    text(ctx, `${v * 100}%`, area.x - 6, py(v), 'right', '#555', '11px sans-serif');
  }
  text(ctx, '标称网点面积', area.x + area.w / 2, area.y + area.h + 28, 'center', '#333', '12px sans-serif');
  text(ctx, '表观网点面积', 8, 12, 'left', '#333', '12px sans-serif');
  const steps = 40;
  const curve = (fn: (a: number) => number, color: string, dash: number[] = []): void => {
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = i / steps;
      const x = px(a);
      const y = py(Math.min(1, Math.max(0, fn(a))));
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  };
  curve(a => a, '#999', [4, 4]);
  curve(a => mechanicalGain(a, g), '#1971C2');
  curve(a => apparentArea(a, n), '#E8590C');
  curve(a => apparentArea(mechanicalGain(a, g), n), '#C92A2A');
  const legend: [string, string][] = [
    ['#999', '理想（无扩大）'],
    ['#1971C2', '机械网点扩大'],
    ['#E8590C', '光学扩大 Yule–Nielsen'],
    ['#C92A2A', '机械 + 光学']
  ];
  legend.forEach(([color, label], i) => {
    ctx.fillStyle = color;
    ctx.fillRect(area.x + 10, area.y + 14 + i * 18 - 2, 16, 3);
    text(ctx, label, area.x + 32, area.y + 14 + i * 18, 'left', '#333', '11px sans-serif');
  });
};

const RAMP_STEPS = 17;

type RampKind = 'cyan' | 'gray';

const rampColor = (kind: RampKind, a: number): [number, number, number] => (kind === 'cyan' ? [a, 0, 0] : [a, a, a]);

/** 三行色条：理想 / 加机械扩大 / 再加光学 Yule–Nielsen */
const drawRamp = (ctx: CanvasRenderingContext2D, kind: RampKind, g: number, n: number): void => {
  const rows: {label: string; gain: boolean; nn: number}[] = [
    {label: '理想（n = 1）', gain: false, nn: 1},
    {label: '机械扩大', gain: true, nn: 1},
    {label: '机械 + 光学', gain: true, nn: n}
  ];
  const x0 = 112;
  const w = RAMP_W - x0 - 10;
  const cellW = w / RAMP_STEPS;
  rows.forEach((row, r) => {
    const y = 26 + r * 40;
    text(ctx, row.label, x0 - 8, y + 16, 'right', '#333', '12px sans-serif');
    for (let i = 0; i < RAMP_STEPS; i++) {
      const a = i / (RAMP_STEPS - 1);
      const eff = row.gain ? mechanicalGain(a, g) : a;
      const [c, m, yy] = rampColor(kind, eff);
      ctx.fillStyle = rgbCss(spectrumColor(predictSpectrum(c, m, yy, row.nn)));
      ctx.fillRect(x0 + i * cellW, y, cellW + 0.5, 32);
    }
  });
  [0, 25, 50, 75, 100].forEach(p => {
    text(ctx, `${p}%`, x0 + cellW / 2 + p / 100 * (w - cellW), 26 + 3 * 40 + 6, 'center', '#555', '11px sans-serif');
  });
  text(ctx, kind === 'cyan' ? '青墨网点面积 0 → 100%' : '青 = 品红 = 黄 = 同一网点面积（灰平衡）', x0, 12, 'left', '#333', '12px sans-serif');
};

// ---------- 放大的网点 ----------

const coverageMap = (a: number): Float32Array => {
  const cell = DOT_SIZE / DOT_CELLS;
  const radius = Math.sqrt(a / Math.PI) * cell;
  const map = new Float32Array(DOT_SIZE * DOT_SIZE);
  const sub = 3;
  for (let y = 0; y < DOT_SIZE; y++) {
    for (let x = 0; x < DOT_SIZE; x++) {
      let hit = 0;
      for (let sy = 0; sy < sub; sy++) {
        for (let sx = 0; sx < sub; sx++) {
          const fx = x + (sx + 0.5) / sub;
          const fy = y + (sy + 0.5) / sub;
          const dx = (fx % cell) - cell / 2;
          const dy = (fy % cell) - cell / 2;
          if (dx * dx + dy * dy <= radius * radius) {
            hit++;
          }
        }
      }
      map[y * DOT_SIZE + x] = hit / (sub * sub);
    }
  }
  return map;
};

const gaussianBlur = (src: Float32Array, sigma: number): Float32Array => {
  if (sigma < 0.3) {
    return src;
  }
  const radius = Math.ceil(sigma * 3);
  const kernel = Array.from({length: radius * 2 + 1}, (_, i) => Math.exp(-((i - radius) ** 2) / (2 * sigma * sigma)));
  const total = kernel.reduce((s, v) => s + v, 0);
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const clampIndex = (i: number): number => Math.min(DOT_SIZE - 1, Math.max(0, i));
  for (let y = 0; y < DOT_SIZE; y++) {
    for (let x = 0; x < DOT_SIZE; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        sum += src[y * DOT_SIZE + clampIndex(x + k)] * kernel[k + radius];
      }
      tmp[y * DOT_SIZE + x] = sum / total;
    }
  }
  for (let y = 0; y < DOT_SIZE; y++) {
    for (let x = 0; x < DOT_SIZE; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        sum += tmp[clampIndex(y + k) * DOT_SIZE + x] * kernel[k + radius];
      }
      out[y * DOT_SIZE + x] = sum / total;
    }
  }
  return out;
};

type DotKind = 'ideal' | 'gain' | 'optical';

const LUT_SIZE = 64;

/** 局部油墨覆盖率 f → 颜色：带 Yule–Nielsen 修正的混合 */
const colorLut = (n: number): Vec3[] => {
  return Array.from({length: LUT_SIZE + 1}, (_, i) => spectrumColor(cyanSpectrum(i / LUT_SIZE, n)));
};

const drawDots = (ctx: CanvasRenderingContext2D, kind: DotKind, a: number, g: number, n: number, scatter: number): void => {
  const nominal = Math.min(0.75, Math.max(0.02, a));
  const area = kind === 'ideal' ? nominal : mechanicalGain(nominal, g);
  const raw = coverageMap(Math.min(0.78, area));
  const map = kind === 'optical' ? gaussianBlur(raw, scatter) : raw;
  const lut = colorLut(kind === 'optical' ? n : 1);
  const out = ctx.createImageData(DOT_SIZE, DOT_SIZE);
  for (let p = 0; p < DOT_SIZE * DOT_SIZE; p++) {
    const color = lut[Math.round(Math.min(1, Math.max(0, map[p])) * LUT_SIZE)];
    out.data[p * 4] = color[0];
    out.data[p * 4 + 1] = color[1];
    out.data[p * 4 + 2] = color[2];
    out.data[p * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
};

export {
  BARS_W,
  BARS_H,
  CURVE_W,
  CURVE_H,
  RAMP_W,
  RAMP_H,
  DOT_SIZE,
  DOT_CELLS,
  drawDemichel,
  drawGainCurve,
  drawRamp,
  drawDots
};
export type {RampKind, DotKind};
