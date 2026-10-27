import {spectralLocus, locusXy} from '../utils/cie';
import type {Point} from '../utils/cie';
import {
  DISPLAYS,
  REC709,
  P3,
  REC2020,
  D65_XY,
  computeDisplays,
  sampleSpd
} from '../utils/displayspec';
import {WL_MIN, WL_MAX, drawSpectrumBand, drawAxis, wlX, text} from '../utils/spectral';
import type {DrawFn, Area} from '../utils/spectral';

const SPEC_W = 520;
const SPEC_H = 150;
const CHART_W = 520;
const CHART_H = 470;

const SPEC_AREA: Area = {x: 40, y: 22, w: 450, h: SPEC_H - 50};

const locus = spectralLocus(380, 700, 1);

const X_MAX = 0.8;
const Y_MAX = 0.9;
const LEFT = 40;
const TOP = 12;
const SCALE = 480;

const toPx = ([x, y]: Point): Point => [LEFT + x * SCALE, TOP + (Y_MAX - y) * SCALE];

const poly = (ctx: CanvasRenderingContext2D, pts: Point[], color: string, width: number, dash: number[] = []) => {
  ctx.beginPath();
  pts.map(toPx).forEach(([x, y], i) => {
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.closePath();
  ctx.setLineDash(dash);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.setLineDash([]);
};

const plotSpd = (ctx: CanvasRenderingContext2D, area: Area, values: number[], color: string) => {
  const base = area.y + area.h;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = wlX(area, WL_MIN + i);
    const y = base - Math.min(1.05, Math.max(0, v)) * area.h;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.stroke();
};

const makeSpectrumDraw = (index: () => number): DrawFn => (ctx, w, h) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  drawSpectrumBand(ctx, SPEC_AREA, 0.25);
  const def = DISPLAYS[index()];
  const colors = ['#E03131', '#2F9E44', '#1C7ED6'];
  def.primaries.forEach((spd, i) => plotSpd(ctx, SPEC_AREA, sampleSpd(spd), colors[i]));
  drawAxis(ctx, SPEC_AREA);
  text(ctx, def.label + '（示意）', SPEC_AREA.x, 9, 'left', '#333', '13px sans-serif');
};

const drawChart: DrawFn = ctx => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, CHART_W, CHART_H);
  ctx.font = '11px sans-serif';
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  for (let i = 0; i <= 8; i++) {
    const [px, by] = toPx([i / 10, 0]);
    ctx.beginPath();
    ctx.moveTo(Math.round(px) + 0.5, toPx([0, Y_MAX])[1]);
    ctx.lineTo(Math.round(px) + 0.5, by);
    ctx.stroke();
    text(ctx, (i / 10).toFixed(1), px, by + 12, 'center', '#555', '11px sans-serif');
  }
  for (let j = 0; j <= 9; j++) {
    const [lx, py] = toPx([0, j / 10]);
    ctx.beginPath();
    ctx.moveTo(lx, Math.round(py) + 0.5);
    ctx.lineTo(toPx([X_MAX, 0])[0], Math.round(py) + 0.5);
    ctx.stroke();
    text(ctx, (j / 10).toFixed(1), lx - 5, py, 'right', '#555', '11px sans-serif');
  }
  poly(ctx, locus, '#333', 1.5);
  [450, 500, 550, 600, 650].forEach(l => {
    const p = toPx(locusXy(l));
    ctx.beginPath();
    ctx.arc(p[0], p[1], 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();
    const left = l <= 500;
    text(ctx, `${l}nm`, p[0] + (left ? -6 : 7), p[1] + (l === 450 ? 10 : 0), left ? 'right' : 'left', '#555', '11px sans-serif');
  });

  poly(ctx, REC709, '#999', 1.5, [4, 3]);
  poly(ctx, P3, '#999', 1.5, [8, 3]);
  poly(ctx, REC2020, '#999', 1.5, [2, 3]);
  text(ctx, 'Rec.709 / P3 / Rec.2020：灰色虚线，由内到外', toPx([0.5, 0])[0], TOP + 14 + DISPLAYS.length * 18 + 6, 'left', '#777', '11px sans-serif');

  computeDisplays().forEach(d => {
    poly(ctx, d.xy, d.color, 2);
    d.xy.map(toPx).forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = d.color;
      ctx.fill();
    });
  });

  const wp = toPx(D65_XY);
  ctx.beginPath();
  ctx.arc(wp[0], wp[1], 4, 0, 2 * Math.PI);
  ctx.fillStyle = '#FFF';
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.stroke();

  DISPLAYS.forEach((d, i) => {
    const y = TOP + 14 + i * 18;
    const x = toPx([0.5, 0])[0];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20, y);
    ctx.lineWidth = 3;
    ctx.strokeStyle = d.color;
    ctx.stroke();
    text(ctx, d.label.replace(/（.*?）/, ''), x + 26, y, 'left', '#222', '12px sans-serif');
  });
};

const makeShiftDraw = (rows: {label: string; color: string; du: number[]}[], shifts: number[]): DrawFn => (ctx, w, h) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const left = 170;
  const top = 26;
  const groupH = (h - top - 10) / rows.length;
  const max = Math.max(...rows.flatMap(r => r.du), 1e-6);
  const barArea = w - left - 150;
  text(ctx, "白点与标准观察者的距离 Δu'v'（越短越稳）", left, 10, 'left', '#333', '12px sans-serif');
  rows.forEach((r, i) => {
    const y0 = top + i * groupH;
    text(ctx, r.label.replace(/（.*?）/, ''), left - 8, y0 + groupH / 2, 'right', '#333', '12px sans-serif');
    const bh = (groupH - 8) / shifts.length;
    shifts.forEach((s, k) => {
      const len = r.du[k] / max * barArea;
      ctx.fillStyle = r.color;
      ctx.globalAlpha = 0.45 + 0.55 * (Math.abs(s) / 10);
      ctx.fillRect(left, y0 + 2 + k * bh, Math.max(1, len), bh - 1);
      ctx.globalAlpha = 1;
      text(ctx, `${s > 0 ? '+' : ''}${s}nm  ${r.du[k].toFixed(4)}`, left + len + 4, y0 + 2 + k * bh + bh / 2, 'left', '#555', '10px sans-serif');
    });
  });
};

export {
  SPEC_W,
  SPEC_H,
  CHART_W,
  CHART_H,
  WL_MIN,
  WL_MAX,
  makeSpectrumDraw,
  drawChart,
  makeShiftDraw
};
