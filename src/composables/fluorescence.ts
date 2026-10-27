import {
  WAVELENGTHS,
  D65,
  sample,
  edge,
  spectrumXyz,
  xyzToSrgb,
  rgbCss,
  drawSpectrumBand,
  drawAxis,
  normalize,
  text,
  wlX
} from '../utils/spectral';
import type {Area, DrawFn, Spectrum} from '../utils/spectral';
import {xyzToLab} from '../utils/space';
import type {Vec3} from '../utils/space';
import {xyzToDisplayRgb, xyzToClipRgb, wavelengthToXyz} from '../utils/cie';

interface Fluorophore {
  key: string;
  name: string;
  absCenter: number;
  absWidth: number;
  emCenter: number;
  emWidth: number;
  color: string;
}

// 吸收峰与发射峰的位置都是常见的量级，曲线形状为高斯，仅作示意
const DYES: Fluorophore[] = [
  {key: 'brightener', name: '荧光增白剂（二苯乙烯类）', absCenter: 350, absWidth: 28, emCenter: 435, emWidth: 24, color: '#5B6CFF'},
  {key: 'quinine', name: '奎宁（汤力水）', absCenter: 350, absWidth: 30, emCenter: 450, emWidth: 30, color: '#2E86DE'},
  {key: 'fluorescein', name: '荧光素', absCenter: 490, absWidth: 20, emCenter: 520, emWidth: 22, color: '#2EAA4A'},
  {key: 'highlighter', name: '荧光笔（黄绿色）', absCenter: 440, absWidth: 35, emCenter: 515, emWidth: 25, color: '#9DC800'},
  {key: 'rhodamine', name: '罗丹明', absCenter: 555, absWidth: 22, emCenter: 580, emWidth: 24, color: '#E67E22'}
];

const PLOT_W = 640;
const PLOT_H = 240;
const SCENE_W = 320;
const SCENE_H = 220;

const FULL_MIN = 300;
const FULL_MAX = 700;
const area: Area = {x: 40, y: 16, w: PLOT_W - 70, h: PLOT_H - 56};
const fx = (l: number): number => area.x + (l - FULL_MIN) / (FULL_MAX - FULL_MIN) * area.w;

const gaussSimple = (l: number, c: number, s: number): number => Math.exp(-0.5 * ((l - c) / s) ** 2);

