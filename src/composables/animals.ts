import {linearToSrgb} from '../utils/space';
import type {Vec3} from '../utils/space';
import {wavelengthToXyz, xyzToClipRgb} from '../utils/cie';
import {xyzToSrgb, rgbCss, text} from '../utils/spectral';
import type {DrawFn} from '../utils/spectral';
import {
  AV_MIN,
  AV_MAX,
  AV_WL,
  SPECIES,
  SENSITIVITY,
  MANTIS,
  MANTIS_PEAKS,
  MATERIALS,
  petal,
  responseOf
} from '../utils/animalvision';
import type {Response} from '../utils/animalvision';

const SENS_W = 700;
const ROW_H = 76;
const SENS_ROWS = SPECIES.length + 1;
const SENS_H = SENS_ROWS * ROW_H + 52;
const SCENE_W = 240;
const SCENE_H = 200;
const MANTIS_W = 640;
const MANTIS_H = 250;

const PLOT_X = 134;
const PLOT_W = SENS_W - PLOT_X - 16;
const lx = (l: number): number => PLOT_X + (l - AV_MIN) / (AV_MAX - AV_MIN) * PLOT_W;

const peakColor = (peak: number): string => {
  if (peak < 390) {
    return '#7B1FA2';
  }
  const [r, g, b] = xyzToClipRgb(wavelengthToXyz(peak));
  return rgbCss([r * 0.8, g * 0.8, b * 0.8].map(Math.round) as Vec3);
};

const drawBand = (ctx: CanvasRenderingContext2D, y: number, h: number): void => {
  ctx.fillStyle = 'rgba(123, 31, 162, 0.08)';
  ctx.fillRect(lx(AV_MIN), y, lx(380) - lx(AV_MIN), h);
  ctx.save();
  ctx.globalAlpha = 0.22;
  for (let px = 0; px < lx(700) - lx(380); px++) {
    const l = 380 + px / (lx(700) - lx(380)) * 320;
    ctx.fillStyle = rgbCss(xyzToClipRgb(wavelengthToXyz(l)));
    ctx.fillRect(lx(380) + px, y, 1, h);
  }
  ctx.restore();
};

const drawCurve = (ctx: CanvasRenderingContext2D, curve: number[], y: number, h: number, color: string): void => {
  ctx.beginPath();
  curve.forEach((v, i) => {
    const px = lx(AV_WL[i]);
    const py = y + h - v * h * 0.92;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  });
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.stroke();
};

const chunk = (items: string[]): string[] => {
  const lines: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    lines.push(items.slice(i, i + 2).join(' / '));
  }
  return lines;
};

const drawSensitivity: DrawFn = ctx => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, SENS_W, SENS_H);
  const rows = [
    ...SPECIES.map(sp => ({
      label: sp.label,
      sub: chunk(sp.receptors.map(r => `${r.name} ${r.peak}`)),
      curves: SENSITIVITY[sp.id],
      colors: sp.receptors.map(r => peakColor(r.peak))
    })),
    {
      label: '螳螂虾',
      sub: ['12 通道（示意）'],
      curves: MANTIS,
      colors: MANTIS_PEAKS.map(peakColor)
    }
  ];
  rows.forEach((row, i) => {
    const y = 8 + i * ROW_H;
    const h = ROW_H - 14;
    drawBand(ctx, y, h);
    ctx.strokeStyle = '#BBB';
    ctx.strokeRect(PLOT_X + 0.5, y + 0.5, PLOT_W, h);
    row.curves.forEach((c, k) => drawCurve(ctx, c, y, h, row.colors[k]));
    text(ctx, row.label, 8, y + 18, 'left', '#222', 'bold 13px sans-serif');
    row.sub.forEach((line, k) => text(ctx, line, 8, y + 36 + k * 13, 'left', '#666', '10px sans-serif'));
  });
  const base = 8 + SENS_ROWS * ROW_H - 6;
  ctx.strokeStyle = '#777';
  ctx.beginPath();
  for (let l = 300; l <= 750; l += 50) {
    ctx.moveTo(lx(l) + 0.5, base);
    ctx.lineTo(lx(l) + 0.5, base + 4);
    text(ctx, `${l}`, lx(l), base + 14, 'center', '#555', '11px sans-serif');
  }
  ctx.stroke();
  text(ctx, 'nm', lx(AV_MAX) + 16, base + 14, 'left', '#555', '11px sans-serif');
  text(ctx, '紫外（人眼不可见）', (lx(AV_MIN) + lx(380)) / 2, base + 28, 'center', '#7B1FA2', '11px sans-serif');
  text(ctx, '可见光', (lx(380) + lx(700)) / 2, base + 28, 'center', '#555', '11px sans-serif');
};

type View = 'human' | 'dog' | 'bee' | 'bird' | 'uv';

interface SceneData {
  keys: string[];
  shade: Float32Array;
  responses: Map<string, Response>;
}

const hash = (x: number, y: number, seed = 0): number => {
  let h = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + 1274126177, 2246822519) ^ Math.imul(seed + 97, 3266489917);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const PETAL_LEVELS = 8;
const FLOWER = {cx: 120, cy: 134, petals: 12, length: 60, inner: 13, half: 9};

const materialFor = (key: string): ((l: number) => number) => {
  if (key.startsWith('petal:')) {
    return petal(Number(key.slice(6)) / PETAL_LEVELS);
  }
  return MATERIALS[key];
};

