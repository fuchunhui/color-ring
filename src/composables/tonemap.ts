import {linearToSrgb} from '../utils/space';
import {LinearImage, encodeCode} from '../utils/scene';

type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

type Operator = (x: number) => number;

interface OperatorInfo {
  key: string;
  label: string;
  color: string;
  fn: Operator;
}

const WHITE_POINT = 6;

const clip: Operator = x => Math.min(1, x);

const reinhard: Operator = x => x / (1 + x);

const reinhardExt: Operator = x => Math.min(1, x * (1 + x / (WHITE_POINT * WHITE_POINT)) / (1 + x));

const hableCurve = (x: number): number => {
  const a = 0.15;
  const b = 0.5;
  const c = 0.1;
  const d = 0.2;
  const e = 0.02;
  const f = 0.3;
  return ((x * (a * x + c * b) + d * e) / (x * (a * x + b) + d * f)) - e / f;
};

const hable: Operator = x => Math.min(1, hableCurve(2 * x) / hableCurve(11.2));

const aces: Operator = x => {
  const v = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
  return Math.min(1, Math.max(0, v));
};

const OPERATORS: OperatorInfo[] = [
  {key: 'clip', label: '直接截断', color: '#888888', fn: clip},
  {key: 'reinhard', label: 'Reinhard', color: '#1A73E8', fn: reinhard},
  {key: 'ext', label: `扩展 Reinhard（白点 ${WHITE_POINT}）`, color: '#0F9D58', fn: reinhardExt},
  {key: 'hable', label: 'Hable / Uncharted 2', color: '#E8710A', fn: hable},
  {key: 'aces', label: 'ACES（Narkowicz）', color: '#C92A2A', fn: aces}
];

const lum = (r: number, g: number, b: number): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** 曝光后做色调映射并画到画布左上角；byLuminance 为真时只映射亮度、按比例缩放 RGB */
const drawToneMapped = (
  ctx: CanvasRenderingContext2D,
  img: LinearImage,
  op: Operator,
  ev: number,
  byLuminance: boolean
): void => {
  const gain = 2 ** ev;
  const out = ctx.createImageData(img.width, img.height);
  const n = img.width * img.height;
  for (let i = 0; i < n; i++) {
    const r = img.data[i * 3] * gain;
    const g = img.data[i * 3 + 1] * gain;
    const b = img.data[i * 3 + 2] * gain;
    let mapped: number[];
    if (byLuminance) {
      const l = lum(r, g, b);
      const s = l > 1e-9 ? op(l) / l : 0;
      mapped = [r * s, g * s, b * s];
    } else {
      mapped = [op(r), op(g), op(b)];
    }
    out.data[i * 4] = encodeCode(mapped[0]);
    out.data[i * 4 + 1] = encodeCode(mapped[1]);
    out.data[i * 4 + 2] = encodeCode(mapped[2]);
    out.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
};

const drawCurves = (ev: number): DrawFn => (ctx, w, h) => {
  const left = 44;
  const top = 12;
  const pw = w - left - 210;
  const ph = h - top - 34;
  const xMax = 8;
  const px = (x: number) => left + x / xMax * pw;
  const py = (y: number) => top + (1 - y) * ph;
  const gain = 2 ** ev;

  ctx.font = '11px sans-serif';
  ctx.strokeStyle = '#E5E5E5';
  ctx.fillStyle = '#666';
  ctx.lineWidth = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    ctx.beginPath();
    ctx.moveTo(px(0), py(t));
    ctx.lineTo(px(xMax), py(t));
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText(String(t), px(0) - 6, py(t) + 4);
  });
  [0, 2, 4, 6, 8].forEach(t => {
    ctx.beginPath();
    ctx.moveTo(px(t), py(0));
    ctx.lineTo(px(t), py(1));
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillText(String(t), px(t), py(0) + 14);
  });
  ctx.fillText('场景线性光强度（曝光前，输出已含曝光）', px(xMax / 2), py(0) + 28);

  OPERATORS.forEach((op, k) => {
    ctx.strokeStyle = op.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = i / 200 * xMax;
      const y = op.fn(x * gain);
      if (i === 0) {
        ctx.moveTo(px(x), py(y));
      } else {
        ctx.lineTo(px(x), py(y));
      }
    }
    ctx.stroke();
    ctx.fillStyle = op.color;
    ctx.fillRect(px(xMax) + 14, top + 8 + k * 20, 16, 3);
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText(op.label, px(xMax) + 36, top + 12 + k * 20);
  });
};

const RAMP_ROW = 34;
const RAMP_LEFT = 150;

/** 从 2^-8 到 2^8 的亮度斜坡（横轴为曝光档数），每个算子一行 */
const drawRamps = (ev: number): DrawFn => (ctx, w) => {
  const pw = w - RAMP_LEFT - 34;
  const gain = 2 ** ev;
  ctx.font = '12px sans-serif';
  ctx.textBaseline = 'middle';
  OPERATORS.forEach((op, k) => {
    const y = k * (RAMP_ROW + 6);
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText(op.label, 4, y + RAMP_ROW / 2);
    for (let x = 0; x < pw; x++) {
      const stops = -8 + 16 * x / pw;
      const value = op.fn(2 ** stops * gain);
      const code = Math.round(linearToSrgb(Math.min(1, Math.max(0, value))) * 255);
      ctx.fillStyle = `rgb(${code},${code},${code})`;
      ctx.fillRect(RAMP_LEFT + x, y, 1, RAMP_ROW);
    }
  });
  const base = OPERATORS.length * (RAMP_ROW + 6) + 4;
  ctx.fillStyle = '#666';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  [-8, -4, 0, 4, 8].forEach(s => {
    ctx.fillText(`${s} EV`, RAMP_LEFT + (s + 8) / 16 * pw, base + 8);
  });
};

export {
  DrawFn,
  OPERATORS,
  drawToneMapped,
  drawCurves,
  drawRamps,
  RAMP_ROW
};