/** 激发（吸收）谱与发射谱，横轴延伸到紫外，标出斯托克斯位移 */
const drawStokes = (dye: () => Fluorophore): DrawFn => ctx => {
  const d = dye();
  // 可见光部分铺色带，紫外部分用浅紫灰色
  ctx.fillStyle = '#EDE6F5';
  ctx.fillRect(area.x, area.y, fx(380) - area.x, area.h);
  ctx.save();
  ctx.globalAlpha = 0.28;
  for (let px = Math.ceil(fx(380)); px < fx(FULL_MAX); px++) {
    const l = FULL_MIN + (px - area.x) / area.w * (FULL_MAX - FULL_MIN);
    ctx.fillStyle = rgbCss(xyzToClipRgb(wavelengthToXyz(l)));
    ctx.fillRect(px, area.y, 1, area.h);
  }
  ctx.restore();
  const trace = (fn: (l: number) => number, color: string, fill: string) => {
    ctx.beginPath();
    for (let l = FULL_MIN; l <= FULL_MAX; l += 2) {
      const x = fx(l);
      const y = area.y + area.h - fn(l) * area.h;
      if (l === FULL_MIN) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.lineTo(fx(FULL_MAX), area.y + area.h);
    ctx.lineTo(fx(FULL_MIN), area.y + area.h);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  trace(l => gaussSimple(l, d.absCenter, d.absWidth), '#7D3C98', 'rgba(125,60,152,0.18)');
  trace(l => gaussSimple(l, d.emCenter, d.emWidth), d.color, 'rgba(0,0,0,0.08)');
  const y = area.y + 22;
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(fx(d.absCenter), y);
  ctx.lineTo(fx(d.emCenter), y);
  ctx.moveTo(fx(d.emCenter) - 6, y - 4);
  ctx.lineTo(fx(d.emCenter), y);
  ctx.lineTo(fx(d.emCenter) - 6, y + 4);
  ctx.stroke();
  text(ctx, `斯托克斯位移 ${d.emCenter - d.absCenter} nm`, (fx(d.absCenter) + fx(d.emCenter)) / 2, y - 10, 'center', '#333', '12px sans-serif');
  text(ctx, '吸收（激发）', fx(d.absCenter), area.y + area.h - 8, 'center', '#7D3C98', '11px sans-serif');
  text(ctx, '发射', fx(d.emCenter), area.y + area.h - 8, 'center', d.color, '11px sans-serif');
  ctx.strokeStyle = '#888';
  ctx.beginPath();
  ctx.moveTo(area.x, area.y + area.h + 0.5);
  ctx.lineTo(area.x + area.w, area.y + area.h + 0.5);
  ctx.stroke();
  for (let l = 300; l <= 650; l += 50) {
    text(ctx, `${l}`, fx(l), area.y + area.h + 14, 'center', '#555', '11px sans-serif');
  }
  text(ctx, 'nm', area.x + area.w + 4, area.y + area.h + 14, 'left', '#555', '11px sans-serif');
  text(ctx, '紫外（看不见）', (area.x + fx(380)) / 2, area.y + area.h - 26, 'center', '#7D3C98', '11px sans-serif');
};

// ---------- 纸张白度 ----------

/** 未加增白剂的纸：整体约 85%，蓝端略低（泛黄） */
const PAPER: Spectrum = sample(l => 0.86 - 0.14 * (1 - edge(l, 470, 22)));

/** 示意的 D65 紫外：400nm 以下沿用 380nm 的功率，340~400nm 用于激发增白剂 */
const uvPower = (l: number): number => {
  if (l >= 380) {
    return D65[Math.min(D65.length - 1, Math.round((l - 380) / 5))];
  }
  return D65[0] * 0.8;
};

const BRIGHTENER = DYES[0];
const BRIGHTENER_GAIN = 0.75;

/** 荧光项：被紫外激发的发射，以相对于 D65 的“辐亮度因子”表示 */
const fluorescenceFactor = (uv: number, load: number): Spectrum => {
  let absorbed = 0;
  for (let l = 330; l <= 420; l += 2) {
    absorbed += uvPower(l) * uv * gaussSimple(l, BRIGHTENER.absCenter, BRIGHTENER.absWidth) * 2;
  }
  const emitted = sample(l => gaussSimple(l, BRIGHTENER.emCenter, BRIGHTENER.emWidth));
  const sum = emitted.reduce((a, b) => a + b, 0) * 5;
  return emitted.map((e, i) => load * BRIGHTENER_GAIN * absorbed * e / sum / D65[i]);
};

const paperFactor = (uv: number, load: number): Spectrum => {
  const f = fluorescenceFactor(uv, load);
  return PAPER.map((r, i) => r + f[i]);
};

const D65_X = 0.3127;
const D65_Y = 0.329;

interface Whiteness {
  rgb: Vec3;
  Y: number;
  x: number;
  y: number;
  W: number;
  blue: number;
  b: number;
}

const paperWhiteness = (uv: number, load: number): Whiteness => {
  const factor = paperFactor(uv, load);
  const [X, Y, Z] = spectrumXyz(D65, factor);
  const sum = X + Y + Z;
  const x = X / sum;
  const y = Y / sum;
  const W = Y * 100 + 800 * (D65_X - x) + 1700 * (D65_Y - y);
  return {rgb: xyzToSrgb([X, Y, Z]), Y: Y * 100, x, y, W, blue: factor[(450 - 380) / 5], b: xyzToLab([X, Y, Z])[2]};
};

const PAPER_MAX = 1.4;

const drawPaperSpectrum = (uv: () => number): DrawFn => ctx => {
  drawSpectrumBand(ctx, area, 0.28);
  const base = area.y + area.h;
  const line = (values: Spectrum, color: string, width: number) => {
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = wlX(area, WAVELENGTHS[i]);
      const y = base - Math.min(PAPER_MAX, v) / PAPER_MAX * area.h;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  const y100 = base - area.h / PAPER_MAX;
  ctx.strokeStyle = '#E8820C';
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(area.x, y100 + 0.5);
  ctx.lineTo(area.x + area.w, y100 + 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, '100%（完全漫反射白）', area.x + area.w - 4, y100 - 8, 'right', '#E8820C', '11px sans-serif');
  line(PAPER, '#999', 2);
  line(paperFactor(uv(), 1), '#2E4BD6', 2.5);
  drawAxis(ctx, area);
  [['#999', '未加增白剂的纸'], ['#2E4BD6', '加了增白剂（蓝端可超过 100%）']].forEach(([color, label], i) => {
    ctx.fillStyle = color;
    ctx.fillRect(area.x + 8 + i * 140, area.y + 8, 14, 3);
    text(ctx, label, area.x + 28 + i * 140, area.y + 9, 'left', '#333', '11px sans-serif');
  });
};

// ---------- 黑光灯场景 ----------

interface Item {
  name: string;
  /** 白光下的颜色 */
  visible: string;
  /** 紫外下发出的颜色，null 表示不发光 */
  glow: string | null;
}

const emissionColor = (d: Fluorophore, scale = 1, lighten = 0): string => {
  const em = normalize(sample(l => gaussSimple(l, d.emCenter, d.emWidth)));
  const [r, g, b] = xyzToDisplayRgb(spectrumXyz(em.map(() => 1), em));
  return rgbCss([r, g, b].map(v => Math.round(Math.min(255, v + lighten * (255 - v)) * scale)) as Vec3);
};

const ITEMS: Item[] = [
  {name: '增白纸', visible: '#F7F7F4', glow: emissionColor(DYES[0], 1, 0.45)},
  {name: '汤力水', visible: '#EEF3F1', glow: emissionColor(DYES[1], 0.95)},
  {name: '荧光笔', visible: '#D8E83A', glow: emissionColor(DYES[3])},
  {name: '普通白棉衣', visible: '#E9E4D2', glow: null},
  {name: '洗过增白剂的衬衫', visible: '#F3F3F0', glow: emissionColor(DYES[0], 0.85, 0.4)},
  {name: '钞票防伪线', visible: '#CBB98F', glow: emissionColor(DYES[2], 0.9)}
];

const drawBlackLight = (uv: () => boolean): DrawFn => (ctx, w, h) => {
  const dark = uv();
  ctx.fillStyle = dark ? '#150A22' : '#EEF0F2';
  ctx.fillRect(0, 0, w, h);
  const cols = 3;
  const cw = w / cols;
  const ch = h / 2;
  ITEMS.forEach((item, i) => {
    const cx = (i % cols) * cw + cw / 2;
    const cy = Math.floor(i / cols) * ch + ch / 2 - 8;
    const lit = dark && item.glow;
    const fill = dark ? (item.glow || '#241238') : item.visible;
    if (lit) {
      const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 70);
      g.addColorStop(0, 'rgba(255,255,255,0.18)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - 80, cy - 80, 160, 160);
    }
    ctx.fillStyle = fill;
    ctx.fillRect(cx - 40, cy - 28, 80, 56);
    if (item.name === '钞票防伪线') {
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.4)' : '#8A7A55';
      ctx.fillRect(cx - 4, cy - 28, 8, 56);
    }
    ctx.strokeStyle = dark ? 'rgba(180,140,255,0.3)' : '#CCC';
    ctx.strokeRect(cx - 40.5, cy - 28.5, 81, 57);
    text(ctx, item.name, cx, cy + 46, 'center', dark ? '#CDB8F0' : '#444', '12px sans-serif');
  });
};

export {
  DYES,
  PLOT_W,
  PLOT_H,
  SCENE_W,
  SCENE_H,
  drawStokes,
  paperWhiteness,
  drawPaperSpectrum,
  drawBlackLight,
  WAVELENGTHS,
  wlX
};
