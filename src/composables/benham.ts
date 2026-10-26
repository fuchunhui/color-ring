import type {DrawFn} from '../utils/spectral';
import {text} from '../utils/spectral';

const DISC_SIZE = 420;

/** 白色半圆上的四条黑弧：内两条与外两条在角度上错开，宽度和半径均为示意值 */
const ARCS = [
  {r: 0.36, from: 0.12, to: 0.46},
  {r: 0.5, from: 0.12, to: 0.46},
  {r: 0.64, from: 0.54, to: 0.88},
  {r: 0.78, from: 0.54, to: 0.88}
];

const drawDisc = (ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, angle: number): void => {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = radius * 0.07;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#111111';
  ARCS.forEach(({r, from, to}) => {
    ctx.beginPath();
    ctx.arc(0, 0, radius * r, Math.PI * (1 + from), Math.PI * (1 + to), false);
    ctx.stroke();
  });
  ctx.restore();
  ctx.strokeStyle = '#999999';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
};

/** 旋转中的圆盘：angle 为当前转角（弧度），由页面每帧更新 */
const spinDrawer = (angle: () => number): DrawFn => ctx => {
  const c = DISC_SIZE / 2;
  drawDisc(ctx, c, c, c - 14, angle());
};

const DIAGRAM_W = 640;
const DIAGRAM_H = 300;

/** 制作示意图：左边是展开的图案，右边是装配步骤 */
const drawDiagram: DrawFn = ctx => {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, DIAGRAM_W, DIAGRAM_H);
  drawDisc(ctx, 150, 150, 120, 0);
  ctx.strokeStyle = '#E8590C';
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(30, 150);
  ctx.lineTo(270, 150);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, '黑半圆', 150, 210, 'center', '#EEEEEE', 'bold 14px sans-serif');
  text(ctx, '白半圆 + 四条黑弧', 150, 90, 'center', '#444', 'bold 13px sans-serif');
  const steps = [
    '1. 打印或手绘此图案，沿圆周剪下，贴在硬纸板上',
    '2. 圆心穿一根牙签或铅笔，做成陀螺（或固定在电机上）',
    '3. 在明亮、稳定的光照下（日光或白炽灯），',
    '    以每秒 5 到 10 转的速度旋转',
    '4. 盯着圆盘上白色部分的弧线，注意色彩',
    '5. 换一个方向旋转，颜色的顺序会反过来',
    '提示：荧光灯和显示器自身会闪烁，',
    '    效果可能与日光下不同。'
  ];
  steps.forEach((s, i) => text(ctx, s, 300, 70 + i * 24, 'left', i >= 6 ? '#777' : '#333', '13px sans-serif'));
};

export {
  DISC_SIZE,
  DIAGRAM_W,
  DIAGRAM_H,
  spinDrawer,
  drawDiagram
};
