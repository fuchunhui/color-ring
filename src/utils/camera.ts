import type {Vec3} from './space';
import {linearToXyz, xyzToLinear, srgbToLinear, linearToSrgb, xyzToLab} from './space';
import {cmf} from './cie';
import {WAVELENGTHS, D65, spectrumXyz, adaptXyz, blackbody, gauss} from './spectral';
import type {Spectrum} from './spectral';
import {deltaE2000} from './deltae';

interface PatchDef {
  name: string;
  srgb: Vec3;
}

/** 常被引用的 ColorChecker Classic 近似 sRGB 值（D65），不同资料略有出入 */
const PATCHES: PatchDef[] = [
  {name: '深肤色', srgb: [115, 82, 68]},
  {name: '浅肤色', srgb: [194, 150, 130]},
  {name: '天蓝', srgb: [98, 122, 157]},
  {name: '树叶', srgb: [87, 108, 67]},
  {name: '蓝花', srgb: [133, 128, 177]},
  {name: '蓝绿', srgb: [103, 189, 170]},
  {name: '橙', srgb: [214, 126, 44]},
  {name: '紫蓝', srgb: [80, 91, 166]},
  {name: '中红', srgb: [193, 90, 99]},
  {name: '紫', srgb: [94, 60, 108]},
  {name: '黄绿', srgb: [157, 188, 64]},
  {name: '橙黄', srgb: [224, 163, 46]},
  {name: '蓝', srgb: [56, 61, 150]},
  {name: '绿', srgb: [70, 148, 73]},
  {name: '红', srgb: [175, 54, 60]},
  {name: '黄', srgb: [231, 199, 31]},
  {name: '品红', srgb: [187, 86, 149]},
  {name: '青', srgb: [8, 133, 161]},
  {name: '白', srgb: [243, 243, 242]},
  {name: '灰 8', srgb: [200, 200, 200]},
  {name: '灰 6.5', srgb: [160, 160, 160]},
  {name: '灰 5', srgb: [122, 122, 122]},
  {name: '灰 3.5', srgb: [85, 85, 85]},
  {name: '黑', srgb: [52, 52, 52]}
];

// ---------- 反射率模型：Jakob–Hanika 风格的 sigmoid 多项式 ----------

const sigmoid = (x: number): number => 0.5 + x / (2 * Math.sqrt(1 + x * x));

const reflectance = (c: Vec3): Spectrum => WAVELENGTHS.map(l => {
  const t = (l - 380) / 400;
  return sigmoid((c[0] * t + c[1]) * t + c[2]);
});

const ILLUM_D65: Spectrum = D65;
const ILLUM_A: Spectrum = blackbody(2856);

const whiteXyz = (illum: Spectrum): Vec3 => spectrumXyz(illum);

/** 目标：sRGB 色块 → XYZ，再把 sRGB 的 D65 白换算到本模块用的 D65 白（Bradford） */
const targetXyz = (srgb: Vec3): Vec3 => {
  const lin = srgb.map(v => srgbToLinear(v / 255)) as Vec3;
  return adaptXyz(linearToXyz(lin), [0.95047, 1, 1.08883], whiteXyz(ILLUM_D65));
};

const xyzToLabSpec = (xyz: Vec3, white: Vec3): Vec3 => {
  const n = xyz.map((v, i) => Math.max(0, v) / white[i]) as Vec3;
  return xyzToLab([n[0] * 0.95047, n[1], n[2] * 1.08883]);
};

const solveLinear = (a: number[][], b: number[]): number[] => {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(m[r][i]) > Math.abs(m[p][i])) {
        p = r;
      }
    }
    [m[i], m[p]] = [m[p], m[i]];
    const d = m[i][i] || 1e-12;
    for (let r = i + 1; r < n; r++) {
      const f = m[r][i] / d;
      for (let c = i; c <= n; c++) {
        m[r][c] -= f * m[i][c];
      }
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = m[i][n];
    for (let c = i + 1; c < n; c++) {
      s -= m[i][c] * x[c];
    }
    x[i] = s / (m[i][i] || 1e-12);
  }
  return x;
};

interface PatchFit {
  coef: Vec3;
  refl: Spectrum;
  deltaE: number;
}

