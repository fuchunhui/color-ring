import {D65, WAVELENGTHS, blackbody, rgbCss, spectrumXyz, text, xyzToSrgb} from '../utils/spectral';
import type {Spectrum} from '../utils/spectral';
import {linearToXyz, srgbToLinear, xyzToLab} from '../utils/space';
import type {Vec3} from '../utils/space';
import {deltaE2000} from '../utils/deltae';
import {CATS, adaptWith, coneRelative} from '../utils/colorman';
import type {CatKey} from '../utils/colorman';
import {wavelengthToXyz} from '../utils/cie';

interface Patch {
  name: string;
  rgb: Vec3;
}

/** ColorChecker 24 色卡的近似 sRGB 值（常见的网上通用取值，不是官方测量数据） */
const PATCHES: Patch[] = [
  {name: '深肤色', rgb: [115, 82, 68]}, {name: '浅肤色', rgb: [194, 150, 130]},
  {name: '天蓝', rgb: [98, 122, 157]}, {name: '树叶绿', rgb: [87, 108, 67]},
  {name: '蓝花', rgb: [133, 128, 177]}, {name: '蓝绿', rgb: [103, 189, 170]},
  {name: '橙', rgb: [214, 126, 44]}, {name: '紫蓝', rgb: [80, 91, 166]},
  {name: '中等红', rgb: [193, 90, 99]}, {name: '紫', rgb: [94, 60, 108]},
  {name: '黄绿', rgb: [157, 188, 64]}, {name: '橙黄', rgb: [224, 163, 46]},
  {name: '蓝', rgb: [56, 61, 150]}, {name: '绿', rgb: [70, 148, 73]},
  {name: '红', rgb: [175, 54, 60]}, {name: '黄', rgb: [231, 199, 31]},
  {name: '品红', rgb: [187, 86, 149]}, {name: '青', rgb: [8, 133, 161]},
  {name: '白', rgb: [243, 243, 242]}, {name: '中性灰 8', rgb: [200, 200, 200]},
  {name: '中性灰 6.5', rgb: [160, 160, 160]}, {name: '中性灰 5', rgb: [122, 122, 121]},
  {name: '中性灰 3.5', rgb: [85, 85, 85]}, {name: '黑', rgb: [52, 52, 52]}
];

// ---------- 用平滑函数从 sRGB 反推一条反射率曲线 ----------

type Point3 = [number, number, number];

const nelderMead = (f: (x: Point3) => number, start: Point3, step: number, iterations: number): {x: Point3; value: number} => {
  const n = 3;
  let simplex: {x: Point3; v: number}[] = [{x: start, v: f(start)}];
  for (let i = 0; i < n; i++) {
    const x = [...start] as Point3;
    x[i] += step;
    simplex.push({x, v: f(x)});
  }
  for (let it = 0; it < iterations; it++) {
    simplex.sort((a, b) => a.v - b.v);
    const best = simplex[0];
    const worst = simplex[n];
    const centroid = [0, 1, 2].map(j => simplex.slice(0, n).reduce((s, p) => s + p.x[j], 0) / n) as Point3;
    const move = (k: number): Point3 => centroid.map((c, j) => c + k * (worst.x[j] - c)) as Point3;
    const reflected = move(-1);
    const fr = f(reflected);
    if (fr < best.v) {
      const expanded = move(-2);
      const fe = f(expanded);
      simplex[n] = fe < fr ? {x: expanded, v: fe} : {x: reflected, v: fr};
    } else if (fr < simplex[n - 1].v) {
      simplex[n] = {x: reflected, v: fr};
    } else {
      const contracted = move(fr < worst.v ? -0.5 : 0.5);
      const fc = f(contracted);
      if (fc < Math.min(fr, worst.v)) {
        simplex[n] = {x: contracted, v: fc};
      } else {
        simplex = simplex.map((p, i) => {
          if (i === 0) {
            return p;
          }
          const x = p.x.map((v, j) => best.x[j] + 0.5 * (v - best.x[j])) as Point3;
          return {x, v: f(x)};
        });
      }
    }
  }
  simplex.sort((a, b) => a.v - b.v);
  return {x: simplex[0].x, value: simplex[0].v};
};

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

const reflectanceOf = (c: Point3): Spectrum => {
  return WAVELENGTHS.map(l => {
    const u = (l - 380) / 400;
    return sigmoid(c[0] * u * u + c[1] * u + c[2]);
  });
};

const D65_WHITE = spectrumXyz(D65);
const SRGB_WHITE = linearToXyz([1, 1, 1]);

const patchTarget = (rgb: Vec3): Vec3 => {
  const xyz = linearToXyz(rgb.map(v => srgbToLinear(v / 255)) as Vec3);
  return xyz.map((v, i) => v * D65_WHITE[i] / SRGB_WHITE[i]) as Vec3;
};

