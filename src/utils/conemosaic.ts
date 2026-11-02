import {Vec3, linearToSrgb, srgbToLinear} from './space';
import {rgbToLmsRel} from './vision';
import {Matrix, invert3, mulVec} from './spectral';
import {mulberry32} from './scene';

/** 单位：弧分（1° = 60'）。视网膜上 1' 约 4.8 µm。 */

const FOVEOLA_RADIUS = 10.5; // 小凹中央无 S 视锥的区域直径约 0.35° = 21'

/** 中心凹视锥间距约 0.5'（≈2.5 µm），随偏心度增大，这里用一条平滑曲线近似文献趋势 */
const coneSpacing = (ecc: number): number => 0.5 * (1 + ecc / 1.5) ** 0.8;

/** 示意用：每个视锥旁边画几根视杆（真实比例更高，画不下）。小凹中央没有视杆。 */
const rodPerCone = (ecc: number): number => (ecc < 0.35 ? 0 : Math.min(3, (ecc - 0.35) * 0.5));

interface Mosaic {
  width: number;
  height: number;
  spacing: number;
  xs: Float32Array;
  ys: Float32Array;
  /** 0 = L，1 = M，2 = S */
  cls: Uint8Array;
  rodX: Float32Array;
  rodY: Float32Array;
  fixX: number;
  fixY: number;
  counts: [number, number, number];
}

interface MosaicOptions {
  width: number;
  height: number;
  ecc: number;
  lmRatio: number;
  sFraction: number;
  hole: boolean;
  seed: number;
}

const buildMosaic = (opts: MosaicOptions): Mosaic => {
  const {width, height, ecc, lmRatio, sFraction, hole, seed} = opts;
  const rand = mulberry32(seed);
  const d = coneSpacing(ecc);
  const rowH = d * 0.866;
  const px: number[] = [];
  const py: number[] = [];
  for (let row = -1; row * rowH <= height + rowH; row++) {
    const offset = row & 1 ? d / 2 : 0;
    for (let x = -d + offset; x <= width + d; x += d) {
      const cx = x + (rand() - 0.5) * 0.35 * d;
      const cy = row * rowH + (rand() - 0.5) * 0.35 * d;
      if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
        px.push(cx);
        py.push(cy);
      }
    }
  }
  const n = px.length;
  const fixX = width / 2 - ecc * 60;
  const fixY = height / 2;

  const cls = new Uint8Array(n);
  const eligible: number[] = [];
  for (let i = 0; i < n; i++) {
    const inHole = hole && Math.hypot(px[i] - fixX, py[i] - fixY) < FOVEOLA_RADIUS;
    if (!inHole) {
      eligible.push(i);
    }
  }
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  // S 视锥彼此很少相邻：随机飞镖法，保证最小间距
  const target = Math.round(Math.max(0, sFraction) * eligible.length);
  const minDist = 1.7 * d;
  const sIdx: number[] = [];
  for (let k = 0; k < eligible.length && sIdx.length < target; k++) {
    const i = eligible[k];
    if (sIdx.every(j => Math.hypot(px[i] - px[j], py[i] - py[j]) >= minDist)) {
      sIdx.push(i);
      cls[i] = 2;
    }
  }
  const pL = lmRatio / (1 + lmRatio);
  for (let i = 0; i < n; i++) {
    if (cls[i] !== 2) {
      cls[i] = rand() < pL ? 0 : 1;
    }
  }

  // 视杆：放在视锥之间的空隙里，数量只做示意
  const rx: number[] = [];
  const ry: number[] = [];
  const wantRods = Math.round(n * rodPerCone(ecc));
  const cell = d;
  const grid = new Map<number, number[]>();
  const keyOf = (cx: number, cy: number): number => Math.floor(cx / cell) * 10007 + Math.floor(cy / cell);
  for (let i = 0; i < n; i++) {
    const k = keyOf(px[i], py[i]);
    const list = grid.get(k);
    if (list) {
      list.push(i);
    } else {
      grid.set(k, [i]);
    }
  }
  for (let t = 0; t < wantRods * 4 && rx.length < wantRods; t++) {
    const x = rand() * width;
    const y = rand() * height;
    let ok = true;
    for (let gx = -1; gx <= 1 && ok; gx++) {
      for (let gy = -1; gy <= 1 && ok; gy++) {
        const list = grid.get(keyOf(x + gx * cell, y + gy * cell));
        if (list && list.some(i => Math.hypot(px[i] - x, py[i] - y) < 0.55 * d)) {
          ok = false;
        }
      }
    }
    if (ok) {
      rx.push(x);
      ry.push(y);
    }
  }

  const counts: [number, number, number] = [0, 0, 0];
  cls.forEach(c => {
    counts[c]++;
  });
  return {
    width,
    height,
    spacing: d,
    xs: Float32Array.from(px),
    ys: Float32Array.from(py),
    cls,
    rodX: Float32Array.from(rx),
    rodY: Float32Array.from(ry),
    fixX,
    fixY,
    counts
  };
};

