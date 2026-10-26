import {WAVELENGTHS, text, drawSpectrumBand, drawAxis, wlX} from '../utils/spectral';
import type {DrawFn, Area} from '../utils/spectral';
import {PATCHES, MODELS, sensitivities, toSrgb8} from '../utils/camera';
import type {CameraResult, ModelKey, MethodResult} from '../utils/camera';

const SENS_W = 540;
const SENS_H = 240;
const CELL_W = 46;
const CELL_H = 38;
const COLS = 6;
const ROWS = 4;
const GRID_W = CELL_W * COLS;
const GRID_H = CELL_H * ROWS;
const PATCH_GAP = 24;
const PATCH_W = GRID_W * 3 + PATCH_GAP * 2;
const PATCH_H = GRID_H + 52;
const BAR_W = 780;
const BAR_H = 240;

const CH_COLORS = ['#E03131', '#2F9E44', '#1C7ED6'];

const makeSensitivityDraw = (t: () => number): DrawFn => (ctx, w, h) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const area: Area = {x: 44, y: 18, w: w - 64, h: h - 58};
  drawSpectrumBand(ctx, area, 0.2);
  drawAxis(ctx, area);
  const luther = sensitivities(0);
  const cam = sensitivities(t());
  const max = Math.max(...luther.flat(), ...cam.flat());
  const min = Math.min(...luther.flat(), ...cam.flat(), 0);
  const range = max - min;
  const py = (v: number): number => area.y + area.h - (v - min) / range * area.h;
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(area.x, Math.round(py(0)) + 0.5);
  ctx.lineTo(area.x + area.w, Math.round(py(0)) + 0.5);
  ctx.stroke();
  const trace = (values: number[]): void => {
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = wlX(area, WAVELENGTHS[i]);
      if (i === 0) {
        ctx.moveTo(x, py(v));
      } else {
        ctx.lineTo(x, py(v));
      }
    });
  };
  luther.forEach((row, i) => {
    trace(row);
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = CH_COLORS[i];
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  });
  cam.forEach((row, i) => {
    trace(row);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = CH_COLORS[i];
    ctx.stroke();
  });
  text(ctx, '实线：当前相机三通道灵敏度', area.x + 8, area.y + 8, 'left', '#222', '12px sans-serif');
  text(ctx, '虚线：线性 sRGB 对应的理想灵敏度（CMF 的线性组合，含负瓣）', area.x + 8, area.y + 26, 'left', '#555', '12px sans-serif');
  void w;
};

const drawGrid = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  colors: [number, number, number][],
  errors?: number[]
): void => {
  colors.forEach((c, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    ctx.fillStyle = `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    ctx.fillRect(x0 + col * CELL_W + 1, y0 + row * CELL_H + 1, CELL_W - 2, CELL_H - 2);
    if (errors) {
      const e = errors[i];
      const dark = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) < 120;
      text(ctx, e.toFixed(1), x0 + col * CELL_W + CELL_W / 2, y0 + row * CELL_H + CELL_H / 2, 'center', dark ? '#FFF' : '#222', '11px sans-serif');
    }
  });
};

const makePatchDraw = (result: () => CameraResult, model: () => ModelKey, evalA: () => boolean): DrawFn => (ctx, w, h) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const r = result();
  const set: MethodResult[] = evalA() ? r.atEval : r.atD65;
  const wb = set.find(m => m.key === 'wb') as MethodResult;
  const chosen = set.find(m => m.key === model()) as MethodResult;
  const ref = PATCHES.map(p => p.srgb);
  const titles = ['参考（目标）', '只做白平衡', MODELS.find(m => m.key === model())?.label ?? ''];
  [ref, wb.corrected.map(toSrgb8), chosen.corrected.map(toSrgb8)].forEach((colors, k) => {
    const x0 = k * (GRID_W + PATCH_GAP);
    text(ctx, titles[k], x0, 12, 'left', '#333', '12px sans-serif');
    drawGrid(ctx, x0, 24, colors as [number, number, number][], k === 0 ? undefined : (k === 1 ? wb.deltaE : chosen.deltaE));
  });
  text(ctx, '格内数字 = 该色块的 ΔE2000（相对参考）', 0, 24 + GRID_H + 14, 'left', '#777', '11px sans-serif');
};

const METHOD_COLORS: Record<string, string> = {wb: '#ADB5BD', m33: '#1C7ED6', m34: '#E8590C', poly: '#9C36B5'};

const makeBarDraw = (result: () => CameraResult, evalA: () => boolean): DrawFn => (ctx, w, h) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const r = result();
  const set = evalA() ? r.atEval : r.atD65;
  const a = {x: 40, y: 20, w: w - 60, h: h - 60};
  const maxV = Math.max(2, ...set.flatMap(m => m.deltaE)) * 1.1;
  const groupW = a.w / PATCHES.length;
  const py = (v: number): number => a.y + a.h - v / maxV * a.h;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;
  for (let k = 0; k <= 4; k++) {
    const v = maxV * k / 4;
    ctx.beginPath();
    ctx.moveTo(a.x, Math.round(py(v)) + 0.5);
    ctx.lineTo(a.x + a.w, Math.round(py(v)) + 0.5);
    ctx.stroke();
    text(ctx, v.toFixed(1), a.x - 6, py(v), 'right', '#555', '11px sans-serif');
  }
  set.forEach((m, k) => {
    const bw = (groupW - 4) / set.length;
    ctx.fillStyle = METHOD_COLORS[m.key];
    m.deltaE.forEach((e, i) => {
      ctx.fillRect(a.x + i * groupW + 2 + k * bw, py(e), Math.max(1, bw - 0.5), a.y + a.h - py(e));
    });
    ctx.fillRect(a.x + 8 + k * 120, 4, 14, 4);
    text(ctx, m.label, a.x + 26 + k * 120, 7, 'left', '#222', '11px sans-serif');
  });
  PATCHES.forEach((p, i) => {
    ctx.save();
    ctx.translate(a.x + (i + 0.5) * groupW, a.y + a.h + 6);
    ctx.rotate(Math.PI / 3);
    text(ctx, p.name, 0, 0, 'left', '#555', '10px sans-serif');
    ctx.restore();
  });
  void w;
};

export {
  SENS_W,
  SENS_H,
  PATCH_W,
  PATCH_H,
  BAR_W,
  BAR_H,
  makeSensitivityDraw,
  makePatchDraw,
  makeBarDraw
};
