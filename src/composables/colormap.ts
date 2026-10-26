import {COLORMAPS, analyse, SIZE} from '../utils/colormaps';
import type {Colormap, Analysis} from '../utils/colormaps';
import {simulate} from '../utils/colorblind';
import {Vec3, srgbToLinear, linearToSrgb} from '../utils/space';

type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

const analyses: Analysis[] = COLORMAPS.map(analyse);

const text = (ctx: CanvasRenderingContext2D, str: string, x: number, y: number, color = '#444', align: CanvasTextAlign = 'left') => {
  ctx.fillStyle = color;
  ctx.font = '12px sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
};

const css = (c: Vec3): string => `rgb(${c[0]},${c[1]},${c[2]})`;

/** 一条 256 项的横向色带，每项占 px 像素宽 */
const drawBar = (ctx: CanvasRenderingContext2D, entries: Vec3[], x: number, y: number, px: number, height: number): void => {
  entries.forEach((c, i) => {
    ctx.fillStyle = css(c);
    ctx.fillRect(x + i * px, y, px, height);
  });
};

const drawBars: DrawFn = ctx => {
  COLORMAPS.forEach((map, row) => {
    const y = 8 + row * 30;
    text(ctx, map.label, 4, y + 15);
    drawBar(ctx, map.entries, 176, y, 2, 22);
  });
};

// ---------- 亮度与感知速度 ----------

