import {Vec3, rgbToLab, rgbToOklab, rgbToOklch} from '../utils/space';
import {hsluvToRgb} from '../utils/hsluv';
import {okhslToRgb, okhsvToRgb} from '../utils/okhsl';

type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
type Kind = 'hsl' | 'hsluv' | 'okhsl';
type VKind = 'hsv' | 'okhsv';

interface Series {
  label: string;
  color: string;
  values: number[];
}

const PLANE = 200;
const RING_W = 300;
const RING_H = 430;
const STRIP_W = 640;
const STRIP_H = 150;
const PLOT_W = 410;
const PLOT_H = 240;

const METHODS: {kind: Kind; label: string; color: string}[] = [
  {kind: 'hsl', label: 'HSL', color: '#E8710A'},
  {kind: 'hsluv', label: 'HSLuv', color: '#1A73E8'},
  {kind: 'okhsl', label: 'Okhsl', color: '#188038'}
];

const hslToRgb = (h: number, s: number, l: number): Vec3 => {
  const a = s * Math.min(l, 1 - l);
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map(v => Math.round(v * 255)) as Vec3;
};

const hsvToRgb = (h: number, s: number, v: number): Vec3 => {
  const k = (n: number) => (n + h / 60) % 6;
  const f = (n: number) => v - v * s * Math.max(0, Math.min(k(n), 4 - k(n), 1));
  return [f(5), f(3), f(1)].map(x => Math.round(x * 255)) as Vec3;
};

const toRgb = (kind: Kind, h: number, s: number, l: number): Vec3 => {
  if (kind === 'hsl') {
    return hslToRgb(h, s, l);
  }
  return kind === 'hsluv' ? hsluvToRgb(h, s * 100, l * 100) : okhslToRgb([h, s, l]);
};

const css = (rgb: Vec3): string => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

