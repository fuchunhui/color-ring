import {encodeCode} from '../utils/scene';
import {COLORMAPS} from '../utils/colormaps';
import {DrawFn, text} from '../utils/spectral';
import {
  R_MIN,
  R_MAX,
  R_WAVELENGTHS,
  ENDMEMBERS,
  ENDMEMBER_SPECTRA,
  BANDS,
  BAND_INDEX,
  MAP_W,
  MAP_H,
  ndvi,
  getLandMap,
  pixelInfo
} from '../utils/remote';

const SCALE = 1.5;
const VIEW_W = Math.round(MAP_W * SCALE);
const VIEW_H = Math.round(MAP_H * SCALE);

type ViewKind = 'true' | 'false' | 'ndvi';

const NDVI_MIN = -0.3;
const NDVI_MAX = 0.9;

const viridis = (COLORMAPS.find(m => m.key === 'viridis') || COLORMAPS[0]).entries;
const ndviColor = (v: number): [number, number, number] => {
  const t = Math.min(1, Math.max(0, (v - NDVI_MIN) / (NDVI_MAX - NDVI_MIN)));
  return viridis[Math.round(t * 255)];
};

const buffers = new Map<ViewKind, HTMLCanvasElement>();

const buildView = (kind: ViewKind): HTMLCanvasElement => {
  const cached = buffers.get(kind);
  if (cached) {
    return cached;
  }
  const map = getLandMap();
  const canvas = document.createElement('canvas');
  canvas.width = MAP_W;
  canvas.height = MAP_H;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const image = ctx.createImageData(MAP_W, MAP_H);
  for (let p = 0; p < MAP_W * MAP_H; p++) {
    const b2 = map.bands[p * 4 + BAND_INDEX.B2];
    const b3 = map.bands[p * 4 + BAND_INDEX.B3];
    const b4 = map.bands[p * 4 + BAND_INDEX.B4];
    const b8 = map.bands[p * 4 + BAND_INDEX.B8];
    let rgb: number[];
    if (kind === 'true') {
      rgb = [encodeCode(b4 * 2.4), encodeCode(b3 * 2.4), encodeCode(b2 * 2.4)];
    } else if (kind === 'false') {
      rgb = [encodeCode(b8 * 1.6), encodeCode(b4 * 2.4), encodeCode(b3 * 2.4)];
    } else {
      rgb = ndviColor(ndvi(b8, b4));
    }
    image.data[p * 4] = rgb[0];
    image.data[p * 4 + 1] = rgb[1];
    image.data[p * 4 + 2] = rgb[2];
    image.data[p * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  buffers.set(kind, canvas);
  return canvas;
};

interface PickPoint {
  x: number;
  y: number;
}

const drawMapView = (kind: ViewKind, get: () => PickPoint): DrawFn => (ctx, w, h) => {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buildView(kind), 0, 0, w, h);
  const {x, y} = get();
  const px = (x + 0.5) * SCALE;
  const py = (y + 0.5) * SCALE;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(px - 6, py - 6, 12, 12);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(px - 7, py - 7, 14, 14);
};

const LEGEND_W = 384;
const LEGEND_H = 56;

const drawNdviLegend: DrawFn = (ctx, w) => {
  const x0 = 14;
  const pw = w - 28;
  for (let px = 0; px < pw; px++) {
    const v = NDVI_MIN + px / (pw - 1) * (NDVI_MAX - NDVI_MIN);
    ctx.fillStyle = `rgb(${ndviColor(v).join(',')})`;
    ctx.fillRect(x0 + px, 6, 1, 16);
  }
  for (let v = -0.3; v <= 0.9001; v += 0.3) {
    const x = x0 + (v - NDVI_MIN) / (NDVI_MAX - NDVI_MIN) * (pw - 1);
    ctx.fillStyle = '#555';
    ctx.fillRect(Math.round(x), 22, 1, 4);
    text(ctx, v.toFixed(1), x, 34, 'center', '#444', '11px sans-serif');
  }
  text(ctx, 'NDVI 色标（viridis）', w / 2, 48, 'center', '#777', '11px sans-serif');
};

const SPEC_W = 800;
const SPEC_H = 300;
const SPEC = {x: 50, y: 18, w: 680, h: 220};

const specX = (l: number): number => SPEC.x + (l - R_MIN) / (R_MAX - R_MIN) * SPEC.w;
const specY = (r: number): number => SPEC.y + SPEC.h - r * SPEC.h;

const curve = (ctx: CanvasRenderingContext2D, values: number[]): void => {
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = specX(R_WAVELENGTHS[i]);
    const y = specY(Math.min(1, v));
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
};

const drawSpectra = (get: () => PickPoint): DrawFn => (ctx, w, h) => {
  const {x, y} = get();
  const info = pixelInfo(x, y);
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(220,60,60,0.10)';
  ctx.fillRect(specX(680), SPEC.y, specX(750) - specX(680), SPEC.h);
  text(ctx, '红边', (specX(680) + specX(750)) / 2, SPEC.y + 10, 'center', '#c04040', '12px sans-serif');
  const colors = ['#2a7fff', '#2eaa3c', '#d0302a', '#8a2be2'];
  BANDS.forEach((band, i) => {
    const x0 = specX(band.center - band.fwhm / 2);
    const x1 = specX(band.center + band.fwhm / 2);
    ctx.fillStyle = colors[i] + '26';
    ctx.fillRect(x0, SPEC.y + 20, x1 - x0, SPEC.h - 20);
    ctx.fillStyle = colors[i];
    ctx.fillRect(specX(band.center) - 0.5, SPEC.y + 20, 1, SPEC.h - 20);
    text(ctx, band.label, specX(band.center), SPEC.y + SPEC.h + 26, 'center', colors[i], '11px sans-serif');
  });

  ENDMEMBERS.forEach((e, k) => {
    curve(ctx, ENDMEMBER_SPECTRA[k]);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = e.color;
    ctx.stroke();
    ctx.fillStyle = e.color;
    ctx.fillRect(SPEC.x + k * 112, SPEC.y + SPEC.h + 44, 12, 3);
    text(ctx, e.label, SPEC.x + 18 + k * 112, SPEC.y + SPEC.h + 46, 'left', e.color, '11px sans-serif');
  });

  curve(ctx, info.spectrum);
  ctx.setLineDash([5, 3]);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#000';
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, '所选像素（虚线）', SPEC.x + 8, SPEC.y + 36, 'left', '#000', '12px sans-serif');

  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(SPEC.x, SPEC.y + SPEC.h + 0.5);
  ctx.lineTo(SPEC.x + SPEC.w, SPEC.y + SPEC.h + 0.5);
  ctx.moveTo(SPEC.x + 0.5, SPEC.y);
  ctx.lineTo(SPEC.x + 0.5, SPEC.y + SPEC.h);
  ctx.stroke();
  for (let l = 400; l <= 1000; l += 100) {
    text(ctx, `${l}`, specX(l), SPEC.y + SPEC.h + 12, 'center', '#555', '11px sans-serif');
  }
  for (let r = 0; r <= 1; r += 0.25) {
    text(ctx, r.toFixed(2), SPEC.x - 6, specY(r), 'right', '#555', '11px sans-serif');
  }
  text(ctx, '波长 nm', SPEC.x + SPEC.w + 30, SPEC.y + SPEC.h + 12, 'left', '#555', '11px sans-serif');
  text(ctx, '反射率', 4, 6, 'left', '#555', '11px sans-serif');
};

export {
  VIEW_W,
  VIEW_H,
  SCALE,
  LEGEND_W,
  LEGEND_H,
  SPEC_W,
  SPEC_H,
  drawMapView,
  drawNdviLegend,
  drawSpectra
};
export type {PickPoint};
