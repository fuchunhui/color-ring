import {D65, drawAxis, drawCurve, drawSpectrumBand, rgbCss, text} from '../utils/spectral';
import type {Area, DrawFn, Spectrum} from '../utils/spectral';
import type {Vec3} from '../utils/space';
import {
  ABSORPTION,
  DYES,
  attenuatedSpectrum,
  channelTransmittance,
  depthFor,
  dyeColor,
  waterColor
} from '../utils/water';
import type {Dye} from '../utils/water';
import {encodeCode, makePhotoScene, mulberry32} from '../utils/scene';
import type {LinearImage} from '../utils/scene';

const PLOT_W = 620;
const PLOT_H = 230;
const STRIP_W = 620;
const STRIP_H = 200;
const IMG_W = 260;
const IMG_H = 190;
const MAX_DEPTH = 60;
const MAX_LENGTH = 100;

const plotArea: Area = {x: 56, y: 26, w: 520, h: 150};

/** a(λ) 的对数坐标图：纵轴 0.003 ~ 3 m⁻¹ */
const LOG_MIN = Math.log10(0.003);
const LOG_MAX = Math.log10(3);
const logPos = (a: number): number => (Math.log10(a) - LOG_MIN) / (LOG_MAX - LOG_MIN);

const drawAbsorption: DrawFn = ctx => {
  const area = plotArea;
  drawSpectrumBand(ctx, area, 0.35);
  const base = area.y + area.h;
  [0.01, 0.1, 1].forEach(a => {
    const y = base - logPos(a) * area.h;
    ctx.strokeStyle = '#DDD';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(area.x, y + 0.5);
    ctx.lineTo(area.x + area.w, y + 0.5);
    ctx.stroke();
    text(ctx, String(a), area.x - 6, y, 'right', '#555', '11px sans-serif');
  });
  drawCurve(ctx, area, ABSORPTION.map(logPos), '#1A73E8', 2.5);
  drawAxis(ctx, area);
  text(ctx, '吸收系数 a（1/m，对数坐标）', area.x, 12, 'left', '#333', '12px sans-serif');
};

const normalizedSpectrum = (spd: Spectrum): Spectrum => {
  const max = Math.max(...D65);
  return spd.map(v => v / max);
};

/** 日光穿过 z 米水之后的光谱：灰线是水面的 D65，彩色填充是水下 */
const drawDepthSpectrum = (ctx: CanvasRenderingContext2D, z: number): void => {
  const area = plotArea;
  drawSpectrumBand(ctx, area, 0.3);
  drawCurve(ctx, area, normalizedSpectrum(D65), '#999', 1.5);
  drawCurve(ctx, area, normalizedSpectrum(attenuatedSpectrum(z)), '#1A73E8', 2.5, 'rgba(26,115,232,0.25)');
  drawAxis(ctx, area);
  text(ctx, `水下 ${z.toFixed(1)} m 的日光光谱（灰线：水面 D65，相对强度）`, area.x, 12, 'left', '#333', '12px sans-serif');
};

interface Marker {
  label: string;
  wavelength: number;
  color: string;
}

const MARKERS: Marker[] = [
  {label: '红', wavelength: 650, color: '#D32F2F'},
  {label: '橙', wavelength: 600, color: '#EF6C00'},
  {label: '黄', wavelength: 580, color: '#B8A000'},
  {label: '绿', wavelength: 550, color: '#2E7D32'}
];

/** 各色光衰减掉 90% 的水深（米） */
const markerDepths = (): {label: string; depth: number}[] => {
  return MARKERS.map(m => ({label: `${m.label} ${m.wavelength}nm`, depth: depthFor(m.wavelength, 0.1)}));
};

const COLUMNS = 240;
const stripCache = new Map<number, {chroma: Vec3; actual: Vec3}[]>();

const stripColors = (maxZ: number): {chroma: Vec3; actual: Vec3}[] => {
  const cached = stripCache.get(maxZ);
  if (cached) {
    return cached;
  }
  const list = Array.from({length: COLUMNS}, (_, i) => {
    const c = waterColor(maxZ * i / (COLUMNS - 1));
    return {chroma: c.chroma, actual: c.actual};
  });
  stripCache.set(maxZ, list);
  return list;
};

