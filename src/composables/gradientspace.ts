import type {Vec3} from '../utils/space';
import {DrawFn, text} from '../utils/spectral';
import {MethodResult, METRIC_STEPS, PLOT_STEPS} from '../utils/gradientspace';

const LABEL_W = 150;
const BAR_W = 520;
const BAR_H = 28;
const ROW_GAP = 10;
const HEAD_H = 26;
const ROWS = 8;
const BARS_W = LABEL_W + BAR_W + 16;
const BARS_H = HEAD_H + ROWS * (BAR_H + ROW_GAP) + 4;

const css = (rgb: Vec3): string => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

/** 每种插值方式一条渐变条，顶部标出停靠点的颜色 */
const drawBars = (results: () => MethodResult[], stops: () => Vec3[]): DrawFn => ctx => {
  const rows = results();
  const marks = stops();
  marks.forEach((rgb, i) => {
    const x = LABEL_W + (i / (marks.length - 1)) * BAR_W;
    ctx.fillStyle = css(rgb);
    ctx.fillRect(x - 7, 4, 14, 14);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 6.5, 4.5, 13, 13);
  });
  rows.forEach((row, r) => {
    const y = HEAD_H + r * (BAR_H + ROW_GAP);
    for (let x = 0; x < BAR_W; x++) {
      ctx.fillStyle = css(row.at(x / (BAR_W - 1)).rgb);
      ctx.fillRect(LABEL_W + x, y, 1, BAR_H);
    }
    text(ctx, row.name, LABEL_W - 8, y + BAR_H / 2, 'right', '#333', '12px sans-serif');
  });
};

const PLOT_W = 600;
const PLOT_H = 300;

/** 多条曲线放在同一张图里，下方图例 */
const drawProfile = (results: () => MethodResult[], pick: (r: MethodResult) => number[], unit: string, fixedMax?: number): DrawFn => ctx => {
  const rows = results();
  const x0 = 46;
  const y0 = 12;
  const w = 530;
  const h = 170;
  const all = rows.flatMap(pick);
  const peak = Math.max(...all, 0.01);
  const ymax = fixedMax ?? Math.max(0.05, Math.ceil(peak * 1.1 / 0.05) * 0.05);
  const px = (i: number) => x0 + (i / PLOT_STEPS) * w;
  const py = (v: number) => y0 + (1 - v / ymax) * h;

  ctx.strokeStyle = '#E2E4EA';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const v = (ymax * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x0, py(v));
    ctx.lineTo(x0 + w, py(v));
    ctx.stroke();
    text(ctx, v.toFixed(2), x0 - 6, py(v), 'right', '#666', '11px sans-serif');
  }
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    text(ctx, `${t}`, x0 + t * w, y0 + h + 12, 'center', '#666', '11px sans-serif');
  });
  text(ctx, `位置 t（0 = 起点，1 = 终点），纵轴：${unit}`, x0 + w / 2, y0 + h + 28, 'center', '#333');

  rows.forEach(row => {
    const data = pick(row);
    ctx.strokeStyle = row.color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    data.forEach((v, i) => {
      if (i === 0) {
        ctx.moveTo(px(i), py(v));
      } else {
        ctx.lineTo(px(i), py(v));
      }
    });
    ctx.stroke();
  });

  rows.forEach((row, i) => {
    const lx = 14 + (i % 2) * 280;
    const ly = y0 + h + 48 + Math.floor(i / 2) * 18;
    ctx.fillStyle = row.color;
    ctx.fillRect(lx, ly - 2, 16, 4);
    text(ctx, row.name, lx + 22, ly, 'left', '#333', '11px sans-serif');
  });
};

// ---------- 透明度 ----------

const ALPHA_ROWS = [
  {label: '非预乘 → 透明黑', end: [0, 0, 0] as Vec3, premultiplied: false},
  {label: '非预乘 → 透明白', end: [255, 255, 255] as Vec3, premultiplied: false},
  {label: '预乘（CSS 渐变的做法）', end: [0, 0, 0] as Vec3, premultiplied: true}
];
const ALPHA_ROW_H = 44;
const ALPHA_W = LABEL_W + BAR_W + 16;
const ALPHA_H = ALPHA_ROWS.length * (ALPHA_ROW_H + ROW_GAP) + 4;

const drawAlpha = (start: () => Vec3): DrawFn => ctx => {
  const a = start();
  ALPHA_ROWS.forEach((row, r) => {
    const y = 2 + r * (ALPHA_ROW_H + ROW_GAP);
    const cell = 11;
    for (let cy = 0; cy < ALPHA_ROW_H; cy += cell) {
      for (let cx = 0; cx < BAR_W; cx += cell) {
        ctx.fillStyle = ((cx / cell + cy / cell) % 2 === 0) ? '#FFFFFF' : '#D5D8DE';
        ctx.fillRect(LABEL_W + cx, y + cy, Math.min(cell, BAR_W - cx), Math.min(cell, ALPHA_ROW_H - cy));
      }
    }
    for (let x = 0; x < BAR_W; x++) {
      const t = x / (BAR_W - 1);
      const alpha = 1 - t;
      if (alpha <= 0) {
        continue;
      }
      // 预乘时颜色分量随 alpha 一起线性变化，取回显示用的颜色后恰好还是起点色
      const c = row.premultiplied
        ? a
        : a.map((v, k) => v + (row.end[k] - v) * t);
      ctx.fillStyle = `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${alpha.toFixed(4)})`;
      ctx.fillRect(LABEL_W + x, y, 1, ALPHA_ROW_H);
    }
    text(ctx, row.label, LABEL_W - 8, y + ALPHA_ROW_H / 2, 'right', '#333', '12px sans-serif');
  });
};

export {
  BARS_W,
  BARS_H,
  PLOT_W,
  PLOT_H,
  ALPHA_W,
  ALPHA_H,
  METRIC_STEPS,
  drawBars,
  drawProfile,
  drawAlpha
};
