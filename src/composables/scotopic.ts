import {Vec3, linearToXyz} from '../utils/space';
import {makePhotoScene, encodeCode} from '../utils/scene';
import {Area, DrawFn, sample, drawSpectrumBand, drawAxis, drawCurve, text, wlX, rgbCss} from '../utils/spectral';
import {photopicV, scotopicV, scotopicRel, nightLinear, nightGain, photopicShare} from '../utils/vision';

// ---------- V(λ) 与 V'(λ) ----------

const LUM_W = 720;
const LUM_H = 300;
const LUM_AREA: Area = {x: 48, y: 36, w: 620, h: 210};

const PHOTOPIC = sample(photopicV);
const SCOTOPIC = sample(scotopicV);

const drawLuminosity: DrawFn = ctx => {
  const a = LUM_AREA;
  drawSpectrumBand(ctx, a, 0.25);
  ctx.strokeStyle = '#DDD';
  ctx.lineWidth = 1;
  [0, 0.5, 1].forEach(v => {
    const y = Math.round(a.y + a.h - v * a.h) + 0.5;
    ctx.beginPath();
    ctx.moveTo(a.x, y);
    ctx.lineTo(a.x + a.w, y);
    ctx.stroke();
    text(ctx, `${v}`, a.x - 8, y, 'right', '#555', '11px sans-serif');
  });
  drawCurve(ctx, a, SCOTOPIC, '#1971C2', 2.5, 'rgba(25, 113, 194, 0.12)');
  drawCurve(ctx, a, PHOTOPIC, '#E8590C', 2.5, 'rgba(232, 89, 12, 0.10)');
  drawAxis(ctx, a);

  const x1 = wlX(a, 507);
  const x2 = wlX(a, 555);
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 1;
  [[x1, '#1971C2'], [x2, '#E8590C']].forEach(([x, color]) => {
    ctx.strokeStyle = color as string;
    ctx.beginPath();
    ctx.moveTo(Math.round(x as number) + 0.5, a.y);
    ctx.lineTo(Math.round(x as number) + 0.5, a.y + a.h);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  text(ctx, '507nm', x1, a.y - 8, 'right', '#1971C2', 'bold 12px sans-serif');
  text(ctx, '555nm', x2, a.y - 8, 'left', '#E8590C', 'bold 12px sans-serif');
  ctx.strokeStyle = '#333';
  ctx.beginPath();
  ctx.moveTo(x1 + 4, a.y + 14);
  ctx.lineTo(x2 - 4, a.y + 14);
  ctx.lineTo(x2 - 10, a.y + 10);
  ctx.moveTo(x2 - 4, a.y + 14);
  ctx.lineTo(x2 - 10, a.y + 18);
  ctx.stroke();
  text(ctx, '浦肯野位移', (x1 + x2) / 2, a.y + 28, 'center', '#333', '11px sans-serif');

  [['V′(λ)  暗视觉 · 视杆细胞 · 峰值 507nm', '#1971C2'], ['V(λ)  明视觉 · 视锥细胞 · 峰值 555nm', '#E8590C']].forEach(([label, color], i) => {
    ctx.fillStyle = color;
    ctx.fillRect(a.x + a.w - 250, a.y + 50 + i * 20, 14, 3);
    text(ctx, label, a.x + a.w - 230, a.y + 52 + i * 20, 'left', '#333', '12px sans-serif');
  });
};

// ---------- 夜视模拟 ----------

const SCENE_W = 320;
const SCENE_H = 200;
const SCENE = makePhotoScene(SCENE_W, SCENE_H).image;

/** lum 为 null 时画原图，否则按适应亮度(cd/m²)做夜视模拟 */
const drawNight = (lum: () => number | null): DrawFn => ctx => {
  const level = lum();
  const out = ctx.createImageData(SCENE_W, SCENE_H);
  const src = SCENE.data;
  for (let i = 0; i < SCENE_W * SCENE_H; i++) {
    const linear: Vec3 = [src[i * 3], src[i * 3 + 1], src[i * 3 + 2]];
    const rgb = level === null ? linear : nightLinear(linear, level);
    out.data[i * 4] = encodeCode(rgb[0]);
    out.data[i * 4 + 1] = encodeCode(rgb[1]);
    out.data[i * 4 + 2] = encodeCode(rgb[2]);
    out.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
};

const LEVELS: {label: string; lum: number}[] = [
  {label: '白天 100 cd/m²', lum: 100},
  {label: '黄昏 0.3 cd/m²', lum: 0.3},
  {label: '星光 0.003 cd/m²', lum: 0.003}
];

// ---------- 浦肯野效应 ----------

// 明视觉亮度相同（Y = 0.0722）的纯红和纯蓝，线性 sRGB
const SWATCHES: {name: string; linear: Vec3}[] = [
  {name: '红', linear: [0.0722 / 0.2126, 0, 0]},
  {name: '蓝', linear: [0, 0, 1]}
];

const PURKINJE_LEVELS = [100, 3, 0.1, 0.003];
const PURKINJE_W = 640;
const PURKINJE_H = 190;

const levelName = (lum: number): string => {
  if (lum >= 100) {
    return '白天';
  }
  if (lum >= 3) {
    return '黄昏';
  }
  return lum >= 0.1 ? '月光' : '星光';
};

const drawPurkinje: DrawFn = ctx => {
  PURKINJE_LEVELS.forEach((lum, col) => {
    const x = 10 + col * 156;
    text(ctx, `${levelName(lum)} ${lum} cd/m²`, x, 14, 'left', '#333', 'bold 12px sans-serif');
    SWATCHES.forEach((s, row) => {
      const rgb = nightLinear(s.linear, lum).map(v => encodeCode(v)) as Vec3;
      ctx.fillStyle = rgbCss(rgb);
      ctx.fillRect(x + row * 70, 28, 64, 90);
      ctx.strokeStyle = '#CCC';
      ctx.strokeRect(x + row * 70 + 0.5, 28.5, 63, 89);
      text(ctx, s.name, x + row * 70 + 32, 132, 'center', '#555', '12px sans-serif');
    });
    text(ctx, `视觉模式：${Math.round(photopicShare(lum) * 100)}% 明视觉`, x, 156, 'left', '#777', '11px sans-serif');
    text(ctx, `亮度增益 ${nightGain(lum).toFixed(2)}`, x, 174, 'left', '#777', '11px sans-serif');
  });
};

/** 表格：两个色块的明视觉亮度 Y 与相对暗视觉亮度（白 = 1） */
const swatchStats = SWATCHES.map(s => {
  const xyz = linearToXyz(s.linear);
  return {name: s.name, photopic: xyz[1], scotopic: scotopicRel(xyz)};
});

export {
  LUM_W,
  LUM_H,
  SCENE_W,
  SCENE_H,
  LEVELS,
  PURKINJE_W,
  PURKINJE_H,
  swatchStats,
  drawLuminosity,
  drawNight,
  drawPurkinje
};
