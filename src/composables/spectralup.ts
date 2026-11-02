import {Vec3} from '../utils/space';
import {
  DrawFn,
  Area,
  xyzToSrgb,
  rgbCss,
  rgbHex,
  text,
  drawSpectrumBand,
  drawAxis,
  drawCurve
} from '../utils/spectral';
import {fitRgb, xyzUnder, naiveXyz, deltaBetween} from '../utils/spectralup';
import type {Fit, Metamer} from '../utils/spectralup';
import {ILLUMINANTS} from './illuminant';

interface Preset {
  name: string;
  rgb: Vec3;
}

const PRESETS: Preset[] = [
  {name: '灰绿', rgb: [110, 140, 100]},
  {name: '红', rgb: [200, 60, 60]},
  {name: '橙', rgb: [240, 130, 30]},
  {name: '黄', rgb: [240, 210, 50]},
  {name: '草绿', rgb: [90, 150, 60]},
  {name: '天蓝', rgb: [110, 170, 230]},
  {name: '紫', rgb: [130, 70, 170]},
  {name: '肤色', rgb: [224, 172, 138]},
  {name: '中灰', rgb: [128, 128, 128]},
  {name: '纯红', rgb: [255, 0, 0]},
  {name: '纯绿', rgb: [0, 255, 0]},
  {name: '纯蓝', rgb: [0, 0, 255]}
];

const BLUE = '#2E4BD6';
const ORANGE = '#E8820C';

const clear = (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
};

const swatch = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rgb: Vec3): void => {
  ctx.fillStyle = rgbCss(rgb);
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#CCC';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
};

