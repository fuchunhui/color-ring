import {Vec3, rgbToXyz, rgbToLinear, srgbToLinear, xyzToLab, xyzToLinear, linearToXyz} from './space';
import {cmf} from './cie';
import {deltaE2000} from './deltae';
import {
  Spectrum,
  WAVELENGTHS,
  WL_MIN,
  WL_MAX,
  D65,
  spectrumXyz,
  adaptXyz,
  invert3,
  mulVec
} from './spectral';

type Coef = Vec3;

interface Fit {
  rgb: Vec3;
  /** sigmoid(c0·x² + c1·x + c2) 的三个系数，x 为 −1~1 的归一化波长 */
  coef: Coef;
  spectrum: Spectrum;
  /** 目标颜色与求出的光谱在 D65 下的 ΔE2000 */
  deltaE: number;
  /** 求出的光谱在 D65 下重新算回来的 XYZ */
  xyz: Vec3;
}

// ---------- 光谱曲线族：sigmoid(二次多项式) ----------

const X = WAVELENGTHS.map(l => (l - WL_MIN) / (WL_MAX - WL_MIN) * 2 - 1);

const sigmoid = (v: number): number => 0.5 + v / (2 * Math.sqrt(1 + v * v));

/** sigmoid 的反函数，用来给灰色（水平线）反推系数 */
const sigmoidInv = (s: number): number => {
  const t = 2 * s - 1;
  return t / Math.sqrt(1 - t * t);
};

const spectrumOf = ([c0, c1, c2]: Coef): Spectrum => X.map(x => sigmoid((c0 * x + c1) * x + c2));

// ---------- D65 下的颜色计算 ----------

const D65_XYZ = spectrumXyz(D65);
const REF_WHITE = rgbToXyz([255, 255, 255]);
// 5nm 采样的 D65 表算出来的白点与 sRGB 白点有微小差别，统一按通道缩放，使 D65 下的白恰好是 sRGB 白
const FIX = REF_WHITE.map((w, i) => w / D65_XYZ[i]) as Vec3;

const fixXyz = (v: Vec3): Vec3 => v.map((c, i) => c * FIX[i]) as Vec3;

/** 反射率在某个光源下的 XYZ，光源自己的白 Y = 1；adapt 为真时用 Bradford 把光源白换到 D65 白 */
const xyzUnder = (refl: Spectrum, spd: Spectrum, adapt: boolean): Vec3 => {
  const xyz = spectrumXyz(spd, refl);
  return fixXyz(adapt ? adaptXyz(xyz, spectrumXyz(spd), D65_XYZ) : xyz);
};

/** 偷懒算法：把 sRGB 线性值逐通道乘上光源白的线性 sRGB 值 */
const naiveXyz = (rgb: Vec3, spd: Spectrum, adapt: boolean): Vec3 => {
  if (adapt) {
    return rgbToXyz(rgb);
  }
  const light = xyzToLinear(fixXyz(spectrumXyz(spd))).map(v => Math.max(0, v));
  const lin = rgbToLinear(rgb).map((v, i) => v * light[i]) as Vec3;
  return linearToXyz(lin);
};

const labOfCoef = (c: Coef): Vec3 => xyzToLab(fixXyz(spectrumXyz(D65, spectrumOf(c))));

const deltaBetween = (a: Vec3, b: Vec3): number => deltaE2000(xyzToLab(a), xyzToLab(b));

// ---------- 阻尼牛顿法（Levenberg–Marquardt）求三个系数 ----------

const H = 1e-4;

const refine = (start: Coef, goal: Vec3): Coef => {
  let c = start;
  let lab = labOfCoef(c);
  let r = lab.map((v, i) => v - goal[i]);
  let err = r.reduce((s, v) => s + v * v, 0);
  let lambda = 1e-3;
  for (let iter = 0; iter < 60 && err > 1e-10; iter++) {
    const cols = [0, 1, 2].map(k => {
      const d = [...c] as Coef;
      d[k] += H;
      const labK = labOfCoef(d);
      return labK.map((v, i) => (v - lab[i]) / H);
    });
    const a = cols.map(ci => cols.map(cj => ci.reduce((s, v, i) => s + v * cj[i], 0)));
    const g = cols.map(ci => ci.reduce((s, v, i) => s + v * r[i], 0)) as Vec3;
    let accepted = false;
    for (let trial = 0; trial < 12 && !accepted; trial++) {
      const damped = a.map((row, i) => row.map((v, j) => (i === j ? v * (1 + lambda) + 1e-12 : v)));
      const delta = mulVec(invert3(damped), g).map(v => -v) as Vec3;
      const next = c.map((v, i) => v + delta[i]) as Coef;
      if (delta.every(Number.isFinite)) {
        const labN = labOfCoef(next);
        const rN = labN.map((v, i) => v - goal[i]);
        const errN = rN.reduce((s, v) => s + v * v, 0);
        if (errN < err) {
          c = next;
          lab = labN;
          r = rN;
          err = errN;
          lambda = Math.max(lambda / 5, 1e-10);
          accepted = true;
          continue;
        }
      }
      lambda *= 5;
    }
    if (!accepted) {
      break;
    }
  }
  return c;
};