// ---------- 场景 ----------

const LIN_TO_LMS: Matrix = (() => {
  const cols = ([[255, 0, 0], [0, 255, 0], [0, 0, 255]] as Vec3[]).map(c => rgbToLmsRel(c));
  return [0, 1, 2].map(i => [cols[0][i], cols[1][i], cols[2][i]]);
})();
const LMS_TO_LIN: Matrix = invert3(LIN_TO_LMS);

type SceneFn = (x: number, y: number) => Vec3;

const lin = (r: number, g: number, b: number): Vec3 => [srgbToLinear(r / 255), srgbToLinear(g / 255), srgbToLinear(b / 255)];

const BG = lin(128, 128, 128);
const BLUE = lin(30, 60, 240);
const YELLOW = lin(240, 220, 40);
const RED = lin(205, 70, 50);
const GREEN = lin(45, 130, 60);
const WHITE = lin(250, 250, 250);
const BLACK = lin(10, 10, 10);
const ORANGE = lin(235, 140, 40);
const TEAL = lin(30, 150, 160);
const PURPLE = lin(140, 70, 170);

const PATCH_Y0 = 20;

interface Dot {
  x: number;
  y: number;
  r: number;
  color: Vec3;
}
interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  color: Vec3;
}

const DOTS: Dot[] = [];
[[0.5, 7], [1, 9.5], [2, 12.5], [3.5, 16.5]].forEach(([dia, x]) => {
  DOTS.push({x, y: 8, r: dia / 2, color: BLUE});
  DOTS.push({x, y: 12, r: dia / 2, color: YELLOW});
});
[[8, RED], [10.5, GREEN], [13, WHITE], [15.5, BLACK]].forEach(([x, color]) => {
  DOTS.push({x: x as number, y: 16, r: 0.5, color: color as Vec3});
});

const RECTS: Rect[] = [];
[[2, RED], [3.5, GREEN], [5, BLUE], [6.5, YELLOW]].forEach(([x, color]) => {
  RECTS.push({x0: (x as number) - 0.25, x1: (x as number) + 0.25, y0: 5, y1: 19, color: color as Vec3});
});
[[18, 0.25], [19.5, 0.5], [21, 1], [22.8, 2]].forEach(([x, w]) => {
  RECTS.push({x0: x - w / 2, x1: x + w / 2, y0: 7, y1: 17, color: BLUE});
});
RECTS.push({x0: 0, x1: 8, y0: PATCH_Y0, y1: 24, color: ORANGE});
RECTS.push({x0: 8, x1: 16, y0: PATCH_Y0, y1: 24, color: TEAL});
RECTS.push({x0: 16, x1: 24, y0: PATCH_Y0, y1: 24, color: PURPLE});

const GRATING_BAND = 4; // 主场景顶部 0~4' 是固定周期的红绿光栅
const MAIN_GRATING_PERIOD = 1.2;

const stripe = (x: number, period: number): Vec3 => (Math.floor(x / (period / 2)) % 2 === 0 ? RED : GREEN);

const mainScene: SceneFn = (x, y) => {
  if (y < GRATING_BAND) {
    return stripe(x, MAIN_GRATING_PERIOD);
  }
  for (const dot of DOTS) {
    if ((x - dot.x) ** 2 + (y - dot.y) ** 2 <= dot.r * dot.r) {
      return dot.color;
    }
  }
  for (const rect of RECTS) {
    if (x >= rect.x0 && x < rect.x1 && y >= rect.y0 && y < rect.y1) {
      return rect.color;
    }
  }
  return BG;
};

const gratingScene = (period: number): SceneFn => x => stripe(x, period);

/** 三条大色带，上下各放一排 1' 的小点：带内平均色看大面积，小点看细节 */
const BANDS = [
  {name: '橙色', x0: 0, x1: 8, color: [235, 140, 40] as Vec3},
  {name: '青色', x0: 8, x1: 16, color: [30, 150, 160] as Vec3},
  {name: '紫色', x0: 16, x1: 24, color: [140, 70, 170] as Vec3}
];
const BAND_MEASURE_Y0 = 8;
const BAND_MEASURE_Y1 = 16;

const bandScene: SceneFn = (x, y) => {
  const index = Math.min(2, Math.floor(x / 8));
  const cx = index * 8 + 4;
  const dots: [number, Vec3][] = [[-2, RED], [0, GREEN], [2, WHITE]];
  for (const row of [4, 20]) {
    for (const [dx, color] of dots) {
      if ((x - cx - dx) ** 2 + (y - row) ** 2 <= 0.25) {
        return color;
      }
    }
  }
  return lin(...BANDS[index].color);
};