/** 对一个色块用 Levenberg–Marquardt 拟合 3 个系数，使 D65 下的 Lab 与目标接近 */
const fitPatch = (srgb: Vec3): PatchFit => {
  const white = whiteXyz(ILLUM_D65);
  const targetLab = xyzToLabSpec(targetXyz(srgb), white);
  const evalLab = (c: Vec3): Vec3 => xyzToLabSpec(spectrumXyz(ILLUM_D65, reflectance(c)), white);
  const residual = (c: Vec3): Vec3 => {
    const lab = evalLab(c);
    return [lab[0] - targetLab[0], lab[1] - targetLab[1], lab[2] - targetLab[2]];
  };

  let best: Vec3 = [0, 0, 0];
  let bestErr = Infinity;
  const starts: Vec3[] = [[0, 0, 0], [0, 0, -2], [0, 0, 2], [8, -8, 0], [-8, 8, 0], [-20, 20, -3], [20, -20, -3], [-30, 15, -3], [30, -45, 3]];
  starts.forEach(start => {
    let c: Vec3 = [...start] as Vec3;
    let lambda = 1e-2;
    let r = residual(c);
    let err = r[0] ** 2 + r[1] ** 2 + r[2] ** 2;
    for (let iter = 0; iter < 80 && err > 1e-8; iter++) {
      const jac: number[][] = [0, 1, 2].map(k => {
        const dc: Vec3 = [...c] as Vec3;
        const h = 1e-4 * Math.max(1, Math.abs(c[k]));
        dc[k] += h;
        const r2 = residual(dc);
        return [(r2[0] - r[0]) / h, (r2[1] - r[1]) / h, (r2[2] - r[2]) / h];
      });
      const jtj = [0, 1, 2].map(i => [0, 1, 2].map(j => {
        let s = 0;
        for (let k = 0; k < 3; k++) {
          s += jac[i][k] * jac[j][k];
        }
        return s + (i === j ? lambda * (1 + jac[i].reduce((a, v) => a + v * v, 0)) : 0);
      }));
      const jtr = [0, 1, 2].map(i => jac[i][0] * r[0] + jac[i][1] * r[1] + jac[i][2] * r[2]);
      const step = solveLinear(jtj, jtr.map(v => -v));
      const next = c.map((v, i) => v + step[i]) as Vec3;
      const rn = residual(next);
      const en = rn[0] ** 2 + rn[1] ** 2 + rn[2] ** 2;
      if (en < err) {
        c = next;
        r = rn;
        err = en;
        lambda = Math.max(lambda / 3, 1e-9);
      } else {
        lambda *= 4;
      }
    }
    if (err < bestErr) {
      bestErr = err;
      best = c;
    }
  });
  const refl = reflectance(best);
  const lab = evalLab(best);
  return {coef: best, refl, deltaE: deltaE2000(lab, targetLab)};
};

let fitCache: PatchFit[] | null = null;

const patchFits = (): PatchFit[] => {
  fitCache = fitCache || PATCHES.map(p => fitPatch(p.srgb));
  return fitCache;
};

// ---------- 相机光谱灵敏度 ----------

const CMFS: Vec3[] = WAVELENGTHS.map(cmf);

/** t = 0：灵敏度恰好是 CMF 的线性组合（相机 RGB 就是线性 sRGB，满足 Luther 条件）；t = 1：三条宽而重叠的高斯 */
const sensitivities = (t: number): [Spectrum, Spectrum, Spectrum] => {
  const m = xyzToLinear([1, 0, 0]).map((_, i) => [
    xyzToLinear([1, 0, 0])[i],
    xyzToLinear([0, 1, 0])[i],
    xyzToLinear([0, 0, 1])[i]
  ]);
  const luther = m.map(row => WAVELENGTHS.map((_, k) => row[0] * CMFS[k][0] + row[1] * CMFS[k][1] + row[2] * CMFS[k][2]));
  const peaks: [number, number, number][] = [[595, 42, 34], [540, 34, 38], [462, 26, 30]];
  const broad = peaks.map(([mu, s1, s2]) => WAVELENGTHS.map(l => gauss(l, mu, s1, s2)));
  // 让宽高斯的整体幅度与 Luther 通道同量级，方便线性混合
  const scaled = broad.map((row, i) => {
    const sumL = luther[i].reduce((a, v) => a + Math.max(0, v), 0);
    const sumB = row.reduce((a, v) => a + v, 0);
    return row.map(v => v * sumL / sumB);
  });
  return luther.map((row, i) => row.map((v, k) => (1 - t) * v + t * scaled[i][k])) as [Spectrum, Spectrum, Spectrum];
};

const rawResponse = (sens: [Spectrum, Spectrum, Spectrum], illum: Spectrum, refl?: Spectrum): Vec3 => {
  return sens.map(s => {
    let sum = 0;
    WAVELENGTHS.forEach((_, i) => {
      sum += s[i] * illum[i] * (refl ? refl[i] : 1);
    });
    return sum;
  }) as Vec3;
};

// ---------- 拟合 ----------

type ModelKey = 'wb' | 'm33' | 'm34' | 'poly';

const MODELS: {key: ModelKey; label: string; params: number}[] = [
  {key: 'wb', label: '只做白平衡', params: 0},
  {key: 'm33', label: '3×3 矩阵', params: 9},
  {key: 'm34', label: '3×4（含偏移）', params: 12},
  {key: 'poly', label: '二阶多项式 3×10', params: 30}
];

