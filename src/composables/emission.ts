import {DrawFn, Area, text, rgbCss, rgbHex, drawAxis} from '../utils/spectral';
import {Vec3, xyzToLinear} from '../utils/space';
import {wavelengthToXyz, xyzToClipRgb, xyzToDisplayRgb} from '../utils/cie';
import {LINE_SOURCES, LineSource, linesXyz} from '../utils/optics';
import {makePhotoScene, createImage, drawLinearImage} from '../utils/scene';

const lampRgb = (source: LineSource): Vec3 => xyzToDisplayRgb(linesXyz(source.lines));

const lampHex = (key: string): string => {
  const source = LINE_SOURCES.find(item => item.key === key) || LINE_SOURCES[0];
  return rgbHex(lampRgb(source));
};

const lineColor = (l: number): Vec3 => xyzToClipRgb(wavelengthToXyz(l));

const SPEC_W = 760;
const SPEC_H = 220;

const drawLineSpectrum = (get: () => string): DrawFn => (ctx, w, h) => {
  const source = LINE_SOURCES.find(item => item.key === get()) || LINE_SOURCES[0];
  const area: Area = {x: 30, y: 16, w: 660, h: 120};
  ctx.fillStyle = '#05070A';
  ctx.fillRect(0, 0, w, h);
  const x = (l: number) => area.x + (l - 380) / 400 * area.w;
  ctx.fillStyle = '#0B1016';
  ctx.fillRect(area.x, area.y, area.w, area.h);
  source.lines.forEach(({l, i}) => {
    const color = rgbCss(lineColor(l));
    const top = area.y + area.h * (1 - Math.min(1, i));
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillRect(x(l) - 1, top, 2, area.y + area.h - top);
    ctx.shadowBlur = 0;
  });
  const stripe = ctx.createLinearGradient(area.x, 0, area.x + area.w, 0);
  for (let l = 380; l <= 780; l += 20) {
    stripe.addColorStop((l - 380) / 400, rgbCss(lineColor(l)));
  }
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = stripe;
  ctx.fillRect(area.x, area.y + area.h + 8, area.w, 10);
  ctx.globalAlpha = 1;
  source.lines.forEach(({l, i}) => {
    if (i >= 0.3) {
      ctx.fillStyle = '#FFF';
      ctx.fillRect(x(l) - 0.5, area.y + area.h + 8, 1, 10);
    }
  });
  drawAxis(ctx, {x: area.x, y: area.y + 20, w: area.w, h: area.h});
  const labelled = source.lines.filter(item => item.i >= 0.3 && item.l >= 380 && item.l <= 780).slice(0, 6);
  labelled.forEach(({l}, k) => {
    text(ctx, `${l}`, x(l), area.y + 8 + (k % 2) * 11, 'center', '#C7D0DA', '10px sans-serif');
  });
  const swatch = lampRgb(source);
  ctx.fillStyle = rgbCss(swatch);
  ctx.fillRect(area.x + area.w + 14, area.y, 44, 44);
  text(ctx, '灯光', area.x + area.w + 36, area.y + 56, 'center', '#C7D0DA', '11px sans-serif');
  text(ctx, rgbHex(swatch), area.x + area.w + 36, area.y + 70, 'center', '#9FB3C8', '10px monospace');
  text(ctx, `${source.name}（${source.symbol}）：${source.note}`, area.x, h - 10, 'left', '#9FB3C8', '12px sans-serif');
};

const TUBES_W = 800;
const TUBES_H = 260;

