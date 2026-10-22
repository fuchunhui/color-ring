import {Vec3} from '../utils/space';
import {xyzToXy} from '../utils/cie';
import {
  Spectrum,
  DrawFn,
  Area,
  D65,
  WAVELENGTHS,
  sample,
  gauss,
  edge,
  blackbody,
  spectrumXyz,
  xyzToSrgb,
  rgbCss,
  adaptXyz,
  cctFromXy,
  text,
  drawSpectrumBand,
  drawAxis,
  drawCurve,
  normalize
} from '../utils/spectral';

interface Illuminant {
  key: string;
  name: string;
  note: string;
  spd: Spectrum;
}

const lines = (l: number, list: [number, number][]): number => {
  return list.reduce((sum, [center, amp]) => sum + amp * gauss(l, center, 2.2), 0);
};

const ILLUMINANTS: Illuminant[] = [
  {key: 'd65', name: 'D65 日光', note: 'CIE 标准数据', spd: D65},
  {key: 'a', name: 'A 钨丝灯', note: '2856K 黑体', spd: blackbody(2856)},
  {
    key: 'fl',
    name: '冷白荧光灯',
    note: '示意：汞线 + 宽带荧光粉',
    spd: sample(l => {
      const broad = 0.5 * gauss(l, 595, 55, 45) + 0.25 * gauss(l, 490, 45);
      return broad + lines(l, [[405, 0.3], [436, 1.2], [546, 0.75], [578, 0.5]]);
    })
  },
  {
    key: 'led',
    name: '冷白 LED',
    note: '示意：蓝光芯片 + 黄色荧光粉',
    spd: sample(l => {
      return 0.85 * gauss(l, 450, 10) + 0.5 * gauss(l, 565, 55, 70) + 0.14 * gauss(l, 625, 40) + 0.16 * gauss(l, 495, 25);
    })
  }
];

interface Swatch {
  name: string;
  refl: Spectrum;
}

const bump = (l: number, center: number, width: number): number => gauss(l, center, width);

// 示意样本：用平滑函数造的反射率曲线，不是标准 CRI 的 14 个测试色
const SAMPLES: Swatch[] = [
  {name: '红', refl: sample(l => 0.05 + 0.85 * edge(l, 600, 12))},
  {name: '橙', refl: sample(l => 0.06 + 0.82 * edge(l, 568, 12))},
  {name: '黄', refl: sample(l => 0.06 + 0.85 * edge(l, 515, 12))},
  {name: '绿', refl: sample(l => 0.06 + 0.5 * bump(l, 540, 40))},
  {name: '青', refl: sample(l => 0.06 + 0.6 * bump(l, 490, 36))},
  {name: '蓝', refl: sample(l => 0.06 + 0.55 * bump(l, 450, 32))},
  {name: '紫', refl: sample(l => 0.05 + 0.4 * bump(l, 445, 25) + 0.4 * edge(l, 650, 15))},
  {name: '肤色', refl: sample(l => 0.22 + 0.42 * edge(l, 585, 28) - 0.08 * bump(l, 555, 20))}
];

const whiteOf = (spd: Spectrum): Vec3 => spectrumXyz(spd);

const lightColor = (spd: Spectrum): Vec3 => xyzToSrgb(whiteOf(spd));

const chromaticity = (spd: Spectrum): [number, number] => xyzToXy(whiteOf(spd));

const cctOf = (spd: Spectrum): number => {
  const [x, y] = chromaticity(spd);
  return cctFromXy(x, y);
};

/** 样本在 spd 照明下的颜色；adapt 为 true 时做 Bradford 适应，换算到 D65 白点下 */
const sampleColor = (spd: Spectrum, refl: Spectrum, adapt: boolean): Vec3 => {
  let xyz = spectrumXyz(spd, refl);
  if (adapt) {
    xyz = adaptXyz(xyz, whiteOf(spd), whiteOf(D65));
  }
  return xyzToSrgb(xyz);
};

const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);

