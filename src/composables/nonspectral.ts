import {D65, locusXy} from '../utils/cie';
import type {Point} from '../utils/cie';
import {centroid, dominantWavelength} from '../utils/colorimetry';
import type {Dominant} from '../utils/colorimetry';
import {oklchToRgb} from '../utils/space';
import type {Vec3} from '../utils/space';
import {CHART_W, CHART_H, drawBase, toPx, dot, label, line, hexOfXyY} from './grassmann';

interface PurpleState {
  lambdaRed: number;
  lambdaBlue: number;
  redShare: number;
}

interface PurpleInfo {
  mixed: Point;
  hex: string;
  dominant: Dominant;
  inPurple: boolean;
}

const A_END = locusXy(700);
const B_END = locusXy(380);

const mixOf = (s: PurpleState): Point => {
  const red = locusXy(s.lambdaRed);
  const blue = locusXy(s.lambdaBlue);
  return centroid([
    {xy: red, Y: Math.max(s.redShare, 0.001)},
    {xy: blue, Y: Math.max(1 - s.redShare, 0.001)}
  ]);
};

const describePurple = (s: PurpleState): PurpleInfo => {
  const mixed = mixOf(s);
  const dominant = dominantWavelength(mixed, D65);
  return {mixed, hex: hexOfXyY(mixed), dominant, inPurple: dominant.complementary};
};

const drawPurple = (ctx: CanvasRenderingContext2D, s: PurpleState): void => {
  drawBase(ctx, D65, 'D65');
  const [w0, w1] = toPx(D65);
  const [a0, a1] = toPx(A_END);
  const [b0, b1] = toPx(B_END);
  ctx.beginPath();
  ctx.moveTo(w0, w1);
  ctx.lineTo(a0, a1);
  ctx.lineTo(b0, b1);
  ctx.closePath();
  ctx.fillStyle = 'rgba(190, 40, 120, 0.28)';
  ctx.fill();
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(120, 0, 70, 0.8)';
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(a0, a1);
  ctx.lineTo(b0, b1);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#8a1c5c';
  ctx.stroke();

  ctx.font = '12px sans-serif';
  const mid: Point = [(A_END[0] + B_END[0]) / 2, (A_END[1] + B_END[1]) / 2];
  label(ctx, '紫线：没有单色光能到达', toPx(mid)[0] + 6, toPx(mid)[1] + 20, 'left', 'middle', '#8a1c5c');
  label(ctx, '没有主波长的颜色', toPx(mid)[0] - 40, toPx(mid)[1] - 22, 'center', 'middle', '#8a1c5c');

  const red = locusXy(s.lambdaRed);
  const blue = locusXy(s.lambdaBlue);
  const mixed = mixOf(s);
  line(ctx, red, blue, '#000', 1.5, [5, 3]);
  dot(ctx, red, 6, hexOfXyY(red), '#000');
  dot(ctx, blue, 6, hexOfXyY(blue), '#000');
  dot(ctx, mixed, 7, hexOfXyY(mixed), '#d6336c');
  label(ctx, `${Math.round(s.lambdaRed)} nm`, toPx(red)[0] + 9, toPx(red)[1] - 8, 'left');
  label(ctx, `${Math.round(s.lambdaBlue)} nm`, toPx(blue)[0] + 9, toPx(blue)[1] + 12, 'left');
  label(ctx, '混合', toPx(mixed)[0] + 10, toPx(mixed)[1] + 8, 'left', 'middle', '#d6336c');
};

// ---------- 棕色 ----------

const ORANGE: Vec3 = [214, 108, 14];
const BROWN_W = 560;
const BROWN_H = 190;

interface BrownState {
  surround: number;
}

const gray = (v: number): string => {
  const c = Math.round(Math.min(1, Math.max(0, v)) * 255);
  return `rgb(${c}, ${c}, ${c})`;
};

const drawBrown = (ctx: CanvasRenderingContext2D, s: BrownState): void => {
  const cell = 160;
  const items: {bg: number; text: string}[] = [
    {bg: 1, text: '白色背景'},
    {bg: s.surround, text: '滑块控制的背景'},
    {bg: 0.04, text: '近黑背景'}
  ];
  const [r, g, b] = ORANGE;
  items.forEach((item, i) => {
    const x = 10 + i * (cell + 30);
    ctx.fillStyle = gray(item.bg);
    ctx.fillRect(x, 10, cell, 140);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x + cell / 2 - 30, 10 + 35, 60, 70);
    ctx.fillStyle = '#333';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.text, x + cell / 2, 168);
  });
};

