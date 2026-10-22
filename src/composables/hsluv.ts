import {Vec3, rgbToLab} from '../utils/space';
import {hsluvToRgb, hpluvToRgb, lchToRgb, maxChromaForLH, maxSafeChromaForL} from '../utils/hsluv';

type PlaneKind = 'hsl' | 'hsluv' | 'hpluv';
type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

const PLANE_SIZE = 220;
const RING_W = 300;
const RING_H = 400;
const STRIP_W = 720;
const STRIP_H = 250;
const RAMP_W = 640;
const RAMP_H = 330;

const hslToRgb = (h: number, s: number, l: number): Vec3 => {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map(v => Math.round(v * 255)) as Vec3;
};

const toRgb = (kind: PlaneKind, h: number, s: number, l: number): Vec3 => {
  if (kind === 'hsl') {
    return hslToRgb(h, s, l);
  }
  return kind === 'hsluv' ? hsluvToRgb(h, s, l) : hpluvToRgb(h, s, l);
};

const css = (rgb: Vec3): string => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

const drawPlane = (kind: PlaneKind, hue: number): DrawFn => (ctx, w, h) => {
  const image = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const light = 100 - y / (h - 1) * 100;
    let max = 0;
    if (kind === 'hsluv') {
      max = light > 99.99 || light < 0.01 ? 0 : maxChromaForLH(light, hue);
    } else if (kind === 'hpluv') {
      max = light > 99.99 || light < 0.01 ? 0 : maxSafeChromaForL(light);
    }
    for (let x = 0; x < w; x++) {
      const s = x / (w - 1) * 100;
      const rgb = kind === 'hsl' ? hslToRgb(hue, s, light) : lchToRgb(light, max * s / 100, hue);
      const i = (y * w + x) * 4;
      image.data[i] = rgb[0];
      image.data[i + 1] = rgb[1];
      image.data[i + 2] = rgb[2];
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
};

const labelText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: CanvasTextAlign = 'center',
  color = '#333',
  font = '12px sans-serif'
) => {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
};

const drawRing = (kind: PlaneKind): DrawFn => ctx => {
  const cx = RING_W / 2;
  const cy = 128;
  const radius = 92;
  const hues = Array.from({length: 12}, (_, i) => i * 30);
  const colors = hues.map(h => toRgb(kind, h, 100, 50));

  ctx.lineWidth = 56;
  colors.forEach((rgb, i) => {
    const start = (i * 30 - 15 - 90) * Math.PI / 180;
    ctx.beginPath();
    ctx.strokeStyle = css(rgb);
    ctx.arc(cx, cy, radius, start, start + Math.PI / 6);
    ctx.stroke();
  });

  labelText(ctx, '各色相的 Lab L*（0~100）', 8, 262, 'left', '#666');
  const base = 372;
  const barW = 18;
  const gap = (RING_W - 12 * barW) / 13;
  colors.forEach((rgb, i) => {
    const lstar = rgbToLab(rgb)[0];
    const height = lstar / 100 * 90;
    const x = gap + i * (barW + gap);
    ctx.fillStyle = css(rgb);
    ctx.fillRect(x, base - height, barW, height);
    labelText(ctx, String(Math.round(lstar)), x + barW / 2, base - height - 8, 'center', '#333', '11px sans-serif');
    labelText(ctx, `${hues[i]}°`, x + barW / 2, base + 10, 'center', '#999', '10px sans-serif');
  });
};

const drawHueStrips: DrawFn = ctx => {
  const left = 60;
  const width = STRIP_W - left - 28;
  const rows: Array<{kind: PlaneKind; label: string; color: string}> = [
    {kind: 'hsl', label: 'HSL', color: '#E8710A'},
    {kind: 'hsluv', label: 'HSLuv', color: '#1A73E8'}
  ];
  rows.forEach(({kind, label}, row) => {
    const top = 8 + row * 48;
    for (let x = 0; x < width; x++) {
      ctx.fillStyle = css(toRgb(kind, x / width * 360, 100, 50));
      ctx.fillRect(left + x, top, 1, 40);
    }
    labelText(ctx, label, left - 8, top + 20, 'right', '#333', '13px sans-serif');
  });

  const plotTop = 122;
  const plotH = 100;
  ctx.strokeStyle = '#DDD';
  ctx.lineWidth = 1;
  [0, 50, 100].forEach(v => {
    const y = plotTop + plotH - v / 100 * plotH;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + width, y);
    ctx.stroke();
    labelText(ctx, String(v), left - 8, y, 'right', '#999', '11px sans-serif');
  });
  rows.forEach(({kind, color}) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let x = 0; x <= width; x += 2) {
      const lstar = rgbToLab(toRgb(kind, x / width * 360, 100, 50))[0];
      const y = plotTop + plotH - lstar / 100 * plotH;
      if (x === 0) {
        ctx.moveTo(left + x, y);
      } else {
        ctx.lineTo(left + x, y);
      }
    }
    ctx.stroke();
  });
  [0, 60, 120, 180, 240, 300, 360].forEach(h => {
    labelText(ctx, `${h}°`, left + h / 360 * width, plotTop + plotH + 14, 'center', '#999', '11px sans-serif');
  });
  labelText(ctx, 'HSL 的 L*', left + 6, plotTop - 10, 'left', '#E8710A', '12px sans-serif');
  labelText(ctx, 'HSLuv 的 L*', left + 80, plotTop - 10, 'left', '#1A73E8', '12px sans-serif');
};

const drawRamps: DrawFn = ctx => {
  const left = 90;
  const width = RAMP_W - left - 10;
  [0, 60, 120, 180, 240, 300].forEach((hue, i) => {
    const top = 6 + i * 54;
    (['hsl', 'hsluv'] as PlaneKind[]).forEach((kind, row) => {
      for (let x = 0; x < width; x++) {
        ctx.fillStyle = css(toRgb(kind, hue, 100, x / (width - 1) * 100));
        ctx.fillRect(left + x, top + row * 24, 1, 22);
      }
      labelText(ctx, kind === 'hsl' ? 'HSL' : 'HSLuv', left - 8, top + row * 24 + 11, 'right', '#666');
    });
    labelText(ctx, `${hue}°`, 8, top + 22, 'left', '#333', '13px sans-serif');
  });
};

export {
  PlaneKind,
  PLANE_SIZE,
  RING_W,
  RING_H,
  STRIP_W,
  STRIP_H,
  RAMP_W,
  RAMP_H,
  drawPlane,
  drawRing,
  drawHueStrips,
  drawRamps
};