const features = (rgb: Vec3, key: ModelKey): number[] => {
  const [r, g, b] = rgb;
  if (key === 'm33') {
    return [r, g, b];
  }
  if (key === 'm34') {
    return [r, g, b, 1];
  }
  return [r, g, b, 1, r * r, g * g, b * b, r * g, g * b, r * b];
};

type Coeffs = number[][];

const leastSquares = (inputs: Vec3[], targets: Vec3[], key: ModelKey): Coeffs => {
  const rows = inputs.map(v => features(v, key));
  const n = rows[0].length;
  const ata = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => {
    let s = 0;
    rows.forEach(r => {
      s += r[i] * r[j];
    });
    return s + (i === j ? 1e-9 : 0);
  }));
  return [0, 1, 2].map(ch => {
    const atb = Array.from({length: n}, (_, i) => {
      let s = 0;
      rows.forEach((r, k) => {
        s += r[i] * targets[k][ch];
      });
      return s;
    });
    return solveLinear(ata, atb);
  });
};

const applyModel = (rgb: Vec3, key: ModelKey, coeffs: Coeffs | null): Vec3 => {
  if (key === 'wb' || !coeffs) {
    return rgb;
  }
  const f = features(rgb, key);
  return coeffs.map(row => row.reduce((a, v, i) => a + v * f[i], 0)) as Vec3;
};

const targetsLinear = (): Vec3[] => PATCHES.map(p => p.srgb.map(v => srgbToLinear(v / 255)) as Vec3);

const linearLab = (lin: Vec3): Vec3 => {
  return xyzToLab(linearToXyz(lin.map(v => Math.max(0, v)) as Vec3));
};

const whiteBalanced = (t: number, illum: Spectrum): Vec3[] => {
  const sens = sensitivities(t);
  const wp = rawResponse(sens, illum);
  const fits = patchFits();
  return fits.map(f => {
    const raw = rawResponse(sens, illum, f.refl);
    // 把白平衡后的最大通道对到完美漫反射白 = 1，目标白块约 0.9，所以整体乘 1 即可
    return raw.map((v, i) => v / wp[i]) as Vec3;
  });
};

interface MethodResult {
  key: ModelKey;
  label: string;
  params: number;
  corrected: Vec3[];
  deltaE: number[];
  mean: number;
  max: number;
}

const evaluate = (inputs: Vec3[], coeffsByKey: Record<string, Coeffs | null>): MethodResult[] => {
  const targets = targetsLinear();
  const targetLabs = targets.map(linearLab);
  return MODELS.map(m => {
    const corrected = inputs.map(v => applyModel(v, m.key, coeffsByKey[m.key]));
    const deltaE = corrected.map((c, i) => deltaE2000(linearLab(c), targetLabs[i]));
    return {
      key: m.key,
      label: m.label,
      params: m.params,
      corrected,
      deltaE,
      mean: deltaE.reduce((a, v) => a + v, 0) / deltaE.length,
      max: Math.max(...deltaE)
    };
  });
};

interface CameraResult {
  patchFitMean: number;
  patchFitMax: number;
  atD65: MethodResult[];
  atEval: MethodResult[];
  refitAtEval: MethodResult[];
}

const fitAll = (inputs: Vec3[]): Record<string, Coeffs | null> => {
  const targets = targetsLinear();
  return {
    wb: null,
    m33: leastSquares(inputs, targets, 'm33'),
    m34: leastSquares(inputs, targets, 'm34'),
    poly: leastSquares(inputs, targets, 'poly')
  };
};

const runCamera = (t: number, evalIllum: 'D65' | 'A'): CameraResult => {
  const fits = patchFits();
  const inD65 = whiteBalanced(t, ILLUM_D65);
  const coeffs = fitAll(inD65);
  const atD65 = evaluate(inD65, coeffs);
  const evalSpec = evalIllum === 'A' ? ILLUM_A : ILLUM_D65;
  const inEval = whiteBalanced(t, evalSpec);
  const atEval = evaluate(inEval, coeffs);
  const refitAtEval = evaluate(inEval, fitAll(inEval));
  return {
    patchFitMean: fits.reduce((a, f) => a + f.deltaE, 0) / fits.length,
    patchFitMax: Math.max(...fits.map(f => f.deltaE)),
    atD65,
    atEval,
    refitAtEval
  };
};

const toSrgb8 = (lin: Vec3): Vec3 => lin.map(v => Math.round(Math.min(1, Math.max(0, linearToSrgb(Math.max(0, v)))) * 255)) as Vec3;

export {
  PATCHES,
  MODELS,
  ModelKey,
  MethodResult,
  CameraResult,
  patchFits,
  sensitivities,
  runCamera,
  toSrgb8,
  targetsLinear
};
