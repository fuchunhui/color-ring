import type {Vec3} from '../utils/space';
import {srgbToLinear, rgbToLab} from '../utils/space';
import {deltaE2000} from '../utils/deltae';
import {makePhotoScene, encodeCode} from '../utils/scene';
import type {Area, DrawFn} from '../utils/spectral';
import {WAVELENGTHS, drawSpectrumBand, drawAxis, drawCurve, text, rgbCss} from '../utils/spectral';
import {lensTransmittance, lensDensity, agedFilter, applyMatrix} from '../utils/aging';

const PLOT_W = 720;
const PLOT_H = 280;
const AREA: Area = {x: 48, y: 28, w: 620, h: 200};

const drawTransmittance = (age: () => number): DrawFn => ctx => {
  const a = AREA;
  const old = age();
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
  drawCurve(ctx, a, WAVELENGTHS.map(l => lensTransmittance(l, 20)), '#2F9E44', 2.5);
  drawCurve(ctx, a, WAVELENGTHS.map(l => lensTransmittance(l, old)), '#C92A2A', 2.5);
  drawAxis(ctx, a);
  text(ctx, '透过率', a.x - 40, a.y - 12, 'left', '#333', '12px sans-serif');
  [['20 岁', '#2F9E44'], [`${old} 岁`, '#C92A2A']].forEach(([label, color], i) => {
    ctx.fillStyle = color;
    ctx.fillRect(a.x + a.w - 120, a.y + 12 + i * 20, 14, 3);
    text(ctx, label, a.x + a.w - 100, a.y + 14 + i * 20, 'left', '#333', '12px sans-serif');
  });
  const d = (l: number) => lensDensity(l, old).toFixed(2);
  text(ctx, `${old} 岁：400nm 密度 ${d(400)}，450nm ${d(450)}，550nm ${d(550)}（光密度，越大越暗）`, a.x, a.y + a.h + 34, 'left', '#555', '12px sans-serif');
};

const SCENE_W = 320;
const SCENE_H = 200;
const SCENE = makePhotoScene(SCENE_W, SCENE_H).image;

/** old 为 null 时画原图，否则画老眼睛里的感受 */
const drawScene = (age: () => number | null, adapt: () => number): DrawFn => ctx => {
  const years = age();
  const m = years === null ? null : agedFilter(years, adapt());
  const out = ctx.createImageData(SCENE_W, SCENE_H);
  for (let i = 0; i < SCENE_W * SCENE_H; i++) {
    const src: Vec3 = [SCENE.data[i * 3], SCENE.data[i * 3 + 1], SCENE.data[i * 3 + 2]];
    const c = m ? applyMatrix(m, src) : src;
    out.data[i * 4] = encodeCode(c[0]);
    out.data[i * 4 + 1] = encodeCode(c[1]);
    out.data[i * 4 + 2] = encodeCode(c[2]);
    out.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
};

const PAIRS: {name: string; a: Vec3; b: Vec3}[] = [
  {name: '深蓝 / 蓝紫', a: [20, 40, 140], b: [40, 36, 150]},
  {name: '蓝 / 紫', a: [60, 70, 200], b: [85, 60, 205]},
  {name: '青蓝 / 蓝', a: [30, 110, 190], b: [40, 90, 195]},
  {name: '黑 / 深海军蓝', a: [10, 12, 22], b: [8, 12, 40]}
];

const toLinear = (rgb: Vec3): Vec3 => rgb.map(v => srgbToLinear(v / 255)) as Vec3;
const toRgb = (c: Vec3): Vec3 => c.map(v => encodeCode(v)) as Vec3;

const PAIR_W = 640;
const PAIR_H = 232;

interface PairView {
  young: number;
  noAdapt: number;
  adapted: number;
}

/** 色块对在年轻眼睛、老眼睛（未适应、适应后）里的 ΔE2000 */
const pairDeltas = (age: number, adapt: number): PairView[] => {
  const none = agedFilter(age, 0);
  const full = agedFilter(age, adapt);
  const lab = (c: Vec3): Vec3 => rgbToLab(toRgb(c));
  return PAIRS.map(({a, b}) => {
    const la = toLinear(a);
    const lb = toLinear(b);
    return {
      young: deltaE2000(lab(la), lab(lb)),
      noAdapt: deltaE2000(lab(applyMatrix(none, la)), lab(applyMatrix(none, lb))),
      adapted: deltaE2000(lab(applyMatrix(full, la)), lab(applyMatrix(full, lb)))
    };
  });
};

const drawPairs = (age: () => number, adapt: () => number): DrawFn => ctx => {
  const years = age();
  const m = agedFilter(years, adapt());
  const none = agedFilter(years, 0);
  const deltas = pairDeltas(years, adapt());
  PAIRS.forEach(({name, a, b}, row) => {
    const y = 10 + row * 56;
    text(ctx, name, 4, y + 24, 'left', '#333', '12px sans-serif');
    const cols: {label: string; fa: Vec3; fb: Vec3; de: number}[] = [
      {label: '20 岁', fa: a, fb: b, de: deltas[row].young},
      {label: `${years} 岁（未适应）`, fa: toRgb(applyMatrix(none, toLinear(a))), fb: toRgb(applyMatrix(none, toLinear(b))), de: deltas[row].noAdapt},
      {label: `${years} 岁（适应后）`, fa: toRgb(applyMatrix(m, toLinear(a))), fb: toRgb(applyMatrix(m, toLinear(b))), de: deltas[row].adapted}
    ];
    cols.forEach(({label, fa, fb, de}, i) => {
      const x = 130 + i * 170;
      ctx.fillStyle = rgbCss(fa);
      ctx.fillRect(x, y, 56, 42);
      ctx.fillStyle = rgbCss(fb);
      ctx.fillRect(x + 56, y, 56, 42);
      ctx.strokeStyle = '#CCC';
      ctx.strokeRect(x + 0.5, y + 0.5, 111, 41);
      text(ctx, `${label}`, x, y + 52, 'left', '#777', '10px sans-serif');
      text(ctx, `ΔE ${de.toFixed(1)}`, x + 118, y + 20, 'left', '#333', '11px sans-serif');
    });
  });
};

export {
  PLOT_W,
  PLOT_H,
  SCENE_W,
  SCENE_H,
  PAIR_W,
  PAIR_H,
  drawTransmittance,
  drawScene,
  drawPairs,
  pairDeltas
};