interface FittedPatch extends Patch {
  reflectance: Spectrum;
  fitError: number;
  truth: Vec3;
}

const fitPatch = (patch: Patch): FittedPatch => {
  const target = patchTarget(patch.rgb);
  const loss = (c: Point3): number => {
    const xyz = spectrumXyz(D65, reflectanceOf(c));
    return xyz.reduce((s, v, i) => s + (v - target[i]) ** 2, 0);
  };
  const y = Math.min(0.97, Math.max(0.02, target[1]));
  const base = Math.log(y / (1 - y));
  let best = {x: [0, 0, base] as Point3, value: Infinity};
  [[0, 0], [8, -8], [-8, 8], [16, -16], [-16, 16]].forEach(([a, b]) => {
    const result = nelderMead(loss, [a, b, base], 2, 500);
    if (result.value < best.value) {
      best = result;
    }
  });
  const reflectance = reflectanceOf(best.x);
  return {...patch, reflectance, fitError: Math.sqrt(best.value), truth: spectrumXyz(D65, reflectance)};
};

let fitted: FittedPatch[] | null = null;

const fittedPatches = (): FittedPatch[] => {
  if (!fitted) {
    fitted = PATCHES.map(fitPatch);
  }
  return fitted;
};

// ---------- 光源与分析 ----------

interface Source {
  key: string;
  label: string;
}

const SOURCES: Source[] = [
  {key: 'a', label: 'A 钨丝灯（2856K 黑体）'},
  {key: 'd50', label: 'D50 近似（5003K 黑体）'},
  {key: 'd65', label: 'D65 日光（目标白点本身）'},
  {key: 'custom', label: '自定义色温（黑体）'}
];

const sourceSpectrum = (key: string, cct: number): Spectrum => {
  switch (key) {
    case 'a':
      return blackbody(2856);
    case 'd50':
      return blackbody(5003);
    case 'd65':
      return D65;
    default:
      return blackbody(cct);
  }
};

interface Analysis {
  whiteSrc: Vec3;
  /** 每个色块：光源下的 XYZ、D65 下的真实 XYZ、各方法适应后的 XYZ */
  patches: {
    name: string;
    source: Vec3;
    truth: Vec3;
    adapted: Record<CatKey, Vec3>;
  }[];
  stats: {key: CatKey; label: string; meanTruth: number; maxTruth: number; meanBradford: number}[];
}

const lab = (xyz: Vec3): Vec3 => xyzToLab(xyz);

const analyse = (sourceKey: string, cct: number): Analysis => {
  const spd = sourceSpectrum(sourceKey, cct);
  const whiteSrc = spectrumXyz(spd);
  const patches = fittedPatches().map(p => {
    const source = spectrumXyz(spd, p.reflectance);
    const adapted = {} as Record<CatKey, Vec3>;
    CATS.forEach(c => {
      adapted[c.key] = adaptWith(source, whiteSrc, D65_WHITE, c.key);
    });
    return {name: p.name, source, truth: p.truth, adapted};
  });
  const stats = CATS.map(c => {
    const toTruth = patches.map(p => deltaE2000(lab(p.adapted[c.key]), lab(p.truth)));
    const toBradford = patches.map(p => deltaE2000(lab(p.adapted[c.key]), lab(p.adapted.bradford)));
    const mean = (list: number[]): number => list.reduce((s, v) => s + v, 0) / list.length;
    return {
      key: c.key,
      label: c.label,
      meanTruth: mean(toTruth),
      maxTruth: Math.max(...toTruth),
      meanBradford: mean(toBradford)
    };
  });
  return {whiteSrc, patches, stats};
};

// ---------- 绘制 ----------

const CELL = 30;
const GAP = 2;
const PATCH_W = 6 * (CELL + GAP) + GAP;
const PATCH_H = 4 * (CELL + GAP) + GAP;

const drawPatches = (ctx: CanvasRenderingContext2D, colors: Vec3[]): void => {
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, PATCH_W, PATCH_H);
  colors.forEach((rgb, i) => {
    const col = i % 6;
    const row = Math.floor(i / 6);
    ctx.fillStyle = rgbCss(rgb);
    ctx.fillRect(GAP + col * (CELL + GAP), GAP + row * (CELL + GAP), CELL, CELL);
  });
};

const METHOD_COLORS: Record<string, string> = {
  xyz: '#868E96',
  vonkries: '#2F9E44',
  bradford: '#1971C2',
  cat02: '#E8590C',
  cat16: '#9C36B5',
  truth: '#111111',
  source: '#CED4DA'
};

const XY_W = 520;
const XY_H = 360;

const xyOf = (xyz: Vec3): [number, number] => {
  const s = xyz[0] + xyz[1] + xyz[2];
  return [xyz[0] / s, xyz[1] / s];
};

