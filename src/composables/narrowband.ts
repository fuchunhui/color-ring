import {cmf} from '../utils/cie';
import {
  DrawFn,
  Area,
  WL_MIN,
  WL_MAX,
  WAVELENGTHS,
  drawSpectrumBand,
  drawAxis,
  drawCurve,
  wlX,
  text
} from '../utils/spectral';
import {MAP_W, MAP_H, LINES, getNebula, stretch} from '../utils/narrowband';

/** 3×3：行是输出的 R、G、B，列是 [SII]、Hα、[OIII] */
type Mapping = number[][];

interface Preset {
  key: string;
  name: string;
  note: string;
  matrix: Mapping;
}

const PRESETS: Preset[] = [
  {
    key: 'natural',
    name: '接近自然',
    note: 'Hα 和 [SII] 都放红通道，[OIII] 放绿和蓝（青绿）',
    matrix: [[1, 1, 0], [0, 0, 1], [0, 0, 0.65]]
  },
  {
    key: 'sho',
    name: '哈勃调色板 SHO',
    note: '[SII]→红，Hα→绿，[OIII]→蓝',
    matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
  },
  {
    key: 'hoo',
    name: 'HOO 双色',
    note: 'Hα→红，[OIII]→绿和蓝，没有 [SII]',
    matrix: [[0, 1, 0], [0, 0, 1], [0, 0, 1]]
  },
  {
    key: 'hso',
    name: 'HSO',
    note: 'Hα→红，[SII]→绿，[OIII]→蓝',
    matrix: [[0, 1, 0], [1, 0, 0], [0, 0, 1]]
  }
];

const cloneMapping = (m: Mapping): Mapping => m.map(row => row.slice());

// ---------- 谱线位置 ----------

const SPEC_W = 660;
const SPEC_H = 190;

const BAR: Area = {x: 24, y: 40, w: 600, h: 40};
const CURVE: Area = {x: 24, y: 104, w: 600, h: 50};

const lineWaves = LINES.flatMap(line => line.waves.map(([l]) => l));

const drawSpectrum: DrawFn = ctx => {
  drawSpectrumBand(ctx, BAR, 1);
  lineWaves.forEach(l => {
    const x = Math.round(wlX(BAR, l)) + 0.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, BAR.y - 6);
    ctx.lineTo(x, BAR.y + BAR.h + 6);
    ctx.stroke();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, BAR.y - 6);
    ctx.lineTo(x, BAR.y + BAR.h + 6);
    ctx.stroke();
  });
  text(ctx, '[OIII] 495.9 / 500.7', wlX(BAR, 498), 18, 'center', '#222');
  text(ctx, 'Hα 656.3', wlX(BAR, 656.3) - 3, 18, 'right', '#222');
  text(ctx, '[SII] 671.6 / 673.1', wlX(BAR, 672.3) + 3, 18, 'left', '#222');

  const y = WAVELENGTHS.map(l => cmf(l)[1]);
  ctx.save();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = '#999';
  lineWaves.forEach(l => {
    const x = Math.round(wlX(CURVE, l)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, BAR.y + BAR.h + 6);
    ctx.lineTo(x, CURVE.y + CURVE.h);
    ctx.stroke();
  });
  ctx.restore();
  drawCurve(ctx, CURVE, y, '#333', 2, 'rgba(120, 120, 120, 0.12)');
  drawAxis(ctx, CURVE);
  text(ctx, '人眼的明亮度响应 ȳ(λ)', wlX(CURVE, WL_MIN) + 4, CURVE.y + 8, 'left', '#555', '11px sans-serif');
  LINES.forEach(line => {
    const l = line.waves[0][0];
    const value = cmf(l)[1];
    const x = wlX(CURVE, l);
    const py = CURVE.y + CURVE.h - Math.min(1.05, value) * CURVE.h;
    ctx.fillStyle = '#C0392B';
    ctx.beginPath();
    ctx.arc(x, py, 3, 0, 2 * Math.PI);
    ctx.fill();
  });
  text(ctx, `${WL_MIN}`, wlX(BAR, WL_MIN), BAR.y + BAR.h + 14, 'left', '#999', '10px sans-serif');
  text(ctx, `${WL_MAX} nm`, wlX(BAR, WL_MAX), BAR.y + BAR.h + 14, 'right', '#999', '10px sans-serif');
};

// ---------- 图像绘制 ----------

type StrengthFn = () => number;

const toCode = (v: number): number => Math.round(Math.min(1, Math.max(0, v)) * 255);

/** 单张窄带图的灰度显示：先除以自己的满量程，再做 arcsinh 拉伸（k = 0 为线性） */
const drawGray = (index: number, getK: StrengthFn): DrawFn => ctx => {
  const nebula = getNebula();
  const k = getK();
  const img = ctx.createImageData(MAP_W, MAP_H);
  const map = nebula.maps[index];
  const peak = nebula.peaks[index];
  for (let p = 0; p < MAP_W * MAP_H; p++) {
    const code = toCode(stretch(map[p] / peak, k));
    img.data[p * 4] = code;
    img.data[p * 4 + 1] = code;
    img.data[p * 4 + 2] = code;
    img.data[p * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
};

/** 假彩色：每张图按各自满量程归一、乘通道增益、拉伸，再按 3×3 对应关系混进 R、G、B */
const drawPalette = (getMatrix: () => Mapping, getK: StrengthFn, getGains: () => number[]): DrawFn => ctx => {
  const nebula = getNebula();
  const k = getK();
  const gains = getGains().slice();
  const m = cloneMapping(getMatrix());
  const img = ctx.createImageData(MAP_W, MAP_H);
  const s = [0, 0, 0];
  for (let p = 0; p < MAP_W * MAP_H; p++) {
    for (let i = 0; i < 3; i++) {
      s[i] = stretch(gains[i] * nebula.maps[i][p] / nebula.peaks[i], k);
    }
    for (let c = 0; c < 3; c++) {
      img.data[p * 4 + c] = toCode(m[c][0] * s[0] + m[c][1] * s[1] + m[c][2] * s[2]);
    }
    img.data[p * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
};

/** 按三条谱线真实的颜色和相对强度合成，不做逐通道归一，所以 [SII] 几乎看不见 */
const drawTrueColor = (getK: StrengthFn): DrawFn => ctx => {
  const nebula = getNebula();
  const k = getK();
  const img = ctx.createImageData(MAP_W, MAP_H);
  for (let p = 0; p < MAP_W * MAP_H; p++) {
    for (let c = 0; c < 3; c++) {
      img.data[p * 4 + c] = toCode(stretch(nebula.trueRgb[p * 3 + c], k));
    }
    img.data[p * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
};

export {
  MAP_W,
  MAP_H,
  SPEC_W,
  SPEC_H,
  PRESETS,
  cloneMapping,
  drawSpectrum,
  drawGray,
  drawPalette,
  drawTrueColor
};
export type {Mapping};