const drawTubes = (): DrawFn => (ctx, w, h) => {
  ctx.fillStyle = '#05070A';
  ctx.fillRect(0, 0, w, h);
  const slot = w / LINE_SOURCES.length;
  LINE_SOURCES.forEach((source, k) => {
    const cx = slot * (k + 0.5);
    const rgb = lampRgb(source);
    const core = rgb.map(v => Math.round(v + (255 - v) * 0.55));
    const top = 40;
    const bottom = h - 56;
    const half = 18;
    ctx.save();
    ctx.shadowColor = rgbCss(rgb);
    ctx.shadowBlur = 34;
    ctx.fillStyle = rgbCss(rgb);
    ctx.beginPath();
    ctx.moveTo(cx - half, top + half);
    ctx.arc(cx, top + half, half, Math.PI, 0);
    ctx.lineTo(cx + half, bottom - half);
    ctx.arc(cx, bottom - half, half, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const grad = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
    grad.addColorStop(0, rgbCss(rgb));
    grad.addColorStop(0.5, `rgb(${core.join(',')})`);
    grad.addColorStop(1, rgbCss(rgb));
    ctx.fillStyle = grad;
    ctx.fillRect(cx - half + 4, top + half, half * 2 - 8, bottom - top - half * 2);
    ctx.fillStyle = '#5A6470';
    ctx.fillRect(cx - 9, top - 14, 18, 14);
    ctx.fillRect(cx - 9, bottom, 18, 14);
    text(ctx, source.symbol, cx, h - 30, 'center', '#E6EDF3', '15px sans-serif');
    text(ctx, source.name, cx, h - 12, 'center', '#9FB3C8', '12px sans-serif');
  });
};

interface Level {
  n: number;
  e: number;
}

const LEVELS: Level[] = [2, 3, 4, 5, 6].map(n => ({n, e: -13.6 / (n * n)}));
const BALMER = [3, 4, 5, 6];

const LEVELS_W = 520;
const LEVELS_H = 320;

const balmerLambda = (n: number): number => 1239.84 / (13.6 / 4 - 13.6 / (n * n));

const drawEnergyLevels = (): DrawFn => (ctx, w, h) => {
  const top = 24;
  const bottom = h - 24;
  const y = (depth: number) => top + depth / 3.6 * (bottom - top);
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  LEVELS.concat([{n: 0, e: 0}]).forEach(level => {
    const label = level.n === 0 ? '∞（E = 0）' : `n = ${level.n}（${level.e.toFixed(2)} eV）`;
    ctx.beginPath();
    ctx.moveTo(40, y(-level.e));
    ctx.lineTo(300, y(-level.e));
    ctx.stroke();
    text(ctx, label, 308, y(-level.e), 'left', '#333', '12px sans-serif');
  });
  BALMER.forEach((n, k) => {
    const l = balmerLambda(n);
    const color = rgbCss(lineColor(l));
    const x = 80 + k * 52;
    const y0 = y(-LEVELS[n - 2].e);
    const y1 = y(-LEVELS[0].e);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1 - 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x - 6, y1 - 11);
    ctx.lineTo(x + 6, y1 - 11);
    ctx.fill();
    text(ctx, `${l.toFixed(0)}`, x, y1 + 14, 'center', '#333', '11px sans-serif');
  });
  text(ctx, '氢原子的能级（只画 n ≥ 2，向 n = 2 跃迁的是巴尔末线系）', 10, 10, 'left', '#333', '12px sans-serif');
  text(ctx, '数字是发射光的波长 nm（由 ΔE = hc/λ 算出，真空值）', 10, h - 8, 'left', '#777', '11px sans-serif');
};

interface Flame {
  symbol: string;
  name: string;
  color: string;
  spectrum: string;
  look: string;
}

/** 颜色为手工取的典型外观，具体色调随火焰温度、杂质、观察条件而变 */
const FLAMES: Flame[] = [
  {symbol: 'Li', name: '锂', color: '#C8203C', spectrum: '670.8 nm 谱线（另有较弱的 610.4 nm）', look: '胭脂红'},
  {symbol: 'Na', name: '钠', color: '#FFD21A', spectrum: '589.0 / 589.6 nm 的 D 线', look: '亮黄色，很强，常掩盖其他颜色'},
  {symbol: 'K', name: '钾', color: '#B79CE0', spectrum: '766.5 / 769.9 nm（近红外）和 404 nm 附近', look: '淡紫色，常要透过蓝色钴玻璃滤去钠的黄光'},
  {symbol: 'Ca', name: '钙', color: '#F26A2E', spectrum: '约 622 nm 的 CaOH 分子带（另有 554 nm）', look: '砖红 / 橙红'},
  {symbol: 'Sr', name: '锶', color: '#E3262E', spectrum: '606–688 nm 的 SrOH 分子带', look: '深红'},
  {symbol: 'Ba', name: '钡', color: '#A8D870', spectrum: '510–530 nm 的 BaOH 分子带，553.5 nm 原子线', look: '黄绿'},
  {symbol: 'Cu', name: '铜', color: '#2FB89A', spectrum: 'CuCl / CuOH 的分子带（蓝绿区）', look: '蓝绿'}
];

const SCENE_W = 320;
const SCENE_H = 220;

type SceneImage = ReturnType<typeof makePhotoScene>['image'];
let sceneCache: SceneImage | null = null;

const sceneImage = (): SceneImage => {
  if (!sceneCache) {
    sceneCache = makePhotoScene(SCENE_W, SCENE_H).image;
  }
  return sceneCache;
};

const sodiumLamp = (): Vec3 => {
  const source = LINE_SOURCES.find(item => item.key === 'na') || LINE_SOURCES[0];
  const lin = xyzToLinear(linesXyz(source.lines)).map(v => Math.max(0, v));
  const max = Math.max(...lin);
  return lin.map(v => v / max) as Vec3;
};

/** 钠灯下只有一个 589 nm 波长：反射率近似取红、绿通道的加权平均（蓝几乎不起作用） */
const drawSodiumScene = (sodium: boolean): DrawFn => ctx => {
  const src = sceneImage();
  if (!sodium) {
    drawLinearImage(ctx, src);
    return;
  }
  const out = createImage(src.width, src.height);
  const lamp = sodiumLamp();
  for (let i = 0; i < src.width * src.height; i++) {
    const refl = 0.55 * src.data[i * 3] + 0.45 * src.data[i * 3 + 1];
    for (let j = 0; j < 3; j++) {
      out.data[i * 3 + j] = lamp[j] * refl;
    }
  }
  drawLinearImage(ctx, out);
};

export {
  Flame,
  FLAMES,
  SPEC_W,
  SPEC_H,
  TUBES_W,
  TUBES_H,
  LEVELS_W,
  LEVELS_H,
  SCENE_W,
  SCENE_H,
  lampHex,
  drawLineSpectrum,
  drawTubes,
  drawEnergyLevels,
  drawSodiumScene
};