const labOf = ([x, y, z]: Vec3, white: Vec3): Vec3 => {
  const fx = f(x / white[0]);
  const fy = f(y / white[1]);
  const fz = f(z / white[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

const deltaE = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

interface Rendering {
  score: number;
  cct: number;
  reference: string;
  deltas: number[];
}

/** 简化版显色评价：100 − 4.6 × 平均 ΔE*ab，参考光为 D65 或同色温黑体 */
const renderingScore = (spd: Spectrum): Rendering => {
  const cct = cctOf(spd);
  const useDaylight = cct > 5000;
  const refSpd = useDaylight ? D65 : blackbody(cct);
  const refWhite = whiteOf(refSpd);
  const white = whiteOf(spd);
  const deltas = SAMPLES.map(({refl}) => {
    const test = adaptXyz(spectrumXyz(spd, refl), white, refWhite);
    const ref = spectrumXyz(refSpd, refl);
    return deltaE(labOf(test, refWhite), labOf(ref, refWhite));
  });
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  return {
    score: 100 - 4.6 * mean,
    cct,
    reference: useDaylight ? 'D65 日光' : `${Math.round(cct)}K 黑体`,
    deltas
  };
};

const SCORES = ILLUMINANTS.map(({spd}) => renderingScore(spd));

const SPD_W = 360;
const SPD_H = 214;
const SPD_PLOT: Area = {x: 14, y: 52, w: 316, h: 110};

const drawSpd = (illum: Illuminant): DrawFn => ctx => {
  text(ctx, illum.name, 14, 14, 'left', '#222', 'bold 13px sans-serif');
  text(ctx, illum.note, 14, 32, 'left', '#777', '11px sans-serif');
  ctx.fillStyle = rgbCss(lightColor(illum.spd));
  ctx.fillRect(SPD_W - 46, 6, 32, 32);
  ctx.strokeStyle = '#CCC';
  ctx.strokeRect(SPD_W - 45.5, 6.5, 31, 31);
  drawSpectrumBand(ctx, SPD_PLOT, 0.35);
  drawCurve(ctx, SPD_PLOT, normalize(illum.spd), '#222', 2, 'rgba(0, 0, 0, 0.12)');
  drawAxis(ctx, SPD_PLOT);
  const [x, y] = chromaticity(illum.spd);
  text(ctx, `x = ${x.toFixed(3)}  y = ${y.toFixed(3)}  相关色温 ≈ ${Math.round(cctOf(illum.spd))}K`, 14, 198, 'left', '#444', '12px sans-serif');
};

const CELL = 56;
const GAP = 6;
const LABEL_W = 136;
const TOP = 34;
const ROW_H = 76;
const REND_W = 880;
const REND_H = TOP + ILLUMINANTS.length * ROW_H + 26;
const PAPER: Spectrum = WAVELENGTHS.map(() => 1);

const drawRendering = (adapt: boolean): DrawFn => ctx => {
  const cells = [{name: '白纸', refl: PAPER}, ...SAMPLES];
  cells.forEach(({name}, i) => {
    text(ctx, name, LABEL_W + i * (CELL + GAP) + CELL / 2, 16, 'center', '#555', '12px sans-serif');
  });
  ILLUMINANTS.forEach((illum, row) => {
    const y = TOP + row * ROW_H;
    const result = SCORES[row];
    text(ctx, illum.name, 8, y + 22, 'left', '#222', 'bold 13px sans-serif');
    text(ctx, `${Math.round(result.cct)}K`, 8, y + 42, 'left', '#777', '12px sans-serif');
    cells.forEach(({refl}, i) => {
      const x = LABEL_W + i * (CELL + GAP);
      ctx.fillStyle = rgbCss(sampleColor(illum.spd, refl, adapt));
      ctx.fillRect(x, y, CELL, CELL);
      ctx.strokeStyle = '#DDD';
      ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
    });
    const tx = LABEL_W + cells.length * (CELL + GAP) + 8;
    text(ctx, `显色分 ${result.score.toFixed(0)}`, tx, y + 18, 'left', '#222', 'bold 14px sans-serif');
    text(ctx, `参考光：${result.reference}`, tx, y + 40, 'left', '#777', '11px sans-serif');
  });
  text(ctx, '简化演示，非标准 CRI（Ra）；样本为示意用的平滑反射率曲线', 8, REND_H - 10, 'left', '#999', '11px sans-serif');
};

export {
  Illuminant,
  ILLUMINANTS,
  SPD_W,
  SPD_H,
  REND_W,
  REND_H,
  SCORES,
  drawSpd,
  drawRendering
};
