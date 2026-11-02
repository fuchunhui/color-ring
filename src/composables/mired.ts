import {blackbody, text, drawSpectrumBand, drawAxis, drawCurve} from '../utils/spectral';
import type {Area, DrawFn, Spectrum} from '../utils/spectral';
import {spectrumXyz} from '../utils/spectral';
import {scaleTemps, stepDistances, spread, lightHex, peakOne} from '../utils/mired';
import type {ShiftResult} from '../utils/mired';

const N_STEPS = 16;
const KELVIN_TEMPS = scaleTemps('kelvin', N_STEPS);
const MIRED_TEMPS = scaleTemps('mired', N_STEPS);
const KELVIN_DIST = stepDistances(KELVIN_TEMPS);
const MIRED_DIST = stepDistances(MIRED_TEMPS);

const SCALE_STATS = {
  kelvinMin: Math.min(...KELVIN_DIST),
  kelvinMax: Math.max(...KELVIN_DIST),
  kelvinRatio: spread(KELVIN_DIST),
  miredMin: Math.min(...MIRED_DIST),
  miredMax: Math.max(...MIRED_DIST),
  miredRatio: spread(MIRED_DIST)
};

// ---------- 两排色带 ----------

const STRIP_W = 800;
const STRIP_H = 168;
const STRIP_LEFT = 8;
const STRIP_CELL = (STRIP_W - 2 * STRIP_LEFT) / N_STEPS;

const drawStripRow = (ctx: CanvasRenderingContext2D, temps: number[], title: string, top: number): void => {
  text(ctx, title, STRIP_LEFT, top + 8, 'left', '#333', '13px sans-serif');
  temps.forEach((t, i) => {
    const x = STRIP_LEFT + i * STRIP_CELL;
    ctx.fillStyle = lightHex(spectrumXyz(blackbody(t)));
    ctx.fillRect(x, top + 20, STRIP_CELL, 40);
    text(ctx, `${Math.round(t)}`, x + STRIP_CELL / 2, top + 72, 'center', '#666', '11px sans-serif');
  });
};

const drawScaleStrips: DrawFn = ctx => {
  drawStripRow(ctx, KELVIN_TEMPS, `按开尔文等间隔（每格 ${((KELVIN_TEMPS[1] - KELVIN_TEMPS[0])).toFixed(0)} K），格子下方是色温 K`, 0);
  drawStripRow(ctx, MIRED_TEMPS, '按迈尔德等间隔（每格 26.7 mired），格子下方是色温 K', 84);
};

// ---------- 相邻两格的距离 ----------

const BAR_W = 800;
const BAR_H = 240;
const BAR_AREA = {x: 56, y: 28, w: 724, h: 164};
const BAR_MAX = 0.035;

const drawStepBars: DrawFn = ctx => {
  const {x, y, w, h} = BAR_AREA;
  const base = y + h;
  ctx.strokeStyle = '#E2E4EA';
  ctx.lineWidth = 1;
  [0, 0.01, 0.02, 0.03].forEach(v => {
    const py = base - v / BAR_MAX * h;
    ctx.beginPath();
    ctx.moveTo(x, Math.round(py) + 0.5);
    ctx.lineTo(x + w, Math.round(py) + 0.5);
    ctx.stroke();
    text(ctx, v.toFixed(2), x - 6, py, 'right', '#555', '11px sans-serif');
  });
  const groupW = w / KELVIN_DIST.length;
  const barW = groupW * 0.38;
  KELVIN_DIST.forEach((d, i) => {
    const gx = x + i * groupW;
    const kh = d / BAR_MAX * h;
    const mh = MIRED_DIST[i] / BAR_MAX * h;
    ctx.fillStyle = '#6C8EBF';
    ctx.fillRect(gx + groupW * 0.08, base - kh, barW, kh);
    ctx.fillStyle = '#E8820C';
    ctx.fillRect(gx + groupW * 0.08 + barW + 2, base - mh, barW, mh);
    text(ctx, `${i + 1}`, gx + groupW / 2, base + 12, 'center', '#555', '11px sans-serif');
  });
  text(ctx, '第几步（相邻两格之间）', x + w / 2, base + 30, 'center', '#333', '12px sans-serif');
  text(ctx, 'Δuv', 14, y + h / 2, 'center', '#333', '12px sans-serif');
  ctx.fillStyle = '#6C8EBF';
  ctx.fillRect(x + 8, 8, 12, 10);
  text(ctx, `开尔文等间隔：最大 / 最小 = ${SCALE_STATS.kelvinRatio.toFixed(1)} 倍`, x + 26, 13, 'left', '#333', '12px sans-serif');
  ctx.fillStyle = '#E8820C';
  ctx.fillRect(x + 292, 8, 12, 10);
  text(ctx, `迈尔德等间隔：最大 / 最小 = ${SCALE_STATS.miredRatio.toFixed(2)} 倍`, x + 310, 13, 'left', '#333', '12px sans-serif');
};

// ---------- 滤镜与光谱 ----------

const FILTER_W = 560;
const FILTER_H = 250;
const FILTER_AREA: Area = {x: 44, y: 16, w: 480, h: 170};

const drawFilterPlot = (result: () => ShiftResult, temp: () => number): DrawFn => ctx => {
  const r = result();
  const a = FILTER_AREA;
  drawSpectrumBand(ctx, a, 0.25);
  ctx.strokeStyle = '#DDD';
  ctx.lineWidth = 1;
  [0, 0.5, 1].forEach(v => {
    const py = a.y + a.h - v * a.h;
    ctx.beginPath();
    ctx.moveTo(a.x, Math.round(py) + 0.5);
    ctx.lineTo(a.x + a.w, Math.round(py) + 0.5);
    ctx.stroke();
    text(ctx, `${v}`, a.x - 6, py, 'right', '#555', '11px sans-serif');
  });
  drawAxis(ctx, a);

  const source: Spectrum = peakOne(blackbody(temp()));
  ctx.setLineDash([5, 4]);
  drawCurve(ctx, a, source, '#777', 1.5);
  ctx.setLineDash([]);
  drawCurve(ctx, a, r.filter, '#2E4BD6', 2);
  if (r.exactFilter) {
    ctx.setLineDash([2, 3]);
    drawCurve(ctx, a, r.exactFilter, '#0B1F8C', 1.5);
    ctx.setLineDash([]);
  }
  if (r.result) {
    drawCurve(ctx, a, r.spd, '#E8820C', 2.2);
  } else {
    text(ctx, '色温超出可显示的黑体范围', a.x + a.w / 2, a.y + a.h / 2, 'center', '#B03A2E', '14px sans-serif');
  }

  const legend: [string, string][] = [
    ['#777', '光源（黑体，虚线，峰值归一）'],
    ['#2E4BD6', '滤镜（Wien 近似，实线）'],
    ['#0B1F8C', '滤镜（精确普朗克比值，点线）'],
    ['#E8820C', '透过滤镜后的光']
  ];
  legend.forEach(([color, label], i) => {
    const lx = a.x + (i % 2) * 230;
    const ly = a.y + a.h + 34 + Math.floor(i / 2) * 16;
    ctx.fillStyle = color;
    ctx.fillRect(lx, ly - 2, 16, 3);
    text(ctx, label, lx + 22, ly, 'left', '#333', '11px sans-serif');
  });
};

export {
  STRIP_W,
  STRIP_H,
  BAR_W,
  BAR_H,
  FILTER_W,
  FILTER_H,
  SCALE_STATS,
  drawScaleStrips,
  drawStepBars,
  drawFilterPlot
};