interface Scene {
  size: number;
  /** 每弧分多少像素 */
  ppa: number;
  linear: Float32Array;
  lms: Float32Array[];
}

const renderScene = (fn: SceneFn, size: number, ppa: number, ss = 3): Scene => {
  const linear = new Float32Array(size * size * 3);
  const lms = [0, 1, 2].map(() => new Float32Array(size * size));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = fn((x + (sx + 0.5) / ss) / ppa, (y + (sy + 0.5) / ss) / ppa);
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const k = 1 / (ss * ss);
      const i = y * size + x;
      linear[i * 3] = r * k;
      linear[i * 3 + 1] = g * k;
      linear[i * 3 + 2] = b * k;
      const v = mulVec(LIN_TO_LMS, [r * k, g * k, b * k]);
      lms[0][i] = v[0];
      lms[1][i] = v[1];
      lms[2][i] = v[2];
    }
  }
  return {size, ppa, linear, lms};
};

// ---------- 光学、采样、重建 ----------

const gaussBlur = (src: Float32Array, size: number, sigmaPx: number): Float32Array => {
  if (sigmaPx < 0.3) {
    return src;
  }
  const rad = Math.ceil(sigmaPx * 3);
  const kernel = Array.from({length: rad * 2 + 1}, (_, i) => Math.exp(-((i - rad) ** 2) / (2 * sigmaPx * sigmaPx)));
  const sum = kernel.reduce((a, b) => a + b, 0);
  const norm = kernel.map(v => v / sum);
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = 0;
      for (let k = -rad; k <= rad; k++) {
        acc += src[y * size + Math.min(size - 1, Math.max(0, x + k))] * norm[k + rad];
      }
      tmp[y * size + x] = acc;
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = 0;
      for (let k = -rad; k <= rad; k++) {
        acc += tmp[Math.min(size - 1, Math.max(0, y + k)) * size + x] * norm[k + rad];
      }
      out[y * size + x] = acc;
    }
  }
  return out;
};

/** 每个视锥只读出自己那一类的响应 */
const sampleCones = (scene: Scene, mosaic: Mosaic, opticsSigma: number): Float32Array => {
  const {size, ppa} = scene;
  const blurred = scene.lms.map(plane => gaussBlur(plane, size, opticsSigma * ppa));
  const values = new Float32Array(mosaic.cls.length);
  for (let i = 0; i < values.length; i++) {
    const x = Math.min(size - 1, Math.max(0, Math.floor(mosaic.xs[i] * ppa)));
    const y = Math.min(size - 1, Math.max(0, Math.floor(mosaic.ys[i] * ppa)));
    values[i] = blurred[mosaic.cls[i]][y * size + x];
  }
  return values;
};

const SOFT_WEIGHT = 0.05;

/** 高斯加权求和，返回分子、分母；cls 为 -1 时所有 L、M 视锥一起（亮度近似） */
const gatherClass = (mosaic: Mosaic, values: Float32Array, size: number, ppa: number, cls: number): {num: Float32Array; den: Float32Array} => {
  const area = mosaic.width * mosaic.height;
  const total = size * size;
  const num = new Float32Array(total);
  const den = new Float32Array(total);
  const count = cls < 0 ? mosaic.counts[0] + mosaic.counts[1] : mosaic.counts[cls];
  if (count === 0) {
    return {num, den};
  }
  const sigma = Math.min(mosaic.width / 3, Math.max(0.4 * mosaic.spacing, 0.45 * Math.sqrt(area / count)));
  const sp = sigma * ppa;
  const rad = Math.ceil(sp * 3);
  for (let i = 0; i < values.length; i++) {
    const c = mosaic.cls[i];
    if (cls < 0 ? c === 2 : c !== cls) {
      continue;
    }
    const cx = mosaic.xs[i] * ppa;
    const cy = mosaic.ys[i] * ppa;
    const x0 = Math.max(0, Math.floor(cx - rad));
    const x1 = Math.min(size - 1, Math.ceil(cx + rad));
    const y0 = Math.max(0, Math.floor(cy - rad));
    const y1 = Math.min(size - 1, Math.ceil(cy + rad));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const r2 = dx * dx + dy * dy;
        if (r2 > rad * rad) {
          continue;
        }
        const w = Math.exp(-r2 / (2 * sp * sp));
        num[y * size + x] += w * values[i];
        den[y * size + x] += w;
      }
    }
  }
  return {num, den};
};

/**
 * 按各类视锥自己的密度定宽度做高斯插值。样本覆盖不到的地方平滑地退回备选值：
 * L、M 退回“所有 L/M 读数混在一起”的亮度近似，S 退回 (L+M)/2，即这一处不提供蓝-黄信息。
 */