// ---------- 色相切片 L × C ----------

const GRID_COLS = 22;
const GRID_ROWS = 16;
const CELL_W = 24;
const CELL_H = 22;
const GRID_LEFT = 44;
const GRID_TOP = 12;
const C_MAX = 0.22;
const L_MAX = 0.97;
const L_MIN = 0.2;
const GRID_W = GRID_LEFT + GRID_COLS * CELL_W + 150;
const GRID_H = GRID_TOP + GRID_ROWS * CELL_H + 36;

const cellL = (row: number): number => L_MAX - (L_MAX - L_MIN) * row / (GRID_ROWS - 1);
const cellC = (col: number): number => C_MAX * col / (GRID_COLS - 1);

/** 近似命名：只对 40°–80° 的橙色一带有效，边界因人而异，仅作示意 */
const perceivedName = (L: number, C: number): string => {
  if (C < 0.02) {
    if (L > 0.88) {
      return '白';
    }
    return L < 0.35 ? '黑' : '灰';
  }
  if (L < 0.62) {
    return C < 0.05 ? '深褐' : '棕';
  }
  if (C >= 0.1) {
    return '橙';
  }
  return L > 0.85 ? '米白 / 奶油' : '肉色 / 浅棕';
};

const drawLcGrid = (ctx: CanvasRenderingContext2D, hue: number): void => {
  ctx.font = '11px sans-serif';
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const L = cellL(row);
      const C = cellC(col);
      const x = GRID_LEFT + col * CELL_W;
      const y = GRID_TOP + row * CELL_H;
      const result = oklchToRgb([L, C, hue]);
      if (result.inGamut) {
        ctx.fillStyle = `rgb(${result.rgb[0]}, ${result.rgb[1]}, ${result.rgb[2]})`;
        ctx.fillRect(x, y, CELL_W, CELL_H);
      } else {
        ctx.fillStyle = '#F1F3F5';
        ctx.fillRect(x, y, CELL_W, CELL_H);
        ctx.strokeStyle = '#CED4DA';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + CELL_H);
        ctx.lineTo(x + CELL_W, y);
        ctx.stroke();
      }
    }
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#333';
  [0.2, 0.4, 0.6, 0.8].forEach(L => {
    const row = (L_MAX - L) / (L_MAX - L_MIN) * (GRID_ROWS - 1);
    ctx.fillText(`L ${L.toFixed(1)}`, GRID_LEFT - 6, GRID_TOP + (row + 0.5) * CELL_H);
  });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  [0, 0.05, 0.1, 0.15, 0.2].forEach(C => {
    const col = C / C_MAX * (GRID_COLS - 1);
    ctx.fillText(`C ${C.toFixed(2)}`, GRID_LEFT + (col + 0.5) * CELL_W, GRID_TOP + GRID_ROWS * CELL_H + 6);
  });

  const boundaryRow = (L_MAX - 0.62) / (L_MAX - L_MIN) * (GRID_ROWS - 1) + 0.5;
  const by = GRID_TOP + boundaryRow * CELL_H;
  ctx.setLineDash([5, 3]);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(GRID_LEFT, by);
  ctx.lineTo(GRID_LEFT + GRID_COLS * CELL_W, by);
  ctx.stroke();
  ctx.setLineDash([]);

  const tx = GRID_LEFT + GRID_COLS * CELL_W + 12;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#333';
  ctx.font = '12px sans-serif';
  ctx.fillText('橙 / 米色（较亮）', tx, by - 40);
  ctx.fillText('棕（较暗）', tx, by + 40);
  ctx.fillText('虚线 L ≈ 0.62 仅为示意', tx, by);
  ctx.fillText('斜线格：超出 sRGB', tx, GRID_TOP + GRID_ROWS * CELL_H - 8);
};

const cellAt = (x: number, y: number): {row: number; col: number} | null => {
  const col = Math.floor((x - GRID_LEFT) / CELL_W);
  const row = Math.floor((y - GRID_TOP) / CELL_H);
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
    return null;
  }
  return {row, col};
};

export {
  CHART_W,
  CHART_H,
  BROWN_W,
  BROWN_H,
  GRID_W,
  GRID_H,
  ORANGE,
  PurpleState,
  PurpleInfo,
  BrownState,
  describePurple,
  drawPurple,
  drawBrown,
  drawLcGrid,
  cellAt,
  cellL,
  cellC,
  perceivedName
};
