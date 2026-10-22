import {
  DrawFn,
  Area,
  rgbCss,
  rgbHex,
  text,
  drawSpectrumBand,
  drawAxis,
  drawCurve
} from '../utils/spectral';
import {Vec3} from '../utils/space';
import {FilmParams, filmSpectrum, filmMaxReflectance, filmColor} from '../utils/physics';

interface FilmMaterial {
  key: string;
  name: string;
  n1: number;
  n2: number;
  substrate: string;
}

const MATERIALS: FilmMaterial[] = [
  {key: 'soap', name: '水 / 肥皂膜', n1: 1.33, n2: 1, substrate: '两侧是空气（肥皂泡）'},
  {key: 'oil', name: '油膜', n1: 1.47, n2: 1.33, substrate: '漂在水面上'},
  {key: 'sio2', name: '二氧化硅', n1: 1.46, n2: 3.9, substrate: '镀在硅片上'},
  {key: 'tio2', name: '二氧化钛', n1: 2.4, n2: 1.5, substrate: '镀在玻璃上'}
];

interface FilmState {
  material: string;
  d: number;
  theta: number;
}

const toParams = (state: FilmState): FilmParams => {
  const m = MATERIALS.find(item => item.key === state.material) || MATERIALS[0];
  return {n1: m.n1, n2: m.n2, d: state.d, theta: state.theta};
};

const filmHex = (state: FilmState): string => rgbHex(filmColor(toParams(state)));

const SPECTRUM_W = 700;
const SPECTRUM_H = 250;

