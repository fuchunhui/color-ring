import {D65, xyToXyz, xyzToDisplayRgb, toHex} from '../utils/cie';
import type {Point} from '../utils/cie';
import {
  xyToUv,
  uvToXy,
  planckianUv,
  cctDuvToUv,
  xyToCctDuv
} from '../utils/colorimetry';

const U_MIN = 0.16;
const U_MAX = 0.34;
const V_MIN = 0.26;
const V_MAX = 0.38;
const SCALE = 3600;
const LEFT = 54;
const TOP = 12;
const BOTTOM = 36;
const RIGHT = 14;

const UV_W = Math.round(LEFT + (U_MAX - U_MIN) * SCALE + RIGHT);
const UV_H = Math.round(TOP + (V_MAX - V_MIN) * SCALE + BOTTOM);

interface DuvState {
  cct: number;
  duv: number;
}

interface Reference {
  key: string;
  label: string;
  note: string;
  xy: Point;
  cct: number;
  duv: number;
}

const toPx = ([u, v]: Point): Point => [LEFT + (u - U_MIN) * SCALE, TOP + (V_MAX - v) * SCALE];
const pxToUv = (px: number, py: number): Point => [U_MIN + (px - LEFT) / SCALE, V_MAX - (py - TOP) / SCALE];

const makeReference = (key: string, label: string, note: string, xy: Point): Reference => {
  const r = xyToCctDuv(xy);
  return {key, label, note, xy, cct: r.cct, duv: r.duv};
};

/** CIE F 系列荧光灯的色度坐标取自 CIE 标准光源表 */
const REFERENCES: Reference[] = [
  makeReference('d65', 'D65', '标准日光', D65),
  makeReference('a', 'A', '钨丝灯，在黑体轨迹上', uvToXy(planckianUv(2856))),
  makeReference('f1', 'F1', '荧光灯（日光型）', [0.3131, 0.3373]),
  makeReference('f2', 'F2', '荧光灯（冷白）', [0.3721, 0.3751]),
  makeReference('f11', 'F11', '三基色荧光灯（4000 K 型）', [0.3805, 0.3769])
];

let background: HTMLCanvasElement | null = null;

/** 背景：每个 (u, v) 点的近似颜色（按最大通道归一），再向白色淡化，方便叠加线条 */
const buildBackground = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = UV_W;
  canvas.height = UV_H;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const image = ctx.createImageData(UV_W, UV_H);
  const {data} = image;
  const x0 = Math.round(LEFT);
  const x1 = Math.round(LEFT + (U_MAX - U_MIN) * SCALE);
  const y0 = Math.round(TOP);
  const y1 = Math.round(TOP + (V_MAX - V_MIN) * SCALE);
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const [x, y] = uvToXy(pxToUv(px + 0.5, py + 0.5));
      const rgb = xyzToDisplayRgb(xyToXyz(x, y));
      const o = (py * UV_W + px) * 4;
      data[o] = Math.round(rgb[0] * 0.7 + 255 * 0.3);
      data[o + 1] = Math.round(rgb[1] * 0.7 + 255 * 0.3);
      data[o + 2] = Math.round(rgb[2] * 0.7 + 255 * 0.3);
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
};

const label = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: CanvasTextAlign = 'left',
  baseline: CanvasTextBaseline = 'middle',
  color = '#222'
) => {
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
};

const dot = (ctx: CanvasRenderingContext2D, uv: Point, r: number, fill: string, stroke = '#222') => {
  const [x, y] = toPx(uv);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = stroke;
  ctx.stroke();
};

const curve = (ctx: CanvasRenderingContext2D, duv: number, color: string, dash: number[], width: number) => {
  ctx.beginPath();
  const n = 160;
  const lo = Math.log(1300);
  const hi = Math.log(30000);
  for (let i = 0; i <= n; i++) {
    const t = Math.exp(lo + (hi - lo) * i / n);
    const [x, y] = toPx(cctDuvToUv(t, duv));
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.setLineDash(dash);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.setLineDash([]);
};

const ISOTHERMS = [2000, 2700, 3000, 4000, 5000, 6500, 10000];
const LED_BAND = 0.006;

const drawDuv = (ctx: CanvasRenderingContext2D, state: DuvState): void => {
  if (!background) {
    background = buildBackground();
  }
  ctx.drawImage(background, 0, 0);

  const plotW = (U_MAX - U_MIN) * SCALE;
  const plotH = (V_MAX - V_MIN) * SCALE;
  ctx.font = '12px sans-serif';
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
  for (let u = 0.16; u <= 0.3401; u += 0.02) {
    const [px] = toPx([u, V_MIN]);
    ctx.beginPath();
    ctx.moveTo(Math.round(px) + 0.5, TOP);
    ctx.lineTo(Math.round(px) + 0.5, TOP + plotH);
    ctx.stroke();
    label(ctx, u.toFixed(2), px, TOP + plotH + 13, 'center');
  }
  for (let v = 0.26; v <= 0.3801; v += 0.02) {
    const [, py] = toPx([U_MIN, v]);
    ctx.beginPath();
    ctx.moveTo(LEFT, Math.round(py) + 0.5);
    ctx.lineTo(LEFT + plotW, Math.round(py) + 0.5);
    ctx.stroke();
    label(ctx, v.toFixed(2), LEFT - 6, py, 'right');
  }
  label(ctx, 'u（CIE 1960 UCS）', LEFT + plotW / 2, UV_H - 8, 'center');
  label(ctx, 'v', 12, TOP + 8, 'center');

  ctx.save();
  ctx.beginPath();
  ctx.rect(LEFT, TOP, plotW, plotH);
  ctx.clip();

  curve(ctx, LED_BAND, 'rgba(0, 0, 0, 0.65)', [5, 4], 1);
  curve(ctx, -LED_BAND, 'rgba(0, 0, 0, 0.65)', [5, 4], 1);
  curve(ctx, 0, '#222', [], 2);

  ISOTHERMS.forEach(t => {
    const a = toPx(cctDuvToUv(t, -0.02));
    const b = toPx(cctDuvToUv(t, 0.02));
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.stroke();
    dot(ctx, cctDuvToUv(t, 0), 2.5, '#222');
    label(ctx, `${t} K`, b[0], b[1] - 8, 'center', 'middle', '#222');
  });

  REFERENCES.forEach((ref, i) => {
    const uv = xyToUv(ref.xy);
    dot(ctx, uv, 5, '#fff', '#c2255c');
    const [px, py] = toPx(uv);
    const above = i % 2 === 0;
    label(ctx, ref.label, px + 8, py + (above ? -10 : 12), 'left', 'middle', '#c2255c');
  });

  const uv = cctDuvToUv(state.cct, state.duv);
  const [cx, cy] = toPx(uv);
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#000';
  ctx.stroke();
  ctx.restore();

  label(ctx, '± 0.006（常见的 LED 规格容差）', LEFT + 8, TOP + plotH - 12, 'left', 'middle', '#222');
  label(ctx, '上方：偏绿；下方：偏品红', LEFT + 8, TOP + 12, 'left', 'middle', '#222');
};

const swatchHex = (xy: Point): string => {
  const v = xyToXyz(xy[0], xy[1]);
  return toHex(xyzToDisplayRgb(v));
};

export {
  UV_W,
  UV_H,
  DuvState,
  Reference,
  REFERENCES,
  drawDuv,
  swatchHex
};