const STEPS = 10;

/** 由 sRGB 求一条在 D65 下呈现该颜色的平滑反射率光谱 */
const fitRgb = (rgb: Vec3): Fit => {
  const target = rgbToXyz(rgb);
  const targetLab = xyzToLab(target);
  let coef: Coef;
  if (rgb[0] === rgb[1] && rgb[1] === rgb[2]) {
    const v = Math.min(1 - 1e-4, Math.max(1e-4, srgbToLinear(rgb[0] / 255)));
    coef = [0, 0, sigmoidInv(v)];
  } else {
    const flat = Math.min(1 - 1e-4, Math.max(1e-4, target[1]));
    coef = [0, 0, sigmoidInv(flat)];
    const gray: Vec3 = [targetLab[0], 0, 0];
    for (let k = 1; k <= STEPS; k++) {
      const t = k / STEPS;
      const goal = gray.map((v, i) => v + (targetLab[i] - v) * t) as Vec3;
      coef = refine(coef, goal);
    }
  }
  const spectrum = spectrumOf(coef);
  const xyz = fixXyz(spectrumXyz(D65, spectrum));
  return {rgb, coef, spectrum, deltaE: deltaBetween(target, xyz), xyz};
};

// ---------- 同色异谱：在 D65 下颜色不变的光谱扰动 ----------

const CMF: Vec3[] = WAVELENGTHS.map(cmf);
const K = WAVELENGTHS.reduce((s, _, i) => s + D65[i] * CMF[i][1], 0);
const ROWS: Spectrum[] = [0, 1, 2].map(j => WAVELENGTHS.map((_, i) => D65[i] * CMF[i][j] / K));
const dot = (a: number[], b: number[]): number => a.reduce((s, v, i) => s + v * b[i], 0);

interface Metamer {
  spectrum: Spectrum;
  /** 与原光谱的最大差值（反射率） */
  peak: number;
}

/**
 * 给光谱叠一个正弦起伏，再把它投影到“D65 下看不见”的方向上。
 * 起伏先乘以 min(R, 1−R)，这样反射率贴着 0 或 1 的波段几乎不动，叠加后不会越界；
 * amount 为 0~1，表示最大偏离占 min(R, 1−R) 的比例；period 为起伏周期（nm）。
 */
const buildMetamer = (base: Spectrum, period: number, amount: number): Metamer => {
  const room = base.map(v => Math.min(v, 1 - v));
  const rows = ROWS.map(row => row.map((w, i) => w * room[i]));
  const gram = rows.map(a => rows.map(b => dot(a, b)));
  const raw = WAVELENGTHS.map(l => {
    const u = (l - WL_MIN) * 2 * Math.PI;
    return Math.sin(u / period) + 0.5 * Math.sin(u / (period * 0.6) + 1.1);
  });
  const inv = invert3(gram);
  if (!inv.every(row => row.every(Number.isFinite))) {
    return {spectrum: base, peak: 0};
  }
  const k = mulVec(inv, rows.map(row => dot(row, raw)) as Vec3);
  const p = raw.map((v, i) => v - (k[0] * rows[0][i] + k[1] * rows[1][i] + k[2] * rows[2][i]));
  const top = Math.max(...p.map(Math.abs));
  if (!(top > 1e-9)) {
    return {spectrum: base, peak: 0};
  }
  const gain = Math.min(1, Math.max(0, amount)) * 0.95 / top;
  const delta = p.map((v, i) => v * room[i] * gain);
  return {spectrum: base.map((v, i) => v + delta[i]), peak: Math.max(...delta.map(Math.abs))};
};

export {
  Coef,
  Fit,
  Metamer,
  spectrumOf,
  fitRgb,
  xyzUnder,
  naiveXyz,
  deltaBetween,
  buildMetamer
};