const reconstruct = (mosaic: Mosaic, values: Float32Array, size: number, ppa: number): Float32Array[] => {
  const total = size * size;
  const pooled = gatherClass(mosaic, values, size, ppa, -1);
  const classes = [0, 1, 2].map(c => gatherClass(mosaic, values, size, ppa, c));
  let mean = 0;
  let meanCount = 0;
  for (let i = 0; i < values.length; i++) {
    if (mosaic.cls[i] !== 2) {
      mean += values[i];
      meanCount++;
    }
  }
  const fallbackMean = meanCount > 0 ? mean / meanCount : 0;
  const planes = [0, 1, 2].map(() => new Float32Array(total));
  for (let p = 0; p < total; p++) {
    const a = pooled.den[p] > 0 ? (pooled.num[p] + SOFT_WEIGHT * fallbackMean) / (pooled.den[p] + SOFT_WEIGHT) : fallbackMean;
    for (let c = 0; c < 2; c++) {
      planes[c][p] = (classes[c].num[p] + SOFT_WEIGHT * a) / (classes[c].den[p] + SOFT_WEIGHT);
    }
    const neutral = (planes[0][p] + planes[1][p]) / 2;
    planes[2][p] = (classes[2].num[p] + SOFT_WEIGHT * neutral) / (classes[2].den[p] + SOFT_WEIGHT);
  }
  return planes;
};

const encode = (v: number): number => Math.round(Math.min(1, Math.max(0, linearToSrgb(Math.min(1, Math.max(0, v))))) * 255);

const lmsToLinear = (l: number, m: number, s: number): Vec3 => mulVec(LMS_TO_LIN, [l, m, s]);

const planesToBytes = (planes: Float32Array[]): Uint8ClampedArray => {
  const total = planes[0].length;
  const bytes = new Uint8ClampedArray(total * 4);
  for (let p = 0; p < total; p++) {
    const rgb = lmsToLinear(planes[0][p], planes[1][p], planes[2][p]);
    bytes[p * 4] = encode(rgb[0]);
    bytes[p * 4 + 1] = encode(rgb[1]);
    bytes[p * 4 + 2] = encode(rgb[2]);
    bytes[p * 4 + 3] = 255;
  }
  return bytes;
};

const sceneToBytes = (scene: Scene): Uint8ClampedArray => {
  const total = scene.size * scene.size;
  const bytes = new Uint8ClampedArray(total * 4);
  for (let p = 0; p < total; p++) {
    bytes[p * 4] = encode(scene.linear[p * 3]);
    bytes[p * 4 + 1] = encode(scene.linear[p * 3 + 1]);
    bytes[p * 4 + 2] = encode(scene.linear[p * 3 + 2]);
    bytes[p * 4 + 3] = 255;
  }
  return bytes;
};

interface SimOptions extends Omit<MosaicOptions, 'width' | 'height'> {
  optics: number;
}

interface Simulation {
  mosaic: Mosaic;
  planes: Float32Array[];
  bytes: Uint8ClampedArray;
}

/** 场景窗口是正方形，边长 = size / ppa 弧分 */
const simulate = (scene: Scene, opts: SimOptions): Simulation => {
  const span = scene.size / scene.ppa;
  const mosaic = buildMosaic({...opts, width: span, height: span});
  const values = sampleCones(scene, mosaic, opts.optics);
  const planes = reconstruct(mosaic, values, scene.size, scene.ppa);
  return {mosaic, planes, bytes: planesToBytes(planes)};
};

/** 重建图里一块矩形区域（弧分）的平均颜色，返回 sRGB 0~255 */
const regionMeanRgb = (planes: Float32Array[], size: number, ppa: number, x0: number, x1: number, y0: number, y1: number): Vec3 => {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = Math.floor(y0 * ppa); y < Math.min(size, Math.ceil(y1 * ppa)); y++) {
    for (let x = Math.floor(x0 * ppa); x < Math.min(size, Math.ceil(x1 * ppa)); x++) {
      const p = y * size + x;
      const rgb = lmsToLinear(planes[0][p], planes[1][p], planes[2][p]);
      r += Math.min(1, Math.max(0, rgb[0]));
      g += Math.min(1, Math.max(0, rgb[1]));
      b += Math.min(1, Math.max(0, rgb[2]));
      n++;
    }
  }
  const k = n > 0 ? 1 / n : 0;
  return [encode(r * k), encode(g * k), encode(b * k)];
};

export {
  FOVEOLA_RADIUS,
  GRATING_BAND,
  BANDS,
  BAND_MEASURE_Y0,
  BAND_MEASURE_Y1,
  coneSpacing,
  rodPerCone,
  buildMosaic,
  mainScene,
  gratingScene,
  bandScene,
  renderScene,
  sceneToBytes,
  simulate,
  regionMeanRgb
};
export type {Mosaic, Scene, Simulation, SimOptions};
