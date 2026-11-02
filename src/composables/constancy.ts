import {Vec3} from '../utils/space';
import {LinearImage, drawLinearImage} from '../utils/scene';
import {DrawFn, text} from '../utils/spectral';
import {Analysis, MethodKey, angleBetween} from '../utils/constancy';

const PLOT_W = 400;
const PLOT_H = 310;

const AREA = {x: 52, y: 14, w: 330, h: 252};
const R_RANGE: [number, number] = [0.1, 0.7];
const G_RANGE: [number, number] = [0.15, 0.65];

const METHOD_COLORS: Record<MethodKey, string> = {
  gray: '#1F77B4',
  white: '#D62728',
  sog: '#2CA02C',
  edge: '#9467BD'
};

const toR = (e: Vec3): number => e[0] / (e[0] + e[1] + e[2]);
const toG = (e: Vec3): number => e[1] / (e[0] + e[1] + e[2]);

const px = (r: number): number => AREA.x + (r - R_RANGE[0]) / (R_RANGE[1] - R_RANGE[0]) * AREA.w;
const py = (g: number): number => AREA.y + (1 - (g - G_RANGE[0]) / (G_RANGE[1] - G_RANGE[0])) * AREA.h;

const clampTo = (v: number, [lo, hi]: [number, number]): number => Math.min(hi, Math.max(lo, v));

const fmtLight = (e: Vec3): string => `(${e.map(v => v.toFixed(2)).join(', ')})`;

const imageDrawer = (img: LinearImage): DrawFn => ctx => {
  drawLinearImage(ctx, img);
};

/** 真实光源与各方法估计在 rg 色度平面上的位置 */
const chromaDrawer = (analysis: Analysis): DrawFn => ctx => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, PLOT_W, PLOT_H);
  ctx.strokeStyle = '#E4E6EB';
  ctx.lineWidth = 1;
  for (let r = 0.1; r <= 0.7001; r += 0.1) {
    ctx.beginPath();
    ctx.moveTo(px(r) + 0.5, AREA.y);
    ctx.lineTo(px(r) + 0.5, AREA.y + AREA.h);
    ctx.stroke();
    text(ctx, r.toFixed(1), px(r), AREA.y + AREA.h + 12, 'center', '#666', '11px sans-serif');
  }
  for (let g = 0.2; g <= 0.6001; g += 0.1) {
    ctx.beginPath();
    ctx.moveTo(AREA.x, py(g) + 0.5);
    ctx.lineTo(AREA.x + AREA.w, py(g) + 0.5);
    ctx.stroke();
    text(ctx, g.toFixed(1), AREA.x - 8, py(g), 'right', '#666', '11px sans-serif');
  }
  ctx.strokeStyle = '#999';
  ctx.strokeRect(AREA.x + 0.5, AREA.y + 0.5, AREA.w, AREA.h);
  text(ctx, 'r = R / (R+G+B)', AREA.x + AREA.w / 2, PLOT_H - 14, 'center', '#333', '12px sans-serif');
  ctx.save();
  ctx.translate(12, AREA.y + AREA.h / 2);
  ctx.rotate(-Math.PI / 2);
  text(ctx, 'g = G / (R+G+B)', 0, 0, 'center', '#333', '12px sans-serif');
  ctx.restore();

  const neutral = 1 / 3;
  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.moveTo(px(neutral) - 6, py(neutral));
  ctx.lineTo(px(neutral) + 6, py(neutral));
  ctx.moveTo(px(neutral), py(neutral) - 6);
  ctx.lineTo(px(neutral), py(neutral) + 6);
  ctx.stroke();
  text(ctx, '白光', px(neutral) + 9, py(neutral) + 10, 'left', '#888', '11px sans-serif');

  const tx = px(clampTo(toR(analysis.light), R_RANGE));
  const ty = py(clampTo(toG(analysis.light), G_RANGE));
  analysis.estimates.forEach(item => {
    const ex = px(clampTo(toR(item.light), R_RANGE));
    const ey = py(clampTo(toG(item.light), G_RANGE));
    const color = METHOD_COLORS[item.key];
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(ex, ey, 5, 0, 2 * Math.PI);
    ctx.fill();
    const rightSide = ex < AREA.x + AREA.w - 90;
    text(ctx, item.name, ex + (rightSide ? 9 : -9), ey - 9, rightSide ? 'left' : 'right', color, '12px sans-serif');
  });
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(tx, ty, 9, 0, 2 * Math.PI);
  ctx.stroke();
  text(ctx, '真实光源', tx + 13, ty + 12, 'left', '#111', 'bold 12px sans-serif');
};

interface Tile {
  key: string;
  title: string;
  img: LinearImage;
  caption: string;
}

const tilesOf = (analysis: Analysis, sigma: number): Tile[] => {
  const tiles: Tile[] = [
    {key: 'truth', title: '白光下的样子', img: analysis.truthImage, caption: '参照'},
    {
      key: 'cast',
      title: '拍摄结果',
      img: analysis.cast,
      caption: `光源 ${fmtLight(analysis.light)}，偏色 ${angleBetween([1, 1, 1], analysis.light).toFixed(1)}°`
    }
  ];
  analysis.estimates.forEach(item => {
    tiles.push({
      key: item.key,
      title: item.name,
      img: analysis.corrected[item.key],
      caption: `估计 ${fmtLight(item.light)}，误差 ${item.error.toFixed(1)}°`
    });
  });
  tiles.push({
    key: 'retinex',
    title: `Retinex（σ = ${sigma}）`,
    img: analysis.retinex,
    caption: `没有光源估计，残余偏色 ${analysis.retinexResidual.toFixed(1)}°`
  });
  return tiles;
};

/** 误差越大颜色越红，用于表格底色 */
const errorShade = (deg: number): string => {
  const t = Math.min(1, Math.max(0, (deg - 3) / 25));
  const alpha = 0.08 + 0.5 * t;
  return deg < 3 ? 'rgba(46, 160, 90, 0.14)' : `rgba(214, 70, 50, ${alpha.toFixed(2)})`;
};

export {
  PLOT_W,
  PLOT_H,
  METHOD_COLORS,
  imageDrawer,
  chromaDrawer,
  tilesOf,
  errorShade
};
export type {Tile};