const STRIP_AREA = {x: 56, y: 76, w: 520, rowH: 34};

/** 颜色随水深（或水柱长度）变化的色条：上排自动曝光，下排保留真实明暗 */
const drawStrip = (
  ctx: CanvasRenderingContext2D,
  maxZ: number,
  current: number,
  withMarkers: boolean,
  unit: string
): void => {
  const {x, y, w, rowH} = STRIP_AREA;
  const colors = stripColors(maxZ);
  const colW = w / COLUMNS;
  colors.forEach((c, i) => {
    ctx.fillStyle = rgbCss(c.chroma);
    ctx.fillRect(x + i * colW, y, colW + 1, rowH);
    ctx.fillStyle = rgbCss(c.actual);
    ctx.fillRect(x + i * colW, y + rowH + 6, colW + 1, rowH);
  });
  text(ctx, '自动曝光', x - 6, y + rowH / 2, 'right', '#555', '11px sans-serif');
  text(ctx, '真实明暗', x - 6, y + rowH * 1.5 + 6, 'right', '#555', '11px sans-serif');
  const bottom = y + rowH * 2 + 6;
  const step = maxZ / 6;
  for (let i = 0; i <= 6; i++) {
    const px = x + i * w / 6;
    ctx.strokeStyle = '#888';
    ctx.beginPath();
    ctx.moveTo(px + 0.5, bottom);
    ctx.lineTo(px + 0.5, bottom + 4);
    ctx.stroke();
    text(ctx, `${Math.round(step * i)}`, px, bottom + 14, 'center', '#555', '11px sans-serif');
  }
  text(ctx, unit, x + w + 16, bottom + 14, 'left', '#555', '11px sans-serif');
  if (withMarkers) {
    markerDepths().forEach((m, i) => {
      const depth = m.depth;
      if (depth > maxZ) {
        return;
      }
      const px = x + depth / maxZ * w;
      ctx.strokeStyle = MARKERS[i].color;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(px + 0.5, y - 8);
      ctx.lineTo(px + 0.5, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, `${MARKERS[i].label}光 ${depth.toFixed(1)}m`, px, y - 14 - (i % 3) * 11, 'center', MARKERS[i].color, '11px sans-serif');
    });
  }
  const cx = x + Math.min(1, current / maxZ) * w;
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.moveTo(cx, bottom + 18);
  ctx.lineTo(cx - 5, bottom + 28);
  ctx.lineTo(cx + 5, bottom + 28);
  ctx.closePath();
  ctx.fill();
  text(ctx, `${current.toFixed(1)} ${unit}`, cx, bottom + 40, 'center', '#111', '12px sans-serif');
};

const drawDepthStrip = (ctx: CanvasRenderingContext2D, z: number): void => {
  drawStrip(ctx, MAX_DEPTH, z, true, 'm');
  text(ctx, '虚线：该色光衰减掉 90% 的深度（白色物体的颜色随深度变化）', STRIP_AREA.x, 12, 'left', '#333', '12px sans-serif');
};

const drawLengthStrip = (ctx: CanvasRenderingContext2D, length: number): void => {
  drawStrip(ctx, MAX_LENGTH, length, false, 'm');
  text(ctx, '白光透过一段水柱之后的颜色（水柱越长越蓝、越暗）', STRIP_AREA.x, 12, 'left', '#333', '12px sans-serif');
};

let sceneCache: LinearImage | null = null;
let noiseCache: Float32Array | null = null;

const baseScene = (): LinearImage => {
  if (!sceneCache) {
    sceneCache = makePhotoScene(IMG_W, IMG_H).image;
    const rand = mulberry32(11);
    noiseCache = new Float32Array(IMG_W * IMG_H * 3).map(() => (rand() * 2 - 1) * 0.017);
  }
  return sceneCache;
};

const MAX_GAIN = 40;

