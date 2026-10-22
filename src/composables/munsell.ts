import {Vec3, rgbToLab} from '../utils/space';
import {rgbToHsl, hslToRgb} from '../utils/csscolor';
import {munsellToRgb, HUE_COUNT, HUE_NAMES} from '../utils/munsell';

type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

const CHIP_W = 58;
const CHIP_H = 40;
const LEFT = 52;
const TOP = 34;

const CHROMAS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
const VALUES = [9, 8, 7, 6, 5, 4, 3, 2, 1];
const HSL_S = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const HSL_L = [90, 80, 70, 60, 50, 40, 30, 20, 10];

const CHART_W = LEFT + CHROMAS.length * CHIP_W;
const CHART_H = TOP + VALUES.length * CHIP_H + 8;

const css = (rgb: Vec3): string => `rgb(${rgb.join(',')})`;
const textColor = ([r, g, b]: Vec3): string => (0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#222' : '#FFF');

const hatch = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void => {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = '#C8CBD2';
  ctx.lineWidth = 1;
  for (let i = -h; i < w; i += 7) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
    ctx.stroke();
  }
  ctx.restore();
};

const axisText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign): void => {
  ctx.fillStyle = '#555';
  ctx.font = '12px sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
};

const drawMunsellChart = (ctx: CanvasRenderingContext2D, hueIndex: number): void => {
  axisText(ctx, '明度＼彩度', 4, TOP - 12, 'left');
  CHROMAS.forEach((c, i) => axisText(ctx, String(c), LEFT + i * CHIP_W + CHIP_W / 2, TOP - 12, 'center'));
  VALUES.forEach((v, j) => axisText(ctx, String(v), LEFT - 10, TOP + j * CHIP_H + CHIP_H / 2, 'right'));

  VALUES.forEach((v, j) => {
    CHROMAS.forEach((c, i) => {
      const x = LEFT + i * CHIP_W + 1;
      const y = TOP + j * CHIP_H + 1;
      const {rgb, inGamut} = munsellToRgb(hueIndex, v, c);
      if (inGamut) {
        ctx.fillStyle = css(rgb);
        ctx.fillRect(x, y, CHIP_W - 2, CHIP_H - 2);
        ctx.fillStyle = textColor(rgb);
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${v}/${c}`, x + (CHIP_W - 2) / 2, y + (CHIP_H - 2) / 2);
      } else {
        hatch(ctx, x, y, CHIP_W - 2, CHIP_H - 2);
      }
    });
  });
};

/** 取该色相在明度 5 上 sRGB 能显示的最大彩度对应的 HSL 色相，用来和 HSL 色相页做同色相对比 */
const munsellHslHue = (hueIndex: number): number => {
  let hue = 0;
  CHROMAS.forEach(c => {
    const {rgb, inGamut} = munsellToRgb(hueIndex, 5, c);
    if (inGamut) {
      hue = Math.round(rgbToHsl(rgb)[0]);
    }
  });
  return hue;
};

const drawHslChart = (ctx: CanvasRenderingContext2D, hue: number): void => {
  axisText(ctx, 'L(%)＼S(%)', 4, TOP - 12, 'left');
  HSL_S.forEach((s, i) => axisText(ctx, String(s), LEFT + i * CHIP_W + CHIP_W / 2, TOP - 12, 'center'));
  HSL_L.forEach((l, j) => axisText(ctx, String(l), LEFT - 10, TOP + j * CHIP_H + CHIP_H / 2, 'right'));

  HSL_L.forEach((l, j) => {
    HSL_S.forEach((s, i) => {
      const x = LEFT + i * CHIP_W + 1;
      const y = TOP + j * CHIP_H + 1;
      const rgb = hslToRgb([hue, s, l]).map(Math.round) as Vec3;
      ctx.fillStyle = css(rgb);
      ctx.fillRect(x, y, CHIP_W - 2, CHIP_H - 2);
      ctx.fillStyle = textColor(rgb);
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`L*${Math.round(rgbToLab(rgb)[0])}`, x + (CHIP_W - 2) / 2, y + (CHIP_H - 2) / 2);
    });
  });
};

const locate = (x: number, y: number, cols: number, rows: number): [number, number] | null => {
  const col = Math.floor((x - LEFT) / CHIP_W);
  const row = Math.floor((y - TOP) / CHIP_H);
  return col >= 0 && col < cols && row >= 0 && row < rows ? [col, row] : null;
};

const locateMunsell = (x: number, y: number): {value: number; chroma: number} | null => {
  const hit = locate(x, y, CHROMAS.length, VALUES.length);
  return hit ? {value: VALUES[hit[1]], chroma: CHROMAS[hit[0]]} : null;
};

const locateHsl = (x: number, y: number): {s: number; l: number} | null => {
  const hit = locate(x, y, HSL_S.length, HSL_L.length);
  return hit ? {s: HSL_S[hit[0]], l: HSL_L[hit[1]]} : null;
};

const RING_OUTER = 96;
const RING_INNER = 54;

const drawHueRing = (ctx: CanvasRenderingContext2D, width: number, height: number, value: number, chroma: number): void => {
  const cx = width / 2;
  const cy = height / 2;
  const step = 2 * Math.PI / HUE_COUNT;
  for (let k = 0; k < HUE_COUNT; k++) {
    const start = -Math.PI / 2 + k * step - step / 2;
    const {rgb, inGamut} = munsellToRgb(k, value, chroma);
    ctx.beginPath();
    ctx.arc(cx, cy, RING_OUTER, start, start + step);
    ctx.arc(cx, cy, RING_INNER, start + step, start, true);
    ctx.closePath();
    ctx.fillStyle = inGamut ? css(rgb) : '#E9EBF0';
    ctx.fill();
    ctx.strokeStyle = inGamut ? css(rgb) : '#E9EBF0';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (k % 4 === 1) {
      const mid = start + step / 2;
      axisText(ctx, HUE_NAMES[Math.floor(k / 4)], cx + Math.cos(mid) * (RING_OUTER + 14), cy + Math.sin(mid) * (RING_OUTER + 14), 'center');
    }
  }
  axisText(ctx, `${value}/${chroma}`, cx, cy, 'center');
};

export {
  DrawFn,
  CHART_W,
  CHART_H,
  drawMunsellChart,
  drawHslChart,
  drawHueRing,
  munsellHslHue,
  locateMunsell,
  locateHsl
};
