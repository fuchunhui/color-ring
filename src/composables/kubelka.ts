import {Vec3} from '../utils/space';
import {
  DrawFn,
  Area,
  Spectrum,
  D65,
  sample,
  edge,
  spectrumXyz,
  xyzToSrgb,
  rgbCss,
  rgbHex,
  text,
  drawSpectrumBand,
  drawAxis,
  drawCurve
} from '../utils/spectral';
import {ksToReflectance, mixKubelkaMunk} from '../utils/physics';

interface Pigment {
  key: string;
  name: string;
  color: string;
  k: Spectrum;
  s: Spectrum;
}

const constant = (v: number): Spectrum => sample(() => v);

// 示意颜料：K（吸收）和 S（散射）都是用平滑函数造的曲线，不是某种真实颜料的测量值
const PIGMENTS: Pigment[] = [
  {key: 'white', name: '钛白', color: '#8A8A8A', k: constant(0.01), s: constant(8)},
  {key: 'black', name: '炭黑', color: '#222222', k: constant(12), s: constant(0.5)},
  {
    key: 'blue',
    name: '酞菁蓝',
    color: '#1F4FB8',
    k: sample(l => 0.8 + 8 * edge(l, 555, 22) + 1.5 * (1 - edge(l, 415, 12))),
    s: constant(1)
  },
  {
    key: 'yellow',
    name: '汉撒黄',
    color: '#D6A800',
    k: sample(l => 0.03 + 10 * (1 - edge(l, 490, 14))),
    s: constant(1)
  },
  {
    key: 'red',
    name: '镉红',
    color: '#C0282D',
    k: sample(l => 0.05 + 12 * (1 - edge(l, 585, 10))),
    s: constant(1)
  }
];

const byKey = (key: string): Pigment => PIGMENTS.find(item => item.key === key) || PIGMENTS[0];

const WHITE = byKey('white');
const BLUE = byKey('blue');
const YELLOW = byKey('yellow');

const reflectance = (p: Pigment): Spectrum => p.k.map((k, i) => ksToReflectance(k / p.s[i]));

/** 反射率在 D65 光下的颜色 */
const render = (refl: Spectrum): Vec3 => xyzToSrgb(spectrumXyz(D65, refl));

const mixBy = (a: Pigment, b: Pigment, wa: number): Spectrum => {
  return mixKubelkaMunk([
    {k: a.k, s: a.s, c: wa},
    {k: b.k, s: b.s, c: 1 - wa}
  ]);
};

const geometric = (a: Spectrum, b: Spectrum, w: number): Spectrum => a.map((v, i) => v ** w * b[i] ** (1 - w));

const rgbAverage = (a: Vec3, b: Vec3, w: number): Vec3 => {
  return a.map((v, i) => Math.round(v * w + b[i] * (1 - w))) as Vec3;
};

const PIGMENT_W = 700;
const PIGMENT_H = 320;

const drawPigments: DrawFn = (ctx, w, h) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const area: Area = {x: 48, y: 20, w: 480, h: 150};
  drawSpectrumBand(ctx, area, 0.25);
  text(ctx, '不透明涂层的反射率 R∞', area.x, 8, 'left', '#555', '11px sans-serif');
  PIGMENTS.forEach(p => drawCurve(ctx, area, reflectance(p), p.color, 2.4));
  drawAxis(ctx, area);
  [0, 0.5, 1].forEach(t => {
    text(ctx, `${t}`, area.x - 8, area.y + area.h * (1 - t), 'right', '#555', '11px sans-serif');
  });
  PIGMENTS.forEach((p, i) => {
    const x = 36 + i * 130;
    const y = 214;
    ctx.fillStyle = rgbCss(render(reflectance(p)));
    ctx.fillRect(x, y, 100, 60);
    ctx.strokeStyle = '#CCC';
    ctx.strokeRect(x + 0.5, y + 0.5, 99, 59);
    ctx.fillStyle = p.color;
    ctx.fillRect(x, y + 66, 100, 3);
    text(ctx, p.name, x + 50, y + 82, 'center', '#333', '12px sans-serif');
    text(ctx, rgbHex(render(reflectance(p))), x + 50, y + 98, 'center', '#555', '11px monospace');
  });
};

const KS_H = 230;

const drawKs: DrawFn = (ctx, w, h) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const area: Area = {x: 56, y: 22, w: 480, h: 150};
  drawSpectrumBand(ctx, area, 0.25);
  text(ctx, 'K/S（对数坐标）', area.x, 8, 'left', '#555', '11px sans-serif');
  PIGMENTS.forEach(p => {
    const values = p.k.map((k, i) => (Math.log10(Math.max(1e-3, k / p.s[i])) + 2) / 4);
    drawCurve(ctx, area, values, p.color, 2.4);
  });
  drawAxis(ctx, area);
  [-2, -1, 0, 1, 2].forEach(e => {
    const y = area.y + area.h * (1 - (e + 2) / 4);
    text(ctx, `${10 ** e}`, area.x - 8, y, 'right', '#555', '11px sans-serif');
  });
  PIGMENTS.forEach((p, i) => {
    const y = 216;
    ctx.fillStyle = p.color;
    ctx.fillRect(area.x + i * 96, y - 2, 18, 3);
    text(ctx, p.name, area.x + i * 96 + 24, y, 'left', '#333', '12px sans-serif');
  });
};

