import {Vec3} from '../utils/space';
import {
  Spectrum,
  DrawFn,
  Area,
  D65,
  sample,
  gauss,
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

interface Pigment {
  key: string;
  name: string;
  color: string;
  refl: Spectrum;
}

const flat = (l: number, center: number, half: number): number => Math.exp(-(((l - center) / half) ** 8));

// 示意颜料：用平滑函数造的反射率曲线，不是某种真实颜料的测量值
const PIGMENTS: Pigment[] = [
  {key: 'c', name: '青 C', color: '#00A6D6', refl: sample(l => 0.025 + 0.75 * (1 - edge(l, 585, 10)))},
  {key: 'm', name: '品红 M', color: '#D6007F', refl: sample(l => 0.025 + 0.75 * (1 - flat(l, 545, 55)))},
  {key: 'y', name: '黄 Y', color: '#E0B800', refl: sample(l => 0.025 + 0.8 * edge(l, 500, 10))},
  {key: 'b', name: '蓝颜料', color: '#2B3FA0', refl: sample(l => 0.025 + 0.3 * gauss(l, 458, 38, 56))}
];

const [CYAN, MAGENTA, YELLOW, BLUE] = PIGMENTS;
const PAPER: Spectrum = sample(() => 1);

const mulSpectrum = (...list: Spectrum[]): Spectrum => PAPER.map((_, i) => list.reduce((p, s) => p * s[i], 1));

const mixGeometric = (a: Spectrum, b: Spectrum, w: number): Spectrum => a.map((v, i) => v ** w * b[i] ** (1 - w));

const mixArithmetic = (a: Spectrum, b: Spectrum, w: number): Spectrum => a.map((v, i) => v * w + b[i] * (1 - w));

/** 反射率在 D65 光下看起来的颜色 */
const render = (refl: Spectrum): Vec3 => xyzToSrgb(spectrumXyz(D65, refl));

const clamp255 = (v: number): number => Math.round(Math.min(255, Math.max(0, v)));

const BLUE_RGB = render(BLUE.refl);
const YELLOW_RGB = render(YELLOW.refl);

type Mixer = (w: number) => Vec3;

// w 为蓝色所占比例
const MIXERS: {name: string; mix: Mixer}[] = [
  {name: '光谱·几何平均', mix: w => render(mixGeometric(BLUE.refl, YELLOW.refl, w))},
  {name: '光谱·算术平均', mix: w => render(mixArithmetic(BLUE.refl, YELLOW.refl, w))},
  {
    name: 'RGB 数值平均',
    mix: w => BLUE_RGB.map((v, i) => clamp255(v * w + YELLOW_RGB[i] * (1 - w))) as Vec3
  },
  {
    name: 'RGB 相乘（multiply）',
    mix: w => BLUE_RGB.map((v, i) => clamp255(255 * (v / 255) ** w * (YELLOW_RGB[i] / 255) ** (1 - w))) as Vec3
  },
  {
    name: 'RGB 取反叠加（1 − RGB）',
    mix: w => BLUE_RGB.map((v, i) => {
      return clamp255(255 - (2 * w * (255 - v) + 2 * (1 - w) * (255 - YELLOW_RGB[i])));
    }) as Vec3
  },
  {
    name: 'RGB 平均（纯蓝 + 纯黄）',
    mix: w => [clamp255(255 * (1 - w)), clamp255(255 * (1 - w)), clamp255(255 * w)] as Vec3
  }
];

interface Item {
  name: string;
  refl: Spectrum;
  color: string;
}

const PLOT_X = 44;

const drawReflectance = (items: Item[], plotH: number): DrawFn => ctx => {
  const a: Area = {x: PLOT_X, y: 14, w: 620, h: plotH};
  drawSpectrumBand(ctx, a, 0.18);
  ctx.strokeStyle = '#DDD';
  ctx.lineWidth = 1;
  [0, 0.5, 1].forEach(v => {
    const y = Math.round(a.y + a.h - v * a.h) + 0.5;
    ctx.beginPath();
    ctx.moveTo(a.x, y);
    ctx.lineTo(a.x + a.w, y);
    ctx.stroke();
    text(ctx, `${v}`, a.x - 8, y, 'right', '#555', '11px sans-serif');
  });
  items.forEach(({refl, color}) => drawCurve(ctx, a, refl, color, 2.5));
  drawAxis(ctx, a);
  text(ctx, '反射率', 8, a.y - 4, 'left', '#555', '11px sans-serif');

  const y0 = a.y + a.h + 36;
  const cellW = Math.min(96, Math.floor((a.w + 20) / items.length));
  items.forEach(({name, refl}, i) => {
    const x = PLOT_X + i * cellW;
    const rgb = render(refl);
    ctx.fillStyle = rgbCss(rgb);
    ctx.fillRect(x, y0, cellW - 12, 34);
    ctx.strokeStyle = '#CCC';
    ctx.strokeRect(x + 0.5, y0 + 0.5, cellW - 13, 33);
    text(ctx, name, x, y0 + 46, 'left', '#333', '12px sans-serif');
    text(ctx, rgbHex(rgb), x, y0 + 61, 'left', '#777', '11px Consolas, monospace');
  });
};

const PIGMENT_W = 700;
const PIGMENT_PLOT_H = 150;
const PIGMENT_H = 14 + PIGMENT_PLOT_H + 36 + 70;

const PIGMENT_ITEMS: Item[] = [
  {name: '白纸', refl: PAPER, color: '#999'},
  ...PIGMENTS.map(({name, refl, color}) => ({name, refl, color}))
];

const drawPigments = drawReflectance(PIGMENT_ITEMS, PIGMENT_PLOT_H);

const OVERPRINT_ITEMS: Item[] = [
  {name: '青 C', refl: CYAN.refl, color: CYAN.color},
  {name: '品红 M', refl: MAGENTA.refl, color: MAGENTA.color},
  {name: '黄 Y', refl: YELLOW.refl, color: YELLOW.color},
  {name: 'C + M', refl: mulSpectrum(CYAN.refl, MAGENTA.refl), color: '#2E3FB0'},
  {name: 'M + Y', refl: mulSpectrum(MAGENTA.refl, YELLOW.refl), color: '#D32F2F'},
  {name: 'C + Y', refl: mulSpectrum(CYAN.refl, YELLOW.refl), color: '#2E9B3F'},
  {name: 'C + M + Y', refl: mulSpectrum(CYAN.refl, MAGENTA.refl, YELLOW.refl), color: '#222'}
];

const OVERPRINT_H = 14 + 150 + 36 + 70;
const drawOverprint = drawReflectance(OVERPRINT_ITEMS, 150);

const STEPS = 10;
const STRIP_LABEL_W = 176;
const STRIP_CELL = 44;
const STRIP_GAP = 2;
const STRIP_TOP = 34;
const STRIP_ROW_H = 56;
const STRIP_W = STRIP_LABEL_W + (STEPS + 1) * (STRIP_CELL + STRIP_GAP) + 130;
const STRIP_H = STRIP_TOP + MIXERS.length * STRIP_ROW_H + 8;

const drawMixStrips = (weight: () => number): DrawFn => ctx => {
  const w = weight();
  const selected = Math.round((1 - w) * STEPS);
  const stripEnd = STRIP_LABEL_W + (STEPS + 1) * (STRIP_CELL + STRIP_GAP) - STRIP_GAP;
  text(ctx, '蓝 100%', STRIP_LABEL_W, 14, 'left', '#2B3FA0', 'bold 12px sans-serif');
  text(ctx, '黄 100%', stripEnd, 14, 'right', '#B08A00', 'bold 12px sans-serif');
  MIXERS.forEach(({name, mix}, row) => {
    const y = STRIP_TOP + row * STRIP_ROW_H;
    text(ctx, name, 8, y + STRIP_CELL / 2, 'left', '#222', '12px sans-serif');
    for (let i = 0; i <= STEPS; i++) {
      const x = STRIP_LABEL_W + i * (STRIP_CELL + STRIP_GAP);
      ctx.fillStyle = rgbCss(mix(1 - i / STEPS));
      ctx.fillRect(x, y, STRIP_CELL, STRIP_CELL);
      if (i === selected) {
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 1, y - 1, STRIP_CELL + 2, STRIP_CELL + 2);
      }
    }
    const current = mix(w);
    ctx.fillStyle = rgbCss(current);
    ctx.fillRect(stripEnd + 14, y, 52, STRIP_CELL);
    ctx.strokeStyle = '#CCC';
    ctx.lineWidth = 1;
    ctx.strokeRect(stripEnd + 14.5, y + 0.5, 51, STRIP_CELL - 1);
    text(ctx, rgbHex(current), stripEnd + 72, y + STRIP_CELL / 2, 'left', '#444', '11px Consolas, monospace');
  });
};

