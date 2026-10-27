import {
  GEMS,
  ILLUMINANTS,
  transmittedColor,
  lycurgusTransmit,
  lycurgusScatter,
  dichroicReflect,
  dichroicTransmit
} from '../utils/gems';
import type {Gem, Illuminant} from '../utils/gems';
import {
  D65,
  spectrumXyz,
  xyzToSrgb,
  rgbCss,
  drawSpectrumBand,
  drawAxis,
  drawCurve,
  normalize,
  text
} from '../utils/spectral';
import type {Area, DrawFn, Spectrum} from '../utils/spectral';
import type {Vec3} from '../utils/space';

const PLOT_W = 640;
const PLOT_H = 240;
const CUP_W = 300;
const CUP_H = 260;

const area: Area = {x: 40, y: 34, w: PLOT_W - 70, h: PLOT_H - 74};

const legend = (ctx: CanvasRenderingContext2D, items: [string, string][]) => {
  items.forEach(([color, label], i) => {
    ctx.fillStyle = color;
    ctx.fillRect(area.x + 8 + i * 150, area.y - 16, 14, 3);
    text(ctx, label, area.x + 28 + i * 150, area.y - 15, 'left', '#333', '11px sans-serif');
  });
};

/** 宝石透射谱、所选光源的光谱、以及二者相乘后真正进入眼睛的光谱 */
const drawGemSpectrum = (gem: () => Gem, light: () => Illuminant): DrawFn => ctx => {
  drawSpectrumBand(ctx, area, 0.28);
  const spd = normalize(light().spd);
  const product = normalize(spd.map((v, i) => v * gem().transmittance[i]));
  drawCurve(ctx, area, spd, '#E8820C', 1.5);
  drawCurve(ctx, area, gem().transmittance, '#2A5BD6', 2.5);
  drawCurve(ctx, area, product, '#222', 2, 'rgba(0,0,0,0.12)');
  drawAxis(ctx, area);
  legend(ctx, [['#2A5BD6', '宝石透射率'], ['#E8820C', '光源（已归一化）'], ['#222', '进入眼睛的光']]);
};

const swatchColor = (gem: Gem, ill: Illuminant, degree: number): string => {
  return rgbCss(transmittedColor(gem.transmittance, ill.spd, degree));
};

// ---------- Lycurgus 杯 ----------

const cupPath = (ctx: CanvasRenderingContext2D, cx: number, top: number) => {
  ctx.beginPath();
  ctx.moveTo(cx - 80, top);
  ctx.bezierCurveTo(cx - 84, top + 70, cx - 52, top + 118, cx - 12, top + 130);
  ctx.lineTo(cx - 8, top + 175);
  ctx.bezierCurveTo(cx - 8, top + 185, cx - 50, top + 188, cx - 52, top + 200);
  ctx.lineTo(cx + 52, top + 200);
  ctx.bezierCurveTo(cx + 50, top + 188, cx + 8, top + 185, cx + 8, top + 175);
  ctx.lineTo(cx + 12, top + 130);
  ctx.bezierCurveTo(cx + 52, top + 118, cx + 84, top + 70, cx + 80, top);
  ctx.closePath();
};

const lycurgusColors = (thickness: number): {transmit: Vec3; scatter: Vec3} => ({
  transmit: xyzToSrgb(spectrumXyz(D65, lycurgusTransmit(thickness))),
  scatter: xyzToSrgb(spectrumXyz(D65, lycurgusScatter()))
});

const drawCup = (backLit: () => boolean, thickness: () => number): DrawFn => (ctx, w, h) => {
  const {transmit, scatter} = lycurgusColors(thickness());
  const back = backLit();
  ctx.fillStyle = '#12141A';
  ctx.fillRect(0, 0, w, h);
  // 灯：正面打光时在观察者一侧（画面前方，用左下的光晕表示），背面打光时在杯子后面
  const lamp = back ? {x: w / 2, y: 120} : {x: 36, y: h - 36};
  const glow = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, back ? 150 : 80);
  glow.addColorStop(0, 'rgba(255,250,230,0.95)');
  glow.addColorStop(1, 'rgba(255,250,230,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const top = 28;
  cupPath(ctx, cx, top);
  const color = back ? transmit : scatter;
  const grad = ctx.createLinearGradient(cx - 80, top, cx + 80, top);
  grad.addColorStop(0, rgbCss(color.map(v => Math.round(v * 0.72)) as typeof color));
  grad.addColorStop(0.35, rgbCss(color));
  grad.addColorStop(1, rgbCss(color.map(v => Math.round(v * 0.8)) as typeof color));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, back ? '背面打光：看到的是透射光（红）' : '正面打光：看到的是散射光（绿）', w / 2, h - 12, 'center', '#DDD', '12px sans-serif');
};

const drawLycurgusSpectra = (thickness: () => number): DrawFn => ctx => {
  drawSpectrumBand(ctx, area, 0.28);
  drawCurve(ctx, area, lycurgusTransmit(thickness()), '#C0392B', 2.5);
  drawCurve(ctx, area, normalize(lycurgusScatter()), '#2E9E44', 2.5);
  drawAxis(ctx, area);
  legend(ctx, [['#C0392B', '透射率'], ['#2E9E44', '散射光谱（归一化）']]);
};

// ---------- 二向色玻璃 ----------

const dichroicColors = (center: number, width: number): {reflect: Vec3; transmit: Vec3} => ({
  reflect: xyzToSrgb(spectrumXyz(D65, dichroicReflect(center, width))),
  transmit: xyzToSrgb(spectrumXyz(D65, dichroicTransmit(center, width)))
});

const drawDichroicSpectra = (center: () => number, width: () => number): DrawFn => ctx => {
  drawSpectrumBand(ctx, area, 0.28);
  drawCurve(ctx, area, dichroicReflect(center(), width()) as Spectrum, '#8E44AD', 2.5);
  drawCurve(ctx, area, dichroicTransmit(center(), width()) as Spectrum, '#16A085', 2.5);
  drawAxis(ctx, area);
  legend(ctx, [['#8E44AD', '反射率'], ['#16A085', '透射率']]);
};

export {
  GEMS,
  ILLUMINANTS,
  PLOT_W,
  PLOT_H,
  CUP_W,
  CUP_H,
  drawGemSpectrum,
  swatchColor,
  lycurgusColors,
  drawCup,
  drawLycurgusSpectra,
  dichroicColors,
  drawDichroicSpectra
};