const STRIP_STEPS = 11;
const CELL = 54;
const LABEL_W = 150;
const STRIP_W = LABEL_W + STRIP_STEPS * CELL + 10;
const STRIP_H = 3 * 40 + 24;

interface MixRow {
  name: string;
  colors: Vec3[];
}

const drawRows = (ctx: CanvasRenderingContext2D, w: number, h: number, rows: MixRow[], top: string, bottom: string): void => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  text(ctx, top, LABEL_W + 2, 9, 'left', '#555', '11px sans-serif');
  text(ctx, bottom, LABEL_W + STRIP_STEPS * CELL - 2, 9, 'right', '#555', '11px sans-serif');
  rows.forEach((row, r) => {
    const y = 20 + r * 40;
    text(ctx, row.name, 6, y + 17, 'left', '#333', '12px sans-serif');
    row.colors.forEach((c, i) => {
      ctx.fillStyle = rgbCss(c);
      ctx.fillRect(LABEL_W + i * CELL, y, CELL, 34);
    });
  });
};

const steps = Array.from({length: STRIP_STEPS}, (_, i) => i / (STRIP_STEPS - 1));

/** 蓝 + 黄：w 为蓝所占比例；三行分别是 K–M、反射率几何平均、RGB 平均 */
const blueYellowRows = (): MixRow[] => {
  const blueRgb = render(reflectance(BLUE));
  const yellowRgb = render(reflectance(YELLOW));
  return [
    {name: 'Kubelka–Munk', colors: steps.map(w => render(mixBy(BLUE, YELLOW, w)))},
    {
      name: '反射率几何平均',
      colors: steps.map(w => render(geometric(reflectance(BLUE), reflectance(YELLOW), w)))
    },
    {name: 'RGB 数值平均', colors: steps.map(w => rgbAverage(blueRgb, yellowRgb, w))}
  ];
};

const drawBlueYellowStrips: DrawFn = (ctx, w, h) => {
  drawRows(ctx, w, h, blueYellowRows(), '← 全黄', '全蓝 →');
};

const MIX_W = 700;
const MIX_H = 250;

const drawBlueYellowSpectra = (getWeight: () => number): DrawFn => (ctx, w, h) => {
  const weight = getWeight();
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const area: Area = {x: 48, y: 22, w: 480, h: 170};
  drawSpectrumBand(ctx, area, 0.25);
  const rb = reflectance(BLUE);
  const ry = reflectance(YELLOW);
  const lines: {name: string; color: string; values: Spectrum; width: number}[] = [
    {name: '酞菁蓝', color: BLUE.color, values: rb, width: 1.6},
    {name: '汉撒黄', color: YELLOW.color, values: ry, width: 1.6},
    {name: 'Kubelka–Munk 混合', color: '#188038', values: mixBy(BLUE, YELLOW, weight), width: 2.8},
    {name: '几何平均', color: '#777', values: geometric(rb, ry, weight), width: 2}
  ];
  lines.forEach(l => drawCurve(ctx, area, l.values, l.color, l.width));
  drawAxis(ctx, area);
  text(ctx, `反射率（蓝 ${Math.round(weight * 100)}% / 黄 ${Math.round((1 - weight) * 100)}%）`, area.x, 10, 'left', '#555', '11px sans-serif');
  lines.forEach((l, i) => {
    const y = area.y + 14 + i * 18;
    ctx.fillStyle = l.color;
    ctx.fillRect(area.x + area.w + 18, y - 2, 18, 3);
    text(ctx, l.name, area.x + area.w + 42, y, 'left', '#333', '12px sans-serif');
  });
};

const mixReadout = (weight: number): {name: string; hex: string}[] => {
  const rb = reflectance(BLUE);
  const ry = reflectance(YELLOW);
  return [
    {name: 'Kubelka–Munk', hex: rgbHex(render(mixBy(BLUE, YELLOW, weight)))},
    {name: '反射率几何平均', hex: rgbHex(render(geometric(rb, ry, weight)))},
    {name: 'RGB 数值平均', hex: rgbHex(rgbAverage(render(rb), render(ry), weight))}
  ];
};

const TINTABLE = ['blue', 'yellow', 'red', 'black'].map(byKey);

/** 颜料 + 白：w 为白所占比例；K–M 里钛白散射很强，加一点就明显变浅 */
const drawTintStrips = (getKey: () => string): DrawFn => (ctx, w, h) => {
  const p = byKey(getKey());
  const pigmentRgb = render(reflectance(p));
  const whiteRgb = render(reflectance(WHITE));
  const rows: MixRow[] = [
    {name: 'Kubelka–Munk', colors: steps.map(t => render(mixBy(WHITE, p, t)))},
    {name: 'RGB 数值平均', colors: steps.map(t => rgbAverage(whiteRgb, pigmentRgb, t))}
  ];
  drawRows(ctx, w, h, rows, `← 纯${p.name}`, '纯白 →');
};

const TINT_H = 2 * 40 + 24;

export {
  PIGMENT_W,
  PIGMENT_H,
  KS_H,
  STRIP_W,
  STRIP_H,
  MIX_W,
  MIX_H,
  TINT_H,
  TINTABLE,
  drawPigments,
  drawKs,
  drawBlueYellowStrips,
  drawBlueYellowSpectra,
  drawTintStrips,
  mixReadout
};