/** 放大到所选色块附近：灰点是未适应的光源下颜色，黑圈是真实的 D65 下颜色，彩色点是各方法的结果 */
const drawXyZoom = (ctx: CanvasRenderingContext2D, analysis: Analysis, index: number): void => {
  const p = analysis.patches[index];
  const entries: {key: string; label: string; xy: [number, number]}[] = [
    {key: 'source', label: '光源下', xy: xyOf(p.source)},
    {key: 'truth', label: '真实(D65)', xy: xyOf(p.truth)},
    ...CATS.map(c => ({key: c.key as string, label: c.label, xy: xyOf(p.adapted[c.key])}))
  ];
  const adaptedPts = entries.filter(e => e.key !== 'source').map(e => e.xy);
  const xs = adaptedPts.map(v => v[0]);
  const ys = adaptedPts.map(v => v[1]);
  const span = Math.max(0.004, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 1.8;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const area = {x: 60, y: 24, w: 300, h: 300};
  const toPx = ([x, y]: [number, number]): [number, number] => [
    area.x + (x - cx) / span * area.w + area.w / 2,
    area.y + area.h / 2 - (y - cy) / span * area.h
  ];
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(area.x, area.y, area.w, area.h);
  ctx.strokeStyle = '#DDD';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const gx = area.x + i * area.w / 4;
    const gy = area.y + i * area.h / 4;
    ctx.beginPath();
    ctx.moveTo(gx + 0.5, area.y);
    ctx.lineTo(gx + 0.5, area.y + area.h);
    ctx.moveTo(area.x, gy + 0.5);
    ctx.lineTo(area.x + area.w, gy + 0.5);
    ctx.stroke();
    text(ctx, (cx - span / 2 + span * i / 4).toFixed(4), gx, area.y + area.h + 12, 'center', '#555', '10px sans-serif');
    text(ctx, (cy + span / 2 - span * i / 4).toFixed(4), area.x - 4, gy, 'right', '#555', '10px sans-serif');
  }
  text(ctx, `x（${p.name}，坐标范围 ${span.toFixed(4)}）`, area.x + area.w / 2, area.y + area.h + 26, 'center', '#333', '11px sans-serif');
  text(ctx, 'y', area.x - 40, area.y + area.h / 2, 'center', '#333', '11px sans-serif');
  entries.forEach(e => {
    const [px, py] = toPx(e.xy);
    if (px < area.x || px > area.x + area.w || py < area.y || py > area.y + area.h) {
      return;
    }
    ctx.beginPath();
    ctx.arc(px, py, e.key === 'truth' ? 8 : 5, 0, Math.PI * 2);
    if (e.key === 'truth') {
      ctx.lineWidth = 2;
      ctx.strokeStyle = METHOD_COLORS.truth;
      ctx.stroke();
    } else {
      ctx.fillStyle = METHOD_COLORS[e.key];
      ctx.fill();
    }
  });
  entries.forEach((e, i) => {
    const y = area.y + 12 + i * 20;
    ctx.beginPath();
    ctx.arc(area.x + area.w + 24, y, e.key === 'truth' ? 6 : 5, 0, Math.PI * 2);
    if (e.key === 'truth') {
      ctx.lineWidth = 2;
      ctx.strokeStyle = METHOD_COLORS.truth;
      ctx.stroke();
    } else {
      ctx.fillStyle = METHOD_COLORS[e.key];
      ctx.fill();
    }
    text(ctx, e.label, area.x + area.w + 36, y, 'left', '#333', '12px sans-serif');
  });
};

interface ConeRow {
  label: string;
  values: Record<CatKey, Vec3>;
}

const spectralBlue = (): Vec3 => {
  const xyz = wavelengthToXyz(450);
  return xyz.map(v => v / xyz[1]) as Vec3;
};

/** 若干样本在各矩阵下的锐化视锥响应（相对 D65 白点），负值说明该矩阵对这种颜色“越界”了 */
const coneRows = (patchXyz: Vec3, patchName: string): ConeRow[] => {
  const samples: {label: string; xyz: Vec3}[] = [
    {label: `所选色块：${patchName}`, xyz: patchXyz},
    {label: 'sRGB 纯蓝 #0000FF', xyz: linearToXyz([0, 0, 1])},
    {label: '450nm 单色光', xyz: spectralBlue()}
  ];
  return samples.map(s => {
    const values = {} as Record<CatKey, Vec3>;
    CATS.forEach(c => {
      values[c.key] = coneRelative(s.xyz, D65_WHITE, c.key);
    });
    return {label: s.label, values};
  });
};

const srgbOf = (xyz: Vec3): Vec3 => xyzToSrgb(xyz);

export {
  PATCHES,
  SOURCES,
  PATCH_W,
  PATCH_H,
  XY_W,
  XY_H,
  METHOD_COLORS,
  D65_WHITE,
  fittedPatches,
  analyse,
  drawPatches,
  drawXyZoom,
  coneRows,
  srgbOf
};
export type {Analysis, ConeRow};
