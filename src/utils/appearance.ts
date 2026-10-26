import {
  linearToSrgb,
  srgbToLinear,
  relativeLuminance,
  rgbToXyz,
  xyzToRgb,
  rgbToLab,
  labToRgb,
  rgbToOklab,
  oklabToRgb
} from './space';
import type {Vec3} from './space';
import {wavelengthToXyz, xyzToClipRgb} from './cie';
import {makeViewing, xyzToCam16, toUcs, ucsToXyz} from './cam16';
import type {Cam16} from './cam16';

const D65_WHITE: Vec3 = [95.047, 100, 108.883];
const WHITE_RGB: Vec3 = [255, 255, 255];
const VIEW = makeViewing(D65_WHITE, 64, 20, 'average');

const toXyz100 = (rgb: Vec3): Vec3 => rgbToXyz(rgb).map(v => v * 100) as Vec3;
const fromXyz100 = (xyz: Vec3): Vec3 => xyzToRgb(xyz.map(v => v / 100) as Vec3).rgb;

/** CAM16 色相角（平均环境、适应亮度 64 cd/m²、背景 20%） */
const camHue = (rgb: Vec3): number => xyzToCam16(toXyz100(rgb), VIEW).h;

/** 指定适应亮度 la（cd/m²）下的 CAM16 外观量，背景 20%、平均环境 */
const camAt = (rgb: Vec3, la: number): Cam16 => {
  return xyzToCam16(toXyz100(rgb), makeViewing(D65_WHITE, la, 20, 'average'));
};

const grayCode = (y: number): number => Math.round(Math.min(1, Math.max(0, linearToSrgb(y))) * 255);

/** 与给定颜色亮度 Y 相同的灰色（线性亮度） */
const luminanceOf = (rgb: Vec3): number => relativeLuminance(rgb);

const lerp = (a: number[], b: number[], t: number): number[] => a.map((v, i) => v + (b[i] - v) * t);

type MixKind = 'srgb' | 'xyz' | 'lab' | 'oklab' | 'ucs';

/** 把颜色向白色混合 t（0~1），分别在不同空间里做线性插值 */
const mixWithWhite = (rgb: Vec3, kind: MixKind, t: number): Vec3 => {
  if (kind === 'srgb') {
    return lerp(rgb, WHITE_RGB, t).map(Math.round) as Vec3;
  }
  if (kind === 'xyz') {
    return fromXyz100(lerp(toXyz100(rgb), D65_WHITE, t) as Vec3);
  }
  if (kind === 'lab') {
    return labToRgb(lerp(rgbToLab(rgb), rgbToLab(WHITE_RGB), t) as Vec3).rgb;
  }
  if (kind === 'oklab') {
    return oklabToRgb(lerp(rgbToOklab(rgb), rgbToOklab(WHITE_RGB), t) as Vec3).rgb;
  }
  const a = toUcs(xyzToCam16(toXyz100(rgb), VIEW));
  const b = toUcs(xyzToCam16(D65_WHITE, VIEW));
  const p = lerp(a, b, t);
  const mp = Math.hypot(p[1], p[2]);
  const h = (Math.atan2(p[2], p[1]) * 180 / Math.PI + 360) % 360;
  return fromXyz100(ucsToXyz(p[0], mp, h, VIEW));
};

/** Bezold–Brücke 效应中常被引用的三个“不变色相”（强度变化时色相基本不变），单位 nm */
const INVARIANT_HUES = [474, 506, 571];

/**
 * 示意模型：强度每增加 10 倍，色相向最近的不变色相“靠拢”15%（logRatio 为强度比的常用对数）。
 * 方向和大小只是教学用的简化，不是实测数据。
 */
const shiftedWavelength = (l0: number, logRatio: number): number => {
  const target = INVARIANT_HUES.reduce((best, h) => (Math.abs(h - l0) < Math.abs(best - l0) ? h : best));
  return l0 + (target - l0) * Math.min(0.5, 0.15 * logRatio);
};

/** 单色光在屏幕上的近似颜色（色域外已截断）；brightness 为线性亮度倍率 */
const wavelengthRgb = (l: number, brightness = 1): Vec3 => {
  return xyzToClipRgb(wavelengthToXyz(l)).map(v => {
    return Math.round(Math.min(1, linearToSrgb(srgbToLinear(v / 255) * brightness)) * 255);
  }) as Vec3;
};