const drawPlane = (kind: Kind | VKind, hue: number): DrawFn => (ctx, w, h) => {
  const image = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const v = 1 - y / (h - 1);
    for (let x = 0; x < w; x++) {
      const s = x / (w - 1);
      let rgb: Vec3;
      if (kind === 'hsv') {
        rgb = hsvToRgb(hue, s, v);
      } else if (kind === 'okhsv') {
        rgb = okhsvToRgb([hue, s, v]);
      } else {
        rgb = toRgb(kind, hue, s, v);
      }
      const i = (y * w + x) * 4;
      image.data[i] = rgb[0];
      image.data[i + 1] = rgb[1];
      image.data[i + 2] = rgb[2];
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
};

const ringColors = (kind: Kind, sat: number): Vec3[] => {
  return Array.from({length: 12}, (_, i) => toRgb(kind, i * 30, sat, 0.5));
};

const drawRing = (kind: Kind, sat: number): DrawFn => (ctx, w) => {
  const colors = ringColors(kind, sat);
  const cx = w / 2;
  const cy = 108;
  colors.forEach((rgb, i) => {
    const start = (i * 30 - 105) * Math.PI / 180;
    ctx.beginPath();
    ctx.arc(cx, cy, 92, start, start + Math.PI / 6);
    ctx.arc(cx, cy, 50, start + Math.PI / 6, start, true);
    ctx.closePath();
    ctx.fillStyle = css(rgb);
    ctx.fill();
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '12px sans-serif';
  const rows: [string, (rgb: Vec3) => number, number][] = [
    ['Lab L*（CIE 感知亮度）', rgb => rgbToLab(rgb)[0], 300],
    ['OKLab L × 100', rgb => rgbToOklab(rgb)[0] * 100, 395]
  ];
  rows.forEach(([title, fn, base]) => {
    ctx.fillStyle = '#555';
    ctx.fillText(title, 10, base - 68);
    colors.forEach((rgb, i) => {
      const value = fn(rgb);
      const x = 12 + i * 23;
      const bar = value / 100 * 44;
      ctx.fillStyle = css(rgb);
      ctx.fillRect(x, base - bar, 17, bar);
      ctx.fillStyle = '#333';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(Math.round(value)), x + 8.5, base - 52);
      ctx.fillStyle = '#888';
      ctx.fillText(`${i * 30}`, x + 8.5, base + 9);
      ctx.textAlign = 'left';
      ctx.font = '12px sans-serif';
    });
  });
};

const drawStrips = (sat: number): DrawFn => (ctx, w) => {
  ctx.textBaseline = 'middle';
  ctx.font = '12px sans-serif';
  METHODS.forEach(({kind, label}, row) => {
    const top = 10 + row * 46;
    for (let x = 0; x < w - 70; x++) {
      ctx.fillStyle = css(toRgb(kind, x / (w - 71) * 360, sat, 0.5));
      ctx.fillRect(60 + x, top, 1, 34);
    }
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText(label, 6, top + 17);
  });
};

const sweep = (sat: number, fn: (rgb: Vec3) => number): Series[] => {
  return METHODS.map(({kind, label, color}) => ({
    label,
    color,
    values: Array.from({length: 361}, (_, h) => fn(toRgb(kind, h, sat, 0.5)))
  }));
};

const drawPlot = (series: Series[], yMin: number, yMax: number, title: string, digits: number): DrawFn => (ctx, w, h) => {
  const left = 44;
  const top = 28;
  const pw = w - left - 12;
  const ph = h - top - 30;
  const px = (hue: number) => left + hue / 360 * pw;
  const py = (v: number) => top + (1 - (v - yMin) / (yMax - yMin)) * ph;

  ctx.fillStyle = '#333';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 6, 12);

  ctx.font = '11px sans-serif';
  ctx.strokeStyle = '#E4E5E7';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const v = yMin + (yMax - yMin) * i / 4;
    ctx.beginPath();
    ctx.moveTo(left, py(v));
    ctx.lineTo(left + pw, py(v));
    ctx.stroke();
    ctx.fillStyle = '#777';
    ctx.textAlign = 'right';
    ctx.fillText(v.toFixed(digits), left - 5, py(v));
  }
  ctx.textAlign = 'center';
  for (let hue = 0; hue <= 360; hue += 60) {
    ctx.fillText(`${hue}°`, px(hue), top + ph + 12);
  }

  series.forEach(({color, values}) => {
    ctx.beginPath();
    values.forEach((v, hue) => {
      if (hue === 0) {
        ctx.moveTo(px(hue), py(v));
      } else {
        ctx.lineTo(px(hue), py(v));
      }
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  ctx.textAlign = 'left';
  series.forEach(({label, color}, i) => {
    const x = left + 6 + i * 70;
    ctx.fillStyle = color;
    ctx.fillRect(x, top + ph + 22, 12, 3);
    ctx.fillStyle = '#333';
    ctx.fillText(label, x + 16, top + ph + 24);
  });
};

const labPlot = (sat: number): DrawFn => drawPlot(sweep(sat, rgb => rgbToLab(rgb)[0]), 20, 100, 'Lab L*（随色相）', 0);

const oklabPlot = (sat: number): DrawFn => drawPlot(sweep(sat, rgb => rgbToOklab(rgb)[0] * 100), 40, 100, 'OKLab L × 100（随色相）', 0);

const chromaPlot = (sat: number): DrawFn => {
  const series = sweep(sat, rgb => rgbToOklch(rgb)[1]).filter(item => item.label !== 'HSL');
  return drawPlot(series, 0, 0.35, 'OKLCH 色度 C（随色相）', 2);
};

export {
  PLANE,
  RING_W,
  RING_H,
  STRIP_W,
  STRIP_H,
  PLOT_W,
  PLOT_H,
  METHODS,
  DrawFn,
  Kind,
  VKind,
  drawPlane,
  drawRing,
  drawStrips,
  labPlot,
  oklabPlot,
  chromaPlot
};