const drawFilmSpectrum = (get: () => FilmState): DrawFn => (ctx, w, h) => {
  const state = get();
  const p = toParams(state);
  const area: Area = {x: 52, y: 18, w: 520, h: 170};
  const refl = filmSpectrum(p);
  const top = Math.max(0.02, filmMaxReflectance(p));

  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  drawSpectrumBand(ctx, area, 0.3);
  ctx.strokeStyle = '#DDD';
  ctx.lineWidth = 1;
  [0, 0.5, 1].forEach(t => {
    const y = Math.round(area.y + area.h * (1 - t)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(area.x, y);
    ctx.lineTo(area.x + area.w, y);
    ctx.stroke();
    text(ctx, `${(top * t * 100).toFixed(1)}%`, area.x - 6, y, 'right', '#555', '11px sans-serif');
  });
  drawCurve(ctx, area, refl.map(v => v / top), '#1A1A1A', 2.5);
  drawAxis(ctx, area);
  text(ctx, '反射率（满刻度为该膜可能的最大反射率）', area.x, 8, 'left', '#555', '11px sans-serif');

  const rgb = filmColor(p);
  ctx.fillStyle = rgbCss(rgb);
  ctx.fillRect(area.x + area.w + 30, area.y, 70, 70);
  ctx.strokeStyle = '#CCC';
  ctx.strokeRect(area.x + area.w + 30.5, area.y + 0.5, 69, 69);
  text(ctx, '看到的颜色', area.x + area.w + 65, area.y + 84, 'center', '#333', '12px sans-serif');
  text(ctx, rgbHex(rgb), area.x + area.w + 65, area.y + 100, 'center', '#555', '12px monospace');
};

const STRIP_W = 750;
const STRIP_H = 96;
const STRIP_MAX = 1500;

const drawThicknessStrip = (get: () => FilmState): DrawFn => (ctx, w, h) => {
  const state = get();
  const p = toParams(state);
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const barH = 52;
  const barY = 18;
  const perPx = STRIP_MAX / w;
  for (let x = 0; x < w; x++) {
    ctx.fillStyle = rgbCss(filmColor({...p, d: x * perPx}));
    ctx.fillRect(x, barY, 1, barH);
  }
  ctx.strokeStyle = '#888';
  ctx.beginPath();
  for (let d = 0; d <= STRIP_MAX; d += 250) {
    const x = Math.min(w - 1, d / perPx) + 0.5;
    ctx.moveTo(x, barY + barH);
    ctx.lineTo(x, barY + barH + 5);
    text(ctx, `${d} nm`, Math.min(w - 18, Math.max(14, x)), barY + barH + 16, 'center', '#555', '11px sans-serif');
  }
  ctx.stroke();
  const mx = Math.min(w - 1, state.d / perPx) + 0.5;
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.moveTo(mx - 6, 4);
  ctx.lineTo(mx + 6, 4);
  ctx.lineTo(mx, 15);
  ctx.closePath();
  ctx.fill();
};

const BUBBLE_SIZE = 380;
const BUBBLE_D_STEP = 12;
const BUBBLE_THETA_STEP = 6;
const BUBBLE_THETAS = Math.floor(84 / BUBBLE_THETA_STEP) + 1;
const BUBBLE_DS = Math.floor(STRIP_MAX / BUBBLE_D_STEP) + 1;
let bubbleLut: Vec3[] | null = null;

const getBubbleLut = (): Vec3[] => {
  if (!bubbleLut) {
    const lut: Vec3[] = [];
    for (let t = 0; t < BUBBLE_THETAS; t++) {
      for (let i = 0; i < BUBBLE_DS; i++) {
        lut.push(filmColor({n1: 1.33, n2: 1, d: i * BUBBLE_D_STEP, theta: t * BUBBLE_THETA_STEP}));
      }
    }
    bubbleLut = lut;
  }
  return bubbleLut;
};

const lookup = (lut: Vec3[], d: number, theta: number): Vec3 => {
  const di = Math.min(BUBBLE_DS - 1.001, Math.max(0, d / BUBBLE_D_STEP));
  const ti = Math.min(BUBBLE_THETAS - 1, Math.round(Math.max(0, theta) / BUBBLE_THETA_STEP));
  const i0 = Math.floor(di);
  const f = di - i0;
  const a = lut[ti * BUBBLE_DS + i0];
  const b = lut[ti * BUBBLE_DS + i0 + 1];
  return a.map((v, k) => v * (1 - f) + b[k] * f) as Vec3;
};

/** 肥皂泡：厚度从顶部（最薄）到底部（最厚，取滑块的厚度）逐渐增加，掠射角越大反射越强 */
const drawBubble = (get: () => FilmState): DrawFn => (ctx, w, h) => {
  const dMax = Math.max(60, get().d);
  const lut = getBubbleLut();
  const img = ctx.createImageData(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) / 2 - 14;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      const bgT = y / h;
      let r = 16 + 18 * bgT;
      let g = 22 + 24 * bgT;
      let b = 32 + 34 * bgT;
      const dx = x - cx;
      const dy = y - cy;
      const rho = Math.hypot(dx, dy) / radius;
      if (rho < 1) {
        const v = (dy / radius + 1) / 2;
        const swirl = 0.07 * Math.sin(v * 17 + dx * 0.035) + 0.05 * Math.sin(dx * 0.05 - v * 9);
        const d = dMax * Math.max(0, v ** 1.35 + swirl * v);
        const theta = Math.asin(Math.min(1, rho)) / Math.PI * 180;
        const c = lookup(lut, d, theta);
        const edgeSoft = Math.min(1, (1 - rho) * 40);
        const m = (0.3 + 0.55 * rho * rho) * edgeSoft;
        r = r * (1 - m) + c[0] * m * 1.05;
        g = g * (1 - m) + c[1] * m * 1.05;
        b = b * (1 - m) + c[2] * m * 1.05;
        const hx = (dx + radius * 0.42) / (radius * 0.2);
        const hy = (dy + radius * 0.5) / (radius * 0.1);
        const spec = Math.exp(-(hx * hx + hy * hy)) * 0.8;
        r += 255 * spec;
        g += 255 * spec;
        b += 255 * spec;
      }
      img.data[k] = Math.min(255, r);
      img.data[k + 1] = Math.min(255, g);
      img.data[k + 2] = Math.min(255, b);
      img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
};

export {
  MATERIALS,
  FilmState,
  SPECTRUM_W,
  SPECTRUM_H,
  STRIP_W,
  STRIP_H,
  BUBBLE_SIZE,
  filmHex,
  drawFilmSpectrum,
  drawThicknessStrip,
  drawBubble
};
