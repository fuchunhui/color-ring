import {METALS, reflectance, reflectedColor} from '../utils/metals';
import type {Metal} from '../utils/metals';
import {drawSpectrumBand, drawAxis, drawCurve, text} from '../utils/spectral';
import type {Area, DrawFn} from '../utils/spectral';
import type {Vec3} from '../utils/space';

const PLOT_W = 640;
const PLOT_H = 260;
const ANGLE_W = 640;
const ANGLE_H = 240;

const COLORS: Record<string, string> = {
  Au: '#C9A000',
  Cu: '#C0502A',
  Ag: '#6A6A6A',
  Al: '#2A6FD0'
};

/** 常见的 PBR 基础反射率 F0（线性 RGB），仅作对照 */
const PBR_F0: Record<string, number[]> = {
  Au: [1.0, 0.71, 0.29],
  Cu: [0.95, 0.64, 0.54],
  Ag: [0.95, 0.93, 0.88],
  Al: [0.91, 0.92, 0.92]
};

const area: Area = {x: 50, y: 20, w: PLOT_W - 80, h: PLOT_H - 60};

const drawYAxis = (ctx: CanvasRenderingContext2D, a: Area, ticks: number[], fmt: (v: number) => string) => {
  ticks.forEach(t => {
    const y = a.y + a.h - t * a.h;
    ctx.strokeStyle = '#E4E4E4';
    ctx.beginPath();
    ctx.moveTo(a.x, y + 0.5);
    ctx.lineTo(a.x + a.w, y + 0.5);
    ctx.stroke();
    text(ctx, fmt(t), a.x - 6, y, 'right', '#555', '11px sans-serif');
  });
};

const drawReflectance = (active: Metal, theta: () => number): DrawFn => ctx => {
  drawSpectrumBand(ctx, area, 0.28);
  drawYAxis(ctx, area, [0, 0.25, 0.5, 0.75, 1], v => `${Math.round(v * 100)}%`);
  METALS.forEach(m => {
    drawCurve(ctx, area, reflectance(m, theta()), COLORS[m.key], m.key === active.key ? 3 : 1.5);
  });
  drawAxis(ctx, area);
  text(ctx, '反射率', area.x, 8, 'left', '#555', '11px sans-serif');
  METALS.forEach((m, i) => {
    const x = area.x + 10 + i * 70;
    ctx.fillStyle = COLORS[m.key];
    ctx.fillRect(x, area.y + area.h - 14, 14, 3);
    text(ctx, m.name, x + 20, area.y + area.h - 13, 'left', '#333', '12px sans-serif');
  });
};

const ANGLE_AREA = {x: 50, y: 20, w: ANGLE_W - 80, h: ANGLE_H - 60};

/** 反射率随入射角：画 450、550、650nm 三条线 */
const drawAngles = (metal: () => Metal): DrawFn => ctx => {
  const a = ANGLE_AREA;
  drawYAxis(ctx, a, [0, 0.25, 0.5, 0.75, 1], v => `${Math.round(v * 100)}%`);
  const picks: [number, string][] = [[450, '#2A5BD6'], [550, '#2EA043'], [650, '#D62A2A']];
  picks.forEach(([l, color]) => {
    ctx.beginPath();
    for (let deg = 0; deg <= 89; deg++) {
      const idx = (l - 380) / 5;
      const r = reflectance(metal(), deg * Math.PI / 180)[idx];
      const x = a.x + deg / 90 * a.w;
      const y = a.y + a.h - r * a.h;
      if (deg === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  ctx.strokeStyle = '#888';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y + a.h + 0.5);
  ctx.lineTo(a.x + a.w, a.y + a.h + 0.5);
  ctx.stroke();
  [0, 30, 60, 90].forEach(deg => {
    text(ctx, `${deg}°`, a.x + deg / 90 * a.w, a.y + a.h + 14, 'center', '#555', '11px sans-serif');
  });
  text(ctx, '入射角', a.x + a.w / 2, a.y + a.h + 32, 'center', '#555', '11px sans-serif');
  picks.forEach(([l, color], i) => {
    ctx.fillStyle = color;
    ctx.fillRect(a.x + 24, a.y + a.h * 0.36 + i * 16, 14, 3);
    text(ctx, `${l} nm`, a.x + 44, a.y + a.h * 0.36 + 1 + i * 16, 'left', '#333', '11px sans-serif');
  });
};

const swatches = (theta: number): {metal: Metal; srgb: Vec3; linear: Vec3}[] => METALS.map(m => ({
  metal: m,
  ...reflectedColor(m, theta)
}));

export {
  PLOT_W,
  PLOT_H,
  ANGLE_W,
  ANGLE_H,
  PBR_F0,
  drawReflectance,
  drawAngles,
  swatches
};