interface Series {
  label: string;
  color: string;
  points: [number, number][];
  dashed?: boolean;
}

interface PlotOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xTicks: number[];
  yTicks: number[];
  xLog?: boolean;
  xLabel?: string;
  yLabel?: string;
  legend?: 'tl' | 'tr' | 'bl' | 'br';
}

const label = (
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  align: CanvasTextAlign = 'center',
  color = '#555',
  font = '11px sans-serif'
): void => {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
};

const fmt = (v: number): string => (Math.abs(v) >= 1000 ? `${v / 1000}k` : `${+v.toFixed(3)}`);

const drawLegend = (ctx: CanvasRenderingContext2D, o: PlotOptions, series: Series[]): void => {
  if (!o.legend) {
    return;
  }
  ctx.font = '11px sans-serif';
  const width = Math.max(...series.map(s => ctx.measureText(s.label).width)) + 34;
  const height = series.length * 17 + 6;
  const x = o.legend === 'tl' || o.legend === 'bl' ? o.x + 8 : o.x + o.w - width - 8;
  const y = o.legend === 'tl' || o.legend === 'tr' ? o.y + 8 : o.y + o.h - height - 8;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillRect(x, y, width, height);
  series.forEach((s, i) => {
    const cy = y + 11 + i * 17;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.setLineDash(s.dashed ? [5, 3] : []);
    ctx.beginPath();
    ctx.moveTo(x + 6, cy);
    ctx.lineTo(x + 24, cy);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, s.label, x + 29, cy, 'left', '#333');
  });
};

/** 带坐标轴、网格和图例的折线图，x 轴可选对数 */
const drawPlot = (ctx: CanvasRenderingContext2D, o: PlotOptions, series: Series[]): void => {
  const span = o.xLog ? Math.log10(o.xMax) - Math.log10(o.xMin) : o.xMax - o.xMin;
  const fx = (v: number): number => {
    const t = o.xLog ? (Math.log10(Math.max(v, o.xMin)) - Math.log10(o.xMin)) / span : (v - o.xMin) / span;
    return o.x + t * o.w;
  };
  const fy = (v: number): number => o.y + o.h - (v - o.yMin) / (o.yMax - o.yMin) * o.h;
  ctx.fillStyle = '#FFF';
  ctx.fillRect(o.x, o.y, o.w, o.h);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#E6E6E6';
  ctx.beginPath();
  o.xTicks.forEach(v => {
    ctx.moveTo(Math.round(fx(v)) + 0.5, o.y);
    ctx.lineTo(Math.round(fx(v)) + 0.5, o.y + o.h);
  });
  o.yTicks.forEach(v => {
    ctx.moveTo(o.x, Math.round(fy(v)) + 0.5);
    ctx.lineTo(o.x + o.w, Math.round(fy(v)) + 0.5);
  });
  ctx.stroke();
  ctx.strokeStyle = '#888';
  ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w, o.h);
  o.xTicks.forEach(v => label(ctx, fmt(v), fx(v), o.y + o.h + 12));
  o.yTicks.forEach(v => label(ctx, fmt(v), o.x - 6, fy(v), 'right'));
  if (o.xLabel) {
    label(ctx, o.xLabel, o.x + o.w / 2, o.y + o.h + 28, 'center', '#333', '12px sans-serif');
  }
  if (o.yLabel) {
    ctx.save();
    ctx.translate(o.x - 38, o.y + o.h / 2);
    ctx.rotate(-Math.PI / 2);
    label(ctx, o.yLabel, 0, 0, 'center', '#333', '12px sans-serif');
    ctx.restore();
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(o.x, o.y, o.w, o.h);
  ctx.clip();
  series.forEach(s => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.setLineDash(s.dashed ? [5, 3] : []);
    ctx.beginPath();
    s.points.forEach(([px, py], i) => {
      if (i === 0) {
        ctx.moveTo(fx(px), fy(py));
      } else {
        ctx.lineTo(fx(px), fy(py));
      }
    });
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.restore();
  drawLegend(ctx, o, series);
};

export {
  D65_WHITE,
  VIEW,
  INVARIANT_HUES,
  MixKind,
  Series,
  PlotOptions,
  label,
  drawPlot,
  toXyz100,
  fromXyz100,
  camHue,
  camAt,
  grayCode,
  luminanceOf,
  mixWithWhite,
  shiftedWavelength,
  wavelengthRgb
};