const MIX_W = 700;
const MIX_H = 268;

const drawMixSpectra = (weight: () => number): DrawFn => ctx => {
  const w = weight();
  const a: Area = {x: PLOT_X, y: 16, w: 620, h: 170};
  const geometric = mixGeometric(BLUE.refl, YELLOW.refl, w);
  const arithmetic = mixArithmetic(BLUE.refl, YELLOW.refl, w);
  drawSpectrumBand(ctx, a, 0.18);
  ctx.strokeStyle = '#DDD';
  ctx.lineWidth = 1;
  [0, 0.5, 1].forEach(v => {
    const y = Math.round(a.y + a.h - v * a.h) + 0.5;
    ctx.beginPath();
    ctx.moveTo(a.x, y);
    ctx.lineTo(a.x + a.w, y);
    ctx.stroke();
    text(ctx, `${v}`, a.x - 8, y, 'right', '#555', '11px sans-serif');
  });
  drawCurve(ctx, a, BLUE.refl, BLUE.color, 1.5);
  drawCurve(ctx, a, YELLOW.refl, YELLOW.color, 1.5);
  ctx.setLineDash([5, 4]);
  drawCurve(ctx, a, arithmetic, '#666', 2);
  ctx.setLineDash([]);
  drawCurve(ctx, a, geometric, '#1B7F3B', 3);
  drawAxis(ctx, a);
  const legend: [string, string][] = [
    [BLUE.color, '蓝颜料'],
    [YELLOW.color, '黄颜料'],
    ['#1B7F3B', '几何平均混合'],
    ['#666', '算术平均混合（虚线）']
  ];
  legend.forEach(([color, name], i) => {
    const x = a.x + i * 150;
    ctx.fillStyle = color;
    ctx.fillRect(x, 224, 14, 3);
    text(ctx, name, x + 20, 226, 'left', '#333', '12px sans-serif');
  });
  text(ctx, `蓝 ${Math.round(w * 100)}% + 黄 ${Math.round((1 - w) * 100)}%`, 8, MIX_H - 12, 'left', '#555', '12px sans-serif');
};

export {
  PIGMENTS,
  BLUE,
  YELLOW,
  BLUE_RGB,
  YELLOW_RGB,
  MIXERS,
  PIGMENT_W,
  PIGMENT_H,
  OVERPRINT_H,
  OVERPRINT_ITEMS,
  STRIP_W,
  STRIP_H,
  MIX_W,
  MIX_H,
  mixGeometric,
  mixArithmetic,
  render,
  drawPigments,
  drawOverprint,
  drawMixStrips,
  drawMixSpectra
};