const buildScene = (): SceneData => {
  const keys: string[] = new Array(SCENE_W * SCENE_H);
  const shade = new Float32Array(SCENE_W * SCENE_H);
  const horizon = 78;
  const {cx, cy, petals, length, inner, half} = FLOWER;
  for (let y = 0; y < SCENE_H; y++) {
    for (let x = 0; x < SCENE_W; x++) {
      const i = y * SCENE_W + x;
      let key = 'sky';
      let s = 1 - 0.15 * (y / horizon);
      if (y >= horizon) {
        const grass = hash(Math.floor(x / 2), Math.floor(y / 3)) < 0.82;
        key = grass ? 'leaf' : 'soil';
        s = 0.65 + 0.7 * hash(x, y, 3);
      }
      if (x >= cx - 2 && x <= cx + 2 && y > cy) {
        key = 'leaf';
        s = 1.3;
      }
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);
      if (r < inner) {
        key = 'centre';
        s = 0.7 + 0.6 * hash(x, y, 7);
      } else if (r < length) {
        const step = 2 * Math.PI / petals;
        let d = ((Math.atan2(dy, dx) % step) + step) % step;
        d = Math.min(d, step - d);
        const wmax = half * Math.sin(Math.PI * (r - inner) / (length - inner));
        if (r * Math.sin(d) < wmax) {
          const u = Math.min(1, Math.max(0, (r - 30) / 8));
          key = `petal:${Math.round(u * PETAL_LEVELS)}`;
          s = 0.82 + 0.25 * Math.cos(d * 6) + 0.1 * hash(x, y, 11);
        }
      }
      keys[i] = key;
      shade[i] = s;
    }
  }
  const responses = new Map<string, Response>();
  new Set(keys).forEach(k => responses.set(k, responseOf(materialFor(k))));
  return {keys, shade, responses};
};

let sceneCache: SceneData | null = null;
const getScene = (): SceneData => {
  if (!sceneCache) {
    sceneCache = buildScene();
  }
  return sceneCache;
};

const enc = (v: number): number => Math.round(Math.min(1, Math.max(0, linearToSrgb(Math.max(0, v)))) * 255);

const viewColor = (view: View, r: Response, s: number): Vec3 => {
  if (view === 'human') {
    return xyzToSrgb(r.xyz.map(v => v * s) as Vec3);
  }
  if (view === 'dog') {
    const [sc, lc] = r.dog;
    const v = (0.3 * sc + 0.7 * lc) * s;
    const c = (lc - sc) / (lc + sc + 1e-6);
    return [enc(v * (1 + 0.9 * c)), enc(v * (1 + 0.55 * c)), enc(v * (1 - 1.3 * c))];
  }
  if (view === 'bee') {
    const [uv, b, g] = r.bee;
    return [enc(g * s), enc(b * s), enc(uv * s)];
  }
  if (view === 'bird') {
    const [uvs, sc, m, l] = r.bird;
    return [enc(l * s), enc(m * s), enc((sc + uvs) / 2 * s)];
  }
  const g = enc(r.bee[0] * s);
  return [g, g, g];
};

const drawView = (view: View): DrawFn => ctx => {
  const scene = getScene();
  const img = ctx.createImageData(SCENE_W, SCENE_H);
  for (let i = 0; i < scene.keys.length; i++) {
    const rgb = viewColor(view, scene.responses.get(scene.keys[i]) as Response, scene.shade[i]);
    img.data[i * 4] = rgb[0];
    img.data[i * 4 + 1] = rgb[1];
    img.data[i * 4 + 2] = rgb[2];
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
};

const MANTIS_ITEMS: {label: string; key: string}[] = [
  {label: '花瓣外圈（反射紫外）', key: 'petal:8'},
  {label: '花瓣内圈（吸收紫外）', key: 'petal:0'},
  {label: '叶子', key: 'leaf'},
  {label: '天空', key: 'sky'}
];

const drawMantis: DrawFn = ctx => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, MANTIS_W, MANTIS_H);
  const left = 40;
  const groupW = (MANTIS_W - left - 10) / MANTIS_ITEMS.length;
  const top = 20;
  const h = 170;
  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.moveTo(left + 0.5, top);
  ctx.lineTo(left + 0.5, top + h + 0.5);
  ctx.lineTo(MANTIS_W - 8, top + h + 0.5);
  ctx.stroke();
  text(ctx, '响应（白纸 = 1）', 4, 10, 'left', '#555', '11px sans-serif');
  MANTIS_ITEMS.forEach((item, gi) => {
    const resp = responseOf(materialFor(item.key)).mantis;
    const x0 = left + gi * groupW + 8;
    const bw = (groupW - 16) / resp.length;
    resp.forEach((v, k) => {
      const bh = Math.min(1.5, v) / 1.5 * h;
      ctx.fillStyle = peakColor(MANTIS_PEAKS[k]);
      ctx.fillRect(x0 + k * bw + 1, top + h - bh, bw - 2, bh);
    });
    text(ctx, item.label, x0 + (groupW - 16) / 2, top + h + 16, 'center', '#333', '11px sans-serif');
  });
  text(ctx, '每组 12 根柱子 = 12 个通道，从左到右峰值 315 → 720nm（紫色为紫外通道）', MANTIS_W / 2, MANTIS_H - 14, 'center', '#777', '11px sans-serif');
};

export {
  SENS_W,
  SENS_H,
  SCENE_W,
  SCENE_H,
  MANTIS_W,
  MANTIS_H,
  drawSensitivity,
  drawView,
  drawMantis
};