const drawGrid = (ctx: CanvasRenderingContext2D, area: Area): void => {
  ctx.save();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = '#BBB';
  ctx.lineWidth = 1;
  [0, 0.5, 1].forEach(t => {
    const y = Math.round(area.y + area.h * (1 - t)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(area.x, y);
    ctx.lineTo(area.x + area.w, y);
    ctx.stroke();
    text(ctx, `${t}`, area.x - 8, y, 'right', '#555', '11px sans-serif');
  });
  ctx.restore();
};

// ---------- 1. 还原出的反射率 ----------

const PLOT_W = 720;
const PLOT_H = 280;

const drawFitChart = (getFit: () => Fit): DrawFn => (ctx, w, h) => {
  const fit = getFit();
  clear(ctx, w, h);
  const area: Area = {x: 48, y: 32, w: 420, h: 190};
  drawSpectrumBand(ctx, area, 0.22);
  drawGrid(ctx, area);
  text(ctx, '还原出的反射率 R(λ)', area.x, 14, 'left', '#555', '12px sans-serif');
  drawCurve(ctx, area, fit.spectrum, BLUE, 2.6, 'rgba(46, 75, 214, 0.12)');
  drawAxis(ctx, area);

  const redone = xyzToSrgb(fit.xyz);
  const sx = 506;
  text(ctx, '目标', sx + 40, 20, 'center', '#555');
  text(ctx, '光谱重算', sx + 140, 20, 'center', '#555');
  swatch(ctx, sx, 32, 80, 64, fit.rgb);
  swatch(ctx, sx + 100, 32, 80, 64, redone);
  text(ctx, rgbHex(fit.rgb), sx + 40, 108, 'center', '#333', '11px monospace');
  text(ctx, rgbHex(redone), sx + 140, 108, 'center', '#333', '11px monospace');
  text(ctx, `ΔE2000 = ${fit.deltaE.toFixed(2)}`, sx, 134, 'left', '#333', '12px sans-serif');
  text(ctx, '系数（x 为 −1~1 的归一化波长）', sx, 164, 'left', '#555', '11px sans-serif');
  fit.coef.forEach((c, i) => {
    text(ctx, `c${i} = ${c.toFixed(2)}`, sx, 184 + i * 18, 'left', '#333', '12px monospace');
  });
};

// ---------- 2. 各种光源下：RGB 偷懒算法 vs 光谱重算 ----------

const COMPARE: Preset[] = [
  {name: '红', rgb: [220, 50, 50]},
  {name: '橙', rgb: [240, 130, 30]},
  {name: '黄', rgb: [240, 210, 50]},
  {name: '绿', rgb: [70, 160, 70]},
  {name: '青', rgb: [60, 170, 210]},
  {name: '蓝', rgb: [60, 80, 190]},
  {name: '肤色', rgb: [224, 172, 138]}
];

let compareFits: Fit[] | null = null;

const comparePatches = (): Fit[] => {
  if (!compareFits) {
    compareFits = COMPARE.map(item => fitRgb(item.rgb));
  }
  return compareFits;
};

const SHOWN = ILLUMINANTS;
const LABEL_W = 150;
const CELL_W = 64;
const CELL_GAP = 8;
const HALF = 26;
const ROW_PITCH = 78;
const ILLUM_W = LABEL_W + 8 * (CELL_W + CELL_GAP) + 12;
const ILLUM_H = 38 + SHOWN.length * ROW_PITCH + 22;

const drawIlluminants = (getFit: () => Fit, getAdapt: () => boolean): DrawFn => (ctx, w, h) => {
  const fit = getFit();
  const adapt = getAdapt();
  clear(ctx, w, h);
  const patches: {name: string; fit: Fit}[] = [
    {name: '所选', fit},
    ...comparePatches().map((f, i) => ({name: COMPARE[i].name, fit: f}))
  ];
  patches.forEach((p, i) => {
    text(ctx, p.name, LABEL_W + i * (CELL_W + CELL_GAP) + CELL_W / 2, 14, 'center', '#555', '12px sans-serif');
  });
  SHOWN.forEach((il, r) => {
    const y = 28 + r * ROW_PITCH;
    text(ctx, il.name, 8, y + HALF - 8, 'left', '#333', '13px sans-serif');
    text(ctx, il.note, 8, y + HALF + 10, 'left', '#888', '10px sans-serif');
    patches.forEach((p, i) => {
      const x = LABEL_W + i * (CELL_W + CELL_GAP);
      const naive = naiveXyz(p.fit.rgb, il.spd, adapt);
      const real = xyzUnder(p.fit.spectrum, il.spd, adapt);
      ctx.fillStyle = rgbCss(xyzToSrgb(naive));
      ctx.fillRect(x, y, CELL_W, HALF);
      ctx.fillStyle = rgbCss(xyzToSrgb(real));
      ctx.fillRect(x, y + HALF, CELL_W, HALF);
      ctx.strokeStyle = '#CCC';
      ctx.strokeRect(x + 0.5, y + 0.5, CELL_W - 1, HALF * 2 - 1);
      const d = deltaBetween(naive, real);
      text(ctx, `ΔE ${d.toFixed(1)}`, x + CELL_W / 2, y + HALF * 2 + 11, 'center', d >= 3 ? '#C4620A' : '#777', '11px sans-serif');
    });
  });
  text(ctx, '每格上半：RGB 逐通道乘光源颜色；下半：用还原出的光谱重算。ΔE 是两者的差（ΔE2000，≥ 3 标橙）。', 8, h - 10, 'left', '#555', '11px sans-serif');
};

// ---------- 3. 同色异谱 ----------

const META_W = 720;
const META_H = 290;

const drawMetamers = (getFit: () => Fit, getMeta: () => Metamer, getAdapt: () => boolean): DrawFn => (ctx, w, h) => {
  const fit = getFit();
  const meta = getMeta();
  const adapt = getAdapt();
  clear(ctx, w, h);
  const area: Area = {x: 48, y: 32, w: 360, h: 190};
  drawSpectrumBand(ctx, area, 0.22);
  drawGrid(ctx, area);
  text(ctx, '两条不同的反射率曲线', area.x, 14, 'left', '#555', '12px sans-serif');
  drawCurve(ctx, area, fit.spectrum, BLUE, 2.4);
  drawCurve(ctx, area, meta.spectrum, ORANGE, 2.4);
  drawAxis(ctx, area);
  ctx.fillStyle = BLUE;
  ctx.fillRect(area.x, h - 24, 14, 3);
  text(ctx, '最平滑的一条（上面还原出的）', area.x + 20, h - 22, 'left', '#333', '11px sans-serif');
  ctx.fillStyle = ORANGE;
  ctx.fillRect(area.x + 200, h - 24, 14, 3);
  text(ctx, '叠了起伏的另一条', area.x + 220, h - 22, 'left', '#333', '11px sans-serif');

  const x0 = 440;
  text(ctx, '光源', x0, 14, 'left', '#555');
  text(ctx, '平滑', x0 + 134, 14, 'center', '#555');
  text(ctx, '起伏', x0 + 196, 14, 'center', '#555');
  text(ctx, 'ΔE2000', x0 + 252, 14, 'center', '#555');
  SHOWN.forEach((il, i) => {
    const y = 28 + i * 56;
    const a = xyzUnder(fit.spectrum, il.spd, adapt);
    const b = xyzUnder(meta.spectrum, il.spd, adapt);
    text(ctx, il.name, x0, y + 20, 'left', '#333', '12px sans-serif');
    swatch(ctx, x0 + 106, y, 56, 40, xyzToSrgb(a));
    swatch(ctx, x0 + 168, y, 56, 40, xyzToSrgb(b));
    const d = deltaBetween(a, b);
    text(ctx, d.toFixed(2), x0 + 252, y + 20, 'center', d >= 1 ? '#C4620A' : '#777', '12px sans-serif');
  });
};

export {
  Preset,
  PRESETS,
  PLOT_W,
  PLOT_H,
  ILLUM_W,
  ILLUM_H,
  META_W,
  META_H,
  drawFitChart,
  drawIlluminants,
  drawMetamers
};
