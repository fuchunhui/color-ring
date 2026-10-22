import Color from '../base/color';
import {hsl} from '../utils/color';
import {
  Vec3,
  Converted,
  rgbToLab,
  rgbToOklab,
  rgbToOklch,
  labToRgb,
  oklabToRgb,
  oklchToRgb,
  lchToRgb
} from '../utils/space';
import {DrawFn, css} from './gamma';

const HUES = Array.from({length: 12}, (_, i) => i * 30);

const toVec = (c: Color): Vec3 => c.rgb().map(Math.round) as Vec3;

const hslRing = (): Converted[] => HUES.map(h => ({rgb: toVec(hsl(h, 1, 0.5)), inGamut: true}));

const lchRing = (l: number, c: number): Converted[] => HUES.map(h => lchToRgb([l, c, h]));

const oklchRing = (l: number, c: number): Converted[] => HUES.map(h => oklchToRgb([l, c, h]));

const hatch = (ctx: CanvasRenderingContext2D): void => {
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = -400; k < 650; k += 6) {
    ctx.moveTo(k, 0);
    ctx.lineTo(k + 400, 400);
  }
  ctx.stroke();
  ctx.restore();
};

const RING_W = 300;
const RING_H = 410;

/** 12 个色相的圆环，下方附各色相的 Lab L* 柱状图；超出 sRGB 色域的色相用斜线填充 */
const drawRingChart = (ctx: CanvasRenderingContext2D, swatches: Converted[]): void => {
  const cx = 150;
  const cy = 130;
  const outer = 120;
  const inner = 62;
  swatches.forEach(({rgb, inGamut}, i) => {
    const start = (i * 30 - 105) * Math.PI / 180;
    const end = start + Math.PI / 6;
    ctx.beginPath();
    ctx.arc(cx, cy, outer, start, end);
    ctx.arc(cx, cy, inner, end, start, true);
    ctx.closePath();
    ctx.fillStyle = inGamut ? css(rgb) : '#EEE';
    ctx.fill();
    if (!inGamut) {
      hatch(ctx);
    }
  });

  const base = 385;
  const barW = RING_W / 12;
  ctx.fillStyle = '#666';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('各色相的 Lab L*（0~100）', 8, 276);
  swatches.forEach(({rgb, inGamut}, i) => {
    const x = i * barW + 3;
    ctx.textAlign = 'center';
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#999';
    ctx.fillText(`${i * 30}°`, x + (barW - 6) / 2, base + 12);
    if (!inGamut) {
      ctx.fillText('超出', x + (barW - 6) / 2, base - 4);
      return;
    }
    const l = rgbToLab(rgb)[0];
    const h = l * 0.9;
    ctx.fillStyle = css(rgb);
    ctx.fillRect(x, base - h, barW - 6, h);
    ctx.fillStyle = '#333';
    ctx.fillText(String(Math.round(l)), x + (barW - 6) / 2, base - h - 3);
  });
  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.moveTo(0, base + 0.5);
  ctx.lineTo(RING_W, base + 0.5);
  ctx.stroke();
};

const GRADIENT_KINDS = ['sRGB', 'HSL', 'Lab', 'OKLab', 'OKLCH'] as const;

type GradientKind = typeof GRADIENT_KINDS[number];

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** 沿色相环的最短路径插值（正好相差180°时走逆时针方向） */
const lerpHue = (a: number, b: number, t: number): number => {
  const d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
};

const gradientAt = (kind: GradientKind, from: Vec3, to: Vec3, t: number): Vec3 => {
  switch (kind) {
    case 'sRGB':
      return lerp3(from, to, t).map(Math.round) as Vec3;
    case 'HSL': {
      const a = new Color(from).toHSL();
      const b = new Color(to).toHSL();
      return toVec(hsl(lerpHue(a.h, b.h, t), lerp(a.s, b.s, t), lerp(a.l, b.l, t)));
    }
    case 'Lab':
      return labToRgb(lerp3(rgbToLab(from), rgbToLab(to), t)).rgb;
    case 'OKLab':
      return oklabToRgb(lerp3(rgbToOklab(from), rgbToOklab(to), t)).rgb;
    default: {
      const a = rgbToOklch(from);
      const b = rgbToOklch(to);
      return oklchToRgb([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerpHue(a[2], b[2], t)]).rgb;
    }
  }
};

const drawGradients = (ctx: CanvasRenderingContext2D, w: number, h: number, from: Vec3, to: Vec3): void => {
  const labelW = 64;
  const barW = w - labelW;
  const rowH = Math.floor(h / GRADIENT_KINDS.length);
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  GRADIENT_KINDS.forEach((kind, row) => {
    const y = row * rowH;
    ctx.fillStyle = '#333';
    ctx.fillText(kind, 4, y + rowH / 2);
    for (let x = 0; x < barW; x++) {
      ctx.fillStyle = css(gradientAt(kind, from, to, x / (barW - 1)));
      ctx.fillRect(labelW + x, y + 3, 1, rowH - 6);
    }
  });
};

const blueToYellow: DrawFn = (ctx, w, h) => drawGradients(ctx, w, h, [0, 0, 255], [255, 255, 0]);

const redToCyan: DrawFn = (ctx, w, h) => drawGradients(ctx, w, h, [255, 0, 0], [0, 255, 255]);

const LIGHTNESS_W = 624;
const LIGHTNESS_H = 220;

/** 上排：HSL 恒定亮度；下排：Lab 恒定 L*；每个色块下方标出它的 Lab L* */
const drawLightnessRows: DrawFn = ctx => {
  const rows: [string, Converted[]][] = [
    ['恒定 HSL 亮度（L = 50%）', hslRing()],
    ['恒定 Lab L* = 70（C = 30）', lchRing(70, 30)]
  ];
  const sw = LIGHTNESS_W / 12;
  ctx.textBaseline = 'alphabetic';
  rows.forEach(([title, swatches], row) => {
    const y = row * 110;
    ctx.fillStyle = '#333';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, 2, y + 16);
    swatches.forEach(({rgb, inGamut}, i) => {
      ctx.beginPath();
      ctx.rect(i * sw + 2, y + 24, sw - 4, 56);
      ctx.fillStyle = inGamut ? css(rgb) : '#EEE';
      ctx.fill();
      if (!inGamut) {
        hatch(ctx);
      }
      ctx.fillStyle = '#333';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(inGamut ? `L*=${rgbToLab(rgb)[0].toFixed(0)}` : '超出', i * sw + sw / 2, y + 96);
    });
  });
};

export {
  RING_W,
  RING_H,
  LIGHTNESS_W,
  LIGHTNESS_H,
  hslRing,
  lchRing,
  oklchRing,
  drawRingChart,
  blueToYellow,
  redToCyan,
  drawLightnessRows
};
