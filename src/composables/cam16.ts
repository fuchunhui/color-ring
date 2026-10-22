import {Vec3, Converted, rgbToLab, xyzToRgb, oklchToRgb, linearToSrgb} from '../utils/space';
import {Surround, Viewing, makeViewing, ucsToXyz} from '../utils/cam16';
import {pqEncode, hlgOetf} from '../utils/cam16hdr';

type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

const D65_WHITE: Vec3 = [95.047, 100, 108.883];
const BACKGROUNDS: Record<string, number> = {white: 100, gray: 20, black: 2};

const RING_W = 330;
const RING_H = 330;
const PLOT_W = 640;
const PLOT_H = 360;

const viewingFor = (la: number, background: string, surround: Surround): Viewing => {
  return makeViewing(D65_WHITE, la, BACKGROUNDS[background], surround);
};

const css = (rgb: Vec3): string => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

const hatch = (ctx: CanvasRenderingContext2D, cx: number, cy: number, inner: number, outer: number, a0: number, a1: number) => {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, outer, a0, a1);
  ctx.arc(cx, cy, inner, a1, a0, true);
  ctx.closePath();
  ctx.fillStyle = '#F1F1F1';
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = '#BBB';
  ctx.lineWidth = 1;
  for (let k = -outer * 2; k < outer * 2; k += 6) {
    ctx.beginPath();
    ctx.moveTo(cx + k - outer, cy + outer);
    ctx.lineTo(cx + k + outer, cy - outer);
    ctx.stroke();
  }
  ctx.restore();
};

const ringColors = (kind: 'cam16' | 'oklch', a: number, b: number): Converted[] => {
  const v = viewingFor(64, 'gray', 'average');
  return Array.from({length: 12}, (_, i) => {
    const hue = i * 30;
    if (kind === 'oklch') {
      return oklchToRgb([a, b, hue]);
    }
    const xyz = ucsToXyz(a, b, hue, v).map(x => x / 100) as Vec3;
    return xyzToRgb(xyz);
  });
};

const drawRing = (colors: Converted[]): DrawFn => ctx => {
  const cx = RING_W / 2;
  const cy = 130;
  const radius = 92;
  const half = 28;
  colors.forEach(({rgb, inGamut}, i) => {
    const a0 = (i * 30 - 15 - 90) * Math.PI / 180;
    const a1 = a0 + Math.PI / 6;
    if (inGamut) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, a0, a1);
      ctx.lineWidth = half * 2;
      ctx.strokeStyle = css(rgb);
      ctx.stroke();
    } else {
      hatch(ctx, cx, cy, radius - half, radius + half, a0, a1);
    }
  });
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#666';
  ctx.fillText('各色相的 Lab L*', cx, 262);
  colors.forEach(({rgb, inGamut}, i) => {
    const x = 18 + i * 25.5;
    ctx.fillStyle = inGamut ? css(rgb) : '#E4E4E4';
    ctx.fillRect(x - 10, 276, 20, 14);
    ctx.fillStyle = '#333';
    ctx.fillText(inGamut ? String(Math.round(rgbToLab(rgb)[0])) : '超出', x, 303);
    ctx.fillStyle = '#999';
    ctx.fillText(`${i * 30}°`, x, 318);
  });
};

interface TransferOptions {
  sdrWhite: number;
  hlgPeak: number;
}

const X_MIN = -3;
const X_MAX = 4;

const drawTransfer = (options: TransferOptions): DrawFn => ctx => {
  const left = 56;
  const right = PLOT_W - 18;
  const top = 16;
  const bottom = PLOT_H - 48;
  const px = (nits: number) => left + (Math.log10(nits) - X_MIN) / (X_MAX - X_MIN) * (right - left);
  const py = (e: number) => bottom - e * (bottom - top);

  ctx.font = '11px sans-serif';
  ctx.strokeStyle = '#E4E4E4';
  ctx.fillStyle = '#888';
  ctx.lineWidth = 1;
  for (let d = X_MIN; d <= X_MAX; d++) {
    const x = px(10 ** d);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(String(10 ** d), x, bottom + 6);
  }
  for (let e = 0; e <= 1.001; e += 0.25) {
    ctx.beginPath();
    ctx.moveTo(left, py(e));
    ctx.lineTo(right, py(e));
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.toFixed(2), left - 6, py(e));
  }
  ctx.fillStyle = '#333';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('显示亮度（cd/m²，对数坐标）', (left + right) / 2, bottom + 26);
  ctx.save();
  ctx.translate(12, (top + bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('编码值', 0, 0);
  ctx.restore();

  const curves: Array<{label: string; color: string; fn: (nits: number) => number}> = [
    {label: 'PQ（绝对亮度 0~10000）', color: '#1A73E8', fn: nits => pqEncode(nits)},
    {
      label: `sRGB（白 = ${options.sdrWhite} cd/m²，超出则截断）`,
      color: '#E8710A',
      fn: nits => linearToSrgb(Math.min(1, nits / options.sdrWhite))
    },
    {
      label: `HLG（峰值 ${options.hlgPeak} cd/m²，系统 gamma 1.2）`,
      color: '#188038',
      fn: nits => (nits >= options.hlgPeak ? 1 : hlgOetf((nits / options.hlgPeak) ** (1 / 1.2)))
    }
  ];
  curves.forEach(({color, fn}) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i <= 300; i++) {
      const nits = 10 ** (X_MIN + (X_MAX - X_MIN) * i / 300);
      const x = px(nits);
      const y = py(Math.min(1, Math.max(0, fn(nits))));
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  });

  [100, 1000].forEach(nits => {
    const e = pqEncode(nits);
    ctx.beginPath();
    ctx.arc(px(nits), py(e), 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#1A73E8';
    ctx.fill();
    ctx.fillStyle = '#1A73E8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`PQ(${nits}) = ${e.toFixed(3)}`, px(nits) + 8, py(e) + 4);
  });

  curves.forEach(({label, color}, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(left + 12, top + 12 + i * 18, 16, 3);
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, left + 36, top + 13 + i * 18);
  });
};

export {
  RING_W,
  RING_H,
  PLOT_W,
  PLOT_H,
  D65_WHITE,
  viewingFor,
  ringColors,
  drawRing,
  drawTransfer
};