const putImage = (ctx: CanvasRenderingContext2D, img: LinearImage, transform: (c: number, v: number, i: number) => number): void => {
  const out = ctx.createImageData(img.width, img.height);
  for (let p = 0; p < img.width * img.height; p++) {
    for (let c = 0; c < 3; c++) {
      out.data[p * 4 + c] = encodeCode(transform(c, img.data[p * 3 + c], p * 3 + c));
    }
    out.data[p * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
};

const drawSceneOriginal: DrawFn = ctx => {
  putImage(ctx, baseScene(), (_, v) => v);
};

/** 水下拍摄：各通道乘以透过率、自动曝光、加传感器噪声；可选用白平衡增益补偿 */
const drawUnderwater = (ctx: CanvasRenderingContext2D, z: number, compensate: boolean): void => {
  const img = baseScene();
  const noise = noiseCache as Float32Array;
  const t = channelTransmittance(z);
  const peak = Math.max(...t);
  putImage(ctx, img, (c, v, i) => {
    const captured = v * t[c] / peak + noise[i];
    return compensate ? captured * Math.min(MAX_GAIN, peak / t[c]) : captured;
  });
};

const underwaterGains = (z: number): Vec3 => {
  const t = channelTransmittance(z);
  const peak = Math.max(...t);
  return t.map(v => Math.min(MAX_GAIN, peak / v)) as Vec3;
};

/** 染料的透射光谱 */
const drawDyeSpectrum = (ctx: CanvasRenderingContext2D, dye: Dye, conc: number): void => {
  const area = plotArea;
  drawSpectrumBand(ctx, area, 0.3);
  drawCurve(ctx, area, dye.epsilon.map(e => Math.exp(-e * conc)), '#1A73E8', 2.5, 'rgba(26,115,232,0.2)');
  drawAxis(ctx, area);
  text(ctx, `透射率 T(λ) = exp(−ε(λ)·c)，浓度 c = ${conc.toFixed(2)}`, area.x, 12, 'left', '#333', '12px sans-serif');
};

const DYE_MAX = 1.6;
const DYE_COLUMNS = 160;

/** 浓度由 0 增加到 DYE_MAX 时，白光透过溶液的颜色 */
const drawDyeStrip = (ctx: CanvasRenderingContext2D, dye: Dye, conc: number): void => {
  const x = 56;
  const y = 30;
  const w = 520;
  const colW = w / DYE_COLUMNS;
  for (let i = 0; i < DYE_COLUMNS; i++) {
    ctx.fillStyle = rgbCss(dyeColor(dye, DYE_MAX * i / (DYE_COLUMNS - 1)));
    ctx.fillRect(x + i * colW, y, colW + 1, 50);
  }
  for (let i = 0; i <= 4; i++) {
    const px = x + i * w / 4;
    ctx.strokeStyle = '#888';
    ctx.beginPath();
    ctx.moveTo(px + 0.5, y + 50);
    ctx.lineTo(px + 0.5, y + 54);
    ctx.stroke();
    text(ctx, (DYE_MAX * i / 4).toFixed(1), px, y + 66, 'center', '#555', '11px sans-serif');
  }
  text(ctx, '浓度', x + w + 16, y + 66, 'left', '#555', '11px sans-serif');
  text(ctx, `${dye.label}：浓度由低到高`, x, 12, 'left', '#333', '12px sans-serif');
  const cx = x + Math.min(1, conc / DYE_MAX) * w;
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.moveTo(cx, y + 74);
  ctx.lineTo(cx - 5, y + 84);
  ctx.lineTo(cx + 5, y + 84);
  ctx.closePath();
  ctx.fill();
};

export {
  PLOT_W,
  PLOT_H,
  STRIP_W,
  STRIP_H,
  IMG_W,
  IMG_H,
  MAX_DEPTH,
  MAX_LENGTH,
  DYE_MAX,
  DYES,
  drawAbsorption,
  drawDepthSpectrum,
  drawDepthStrip,
  drawLengthStrip,
  drawSceneOriginal,
  drawUnderwater,
  drawDyeSpectrum,
  drawDyeStrip,
  markerDepths,
  underwaterGains
};