const drawAnalysis: DrawFn = ctx => {
  const cols = 4;
  const cellW = 236;
  const cellH = 156;
  COLORMAPS.forEach((map, index) => {
    const a = analyses[index];
    const ox = (index % cols) * cellW + 28;
    const oy = Math.floor(index / cols) * cellH + 34;
    const w = 190;
    const h = 90;
    text(ctx, map.label, ox - 24, oy - 20, '#222');
    text(ctx, `L ${a.monotonic ? '单调' : '非单调'} · 速度比 ${a.ratio.toFixed(1)}`, ox - 24, oy - 6, a.monotonic ? '#2E7D32' : '#C62828');
    ctx.strokeStyle = '#DDD';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, w, h);
    const mean = a.speeds.reduce((s, v) => s + v, 0) / a.speeds.length;
    ctx.strokeStyle = '#E8A87C';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    a.speeds.forEach((v, i) => {
      const x = ox + i / (a.speeds.length - 1) * w;
      const y = oy + h - Math.min(1, v / mean / 3) * h;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#E8A87C';
    ctx.beginPath();
    ctx.moveTo(ox, oy + h - h / 3);
    ctx.lineTo(ox + w, oy + h - h / 3);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    a.lightness.forEach((v, i) => {
      const x = ox + i / (a.lightness.length - 1) * w;
      const y = oy + h - v * h;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  });
  text(ctx, '黑线：OKLab 亮度 L（0~1）；橙线：感知速度（相对其均值，虚线为均值；平直代表均匀）', 4, 3 * 156 + 6, '#666');
};

// ---------- 灰度打印与色觉缺陷 ----------

const luminanceGray = (entries: Vec3[]): Vec3[] => entries.map(([r, g, b]) => {
  const y = 0.2126 * srgbToLinear(r / 255) + 0.7152 * srgbToLinear(g / 255) + 0.0722 * srgbToLinear(b / 255);
  const v = Math.round(Math.min(1, Math.max(0, linearToSrgb(y))) * 255);
  return [v, v, v];
});

const cvdEntries = (entries: Vec3[], type: string): Vec3[] => {
  const src = new ImageData(entries.length, 1);
  entries.forEach((c, i) => {
    src.data.set([c[0], c[1], c[2], 255], i * 4);
  });
  const out = simulate(src, type).data;
  return entries.map((_, i) => [out[i * 4], out[i * 4 + 1], out[i * 4 + 2]] as Vec3);
};

const VIEWS = [
  {label: '原色', apply: (e: Vec3[]) => e},
  {label: '灰度打印', apply: luminanceGray},
  {label: '红色盲', apply: (e: Vec3[]) => cvdEntries(e, 'protanopia')},
  {label: '绿色盲', apply: (e: Vec3[]) => cvdEntries(e, 'deuteranopia')},
  {label: '蓝黄色盲', apply: (e: Vec3[]) => cvdEntries(e, 'tritanopia')}
];

const viewRows = COLORMAPS.map(map => VIEWS.map(view => view.apply(map.entries)));

const drawViews: DrawFn = ctx => {
  const barW = 148;
  VIEWS.forEach((view, col) => {
    text(ctx, view.label, 126 + col * (barW + 8), 14, '#222');
  });
  COLORMAPS.forEach((map, row) => {
    const y = 22 + row * 24;
    text(ctx, map.key, 4, y + 14);
    viewRows[row].forEach((entries, col) => {
      entries.forEach((c, i) => {
        ctx.fillStyle = css(c);
        ctx.fillRect(126 + col * (barW + 8) + i / SIZE * barW, y, barW / SIZE + 0.6, 18);
      });
    });
  });
};

// ---------- 数据演示 ----------

const FIELD_N = 160;
const FIELD_SCALE = 1.5;

const gauss = (x: number, y: number, cx: number, cy: number, s: number): number => {
  return Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s));
};

/** 平滑的山丘 + 缓坡 + 一个小而真实的特征（下方的小凸起） */
const makeSequentialField = (): number[] => {
  const raw: number[] = [];
  for (let j = 0; j < FIELD_N; j++) {
    for (let i = 0; i < FIELD_N; i++) {
      const x = i / (FIELD_N - 1);
      const y = j / (FIELD_N - 1);
      raw.push(0.55 * gauss(x, y, 0.3, 0.35, 0.16) + 0.75 * gauss(x, y, 0.72, 0.6, 0.2) + 0.25 * x + 0.2 * gauss(x, y, 0.5, 0.86, 0.04));
    }
  }
  const lo = Math.min(...raw);
  const hi = Math.max(...raw);
  return raw.map(v => (v - lo) / (hi - lo));
};

/** 有正有负的场，零点有意义；下方两个很小的异常点在零附近 */
const makeDivergingField = (): number[] => {
  const raw: number[] = [];
  for (let j = 0; j < FIELD_N; j++) {
    for (let i = 0; i < FIELD_N; i++) {
      const x = i / (FIELD_N - 1);
      const y = j / (FIELD_N - 1);
      raw.push(gauss(x, y, 0.3, 0.45, 0.2) - 0.85 * gauss(x, y, 0.72, 0.45, 0.18) + 0.07 * gauss(x, y, 0.5, 0.86, 0.045) - 0.07 * gauss(x, y, 0.5, 0.14, 0.045));
    }
  }
  const max = Math.max(...raw.map(Math.abs));
  return raw.map(v => 0.5 + 0.5 * v / max);
};

const sequentialField = makeSequentialField();
const divergingField = makeDivergingField();

const getMap = (key: string): Colormap => COLORMAPS.find(m => m.key === key) || COLORMAPS[0];

const drawField = (field: number[], key: string, diverging: boolean, mark = false): DrawFn => ctx => {
  const entries = getMap(key).entries;
  const img = ctx.createImageData(FIELD_N, FIELD_N);
  field.forEach((v, i) => {
    const c = entries[Math.round(Math.min(1, Math.max(0, v)) * (SIZE - 1))];
    img.data.set([c[0], c[1], c[2], 255], i * 4);
  });
  const tmp = document.createElement('canvas');
  tmp.width = FIELD_N;
  tmp.height = FIELD_N;
  (tmp.getContext('2d') as CanvasRenderingContext2D).putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, FIELD_N * FIELD_SCALE, FIELD_N * FIELD_SCALE);
  const size = FIELD_N * FIELD_SCALE;
  if (mark) {
    ctx.strokeStyle = '#E53935';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.86, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (let i = 0; i < size; i++) {
    ctx.fillStyle = css(entries[Math.round((1 - i / (size - 1)) * (SIZE - 1))]);
    ctx.fillRect(size + 10, i, 14, 1);
  }
  text(ctx, diverging ? '+' : '1', size + 28, 10);
  text(ctx, diverging ? '0' : '', size + 28, size / 2 + 4);
  text(ctx, diverging ? '−' : '0', size + 28, size - 2);
  if (diverging) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size + 8, size / 2 + 0.5);
    ctx.lineTo(size + 26, size / 2 + 0.5);
    ctx.stroke();
  }
};

export {
  DrawFn,
  FIELD_N,
  FIELD_SCALE,
  analyses,
  sequentialField,
  divergingField,
  drawBars,
  drawAnalysis,
  drawViews,
  drawField
};
