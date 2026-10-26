import type {Vec3} from './space';
import {D65, spectralLocus, xyToXyz, xyzToXy, planck, cmf} from './cie';
import type {Point} from './cie';

/** 等能白点 E */
const E_WHITE: Point = [1 / 3, 1 / 3];

interface Light {
  xy: Point;
  Y: number;
}

/** 单个光源的 XYZ：色度 (x, y) 加亮度 Y */
const lightXyz = ({xy, Y}: Light): Vec3 => {
  const v = xyToXyz(xy[0], xy[1]);
  return [v[0] * Y, Y, v[2] * Y];
};

/** 多束光的叠加：XYZ 直接相加（Grassmann 的叠加性与亮度可加性） */
const mixLights = (lights: Light[]): {xyz: Vec3; xy: Point; Y: number} => {
  const xyz: Vec3 = [0, 0, 0];
  lights.forEach(light => {
    const v = lightXyz(light);
    xyz[0] += v[0];
    xyz[1] += v[1];
    xyz[2] += v[2];
  });
  return {xyz, xy: xyzToXy(xyz), Y: xyz[1]};
};

/** 重心公式：x = Σ(x_i·Y_i/y_i) / Σ(Y_i/y_i)，与 XYZ 相加等价 */
const centroid = (lights: Light[]): Point => {
  let sw = 0;
  let sx = 0;
  let sy = 0;
  lights.forEach(({xy, Y}) => {
    const w = Y / xy[1];
    sw += w;
    sx += xy[0] * w;
    sy += xy[1] * w;
  });
  return [sx / sw, sy / sw];
};

const LOCUS = spectralLocus(380, 700, 1);

/** 射线 o + t·d 与线段 a→b 相交：返回 t 与线段内参数 s */
const raySegment = (o: Point, d: Point, a: Point, b: Point): {t: number; s: number} | null => {
  const ex = b[0] - a[0];
  const ey = b[1] - a[1];
  const det = -d[0] * ey + ex * d[1];
  if (Math.abs(det) < 1e-14) {
    return null;
  }
  const rx = a[0] - o[0];
  const ry = a[1] - o[1];
  const t = (-rx * ey + ex * ry) / det;
  const s = (d[0] * ry - d[1] * rx) / det;
  if (t > 1e-9 && s >= -1e-9 && s <= 1 + 1e-9) {
    return {t, s};
  }
  return null;
};

interface Hit {
  wavelength: number | null;
  purple: boolean;
  point: Point;
}

/** 从白点沿方向 d 射出，求与光谱轨迹（含紫线）的交点 */
const castRay = (white: Point, d: Point): Hit | null => {
  for (let i = 0; i < LOCUS.length - 1; i++) {
    const r = raySegment(white, d, LOCUS[i], LOCUS[i + 1]);
    if (r) {
      return {
        wavelength: 380 + i + r.s,
        purple: false,
        point: [white[0] + d[0] * r.t, white[1] + d[1] * r.t]
      };
    }
  }
  const r = raySegment(white, d, LOCUS[LOCUS.length - 1], LOCUS[0]);
  if (r) {
    return {wavelength: null, purple: true, point: [white[0] + d[0] * r.t, white[1] + d[1] * r.t]};
  }
  return null;
};

interface Dominant {
  wavelength: number | null;
  complementary: boolean;
  purity: number;
  hit: Point;
  opposite: Point | null;
}

/**
 * 主波长与兴奋纯度：白点 W 到样品点 P 的射线与光谱轨迹的交点 D 决定主波长，purity = |P−W| / |D−W|。
 * 射线落到紫线上时没有主波长，改用反向射线求补色波长，纯度相对紫线上的交点计算。
 */
const dominantWavelength = (p: Point, white: Point = D65): Dominant => {
  const d: Point = [p[0] - white[0], p[1] - white[1]];
  const len = Math.hypot(d[0], d[1]);
  if (len < 1e-9) {
    return {wavelength: null, complementary: false, purity: 0, hit: white, opposite: null};
  }
  const hit = castRay(white, d);
  if (!hit) {
    return {wavelength: null, complementary: false, purity: NaN, hit: white, opposite: null};
  }
  const purity = len / Math.hypot(hit.point[0] - white[0], hit.point[1] - white[1]);
  if (!hit.purple) {
    return {wavelength: hit.wavelength, complementary: false, purity, hit: hit.point, opposite: null};
  }
  const back = castRay(white, [-d[0], -d[1]]);
  return {
    wavelength: back ? back.wavelength : null,
    complementary: true,
    purity,
    hit: hit.point,
    opposite: back ? back.point : null
  };
};

// ---------- CIE 1960 UCS 与 Duv ----------

const xyToUv = ([x, y]: Point): Point => {
  const d = -2 * x + 12 * y + 3;
  return [4 * x / d, 6 * y / d];
};

const uvToXy = ([u, v]: Point): Point => {
  const d = 2 * u - 8 * v + 4;
  return [3 * u / d, 2 * v / d];
};

/** 黑体在 (u, v) 上的位置，T 单位 K；不缓存，避免连续取值时撑大内存 */
const planckianUv = (t: number): Point => {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let l = 380; l <= 780; l += 5) {
    const p = planck(l, t);
    const [cx, cy, cz] = cmf(l);
    x += p * cx;
    y += p * cy;
    z += p * cz;
  }
  return xyToUv(xyzToXy([x, y, z]));
};

/** 黑体轨迹上 T 处向“上方”（+v，偏绿一侧）的单位法线 */
const planckianNormal = (t: number): Point => {
  const dt = Math.max(1, t * 1e-3);
  const a = planckianUv(t - dt);
  const b = planckianUv(t + dt);
  const tu = b[0] - a[0];
  const tv = b[1] - a[1];
  const len = Math.hypot(tu, tv);
  let n: Point = [-tv / len, tu / len];
  if (n[1] < 0) {
    n = [-n[0], -n[1]];
  }
  return n;
};

/** 由 (CCT, Duv) 求 (u, v)：黑体点沿法线移动 Duv */
const cctDuvToUv = (t: number, duv: number): Point => {
  const l = planckianUv(t);
  const n = planckianNormal(t);
  return [l[0] + n[0] * duv, l[1] + n[1] * duv];
};

const cctDuvToXy = (t: number, duv: number): Point => uvToXy(cctDuvToUv(t, duv));

const distToLocus = (uv: Point, t: number): number => {
  const l = planckianUv(t);
  return Math.hypot(uv[0] - l[0], uv[1] - l[1]);
};

/** 由 (u, v) 求 (CCT, Duv)：在黑体轨迹上找最近点，Duv 在 v 更大的一侧为正 */
const uvToCctDuv = (uv: Point): {cct: number; duv: number} => {
  const steps = 240;
  const lo = Math.log(1000);
  const hi = Math.log(40000);
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i <= steps; i++) {
    const t = Math.exp(lo + (hi - lo) * i / steps);
    const d = distToLocus(uv, t);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  let a = Math.exp(lo + (hi - lo) * Math.max(0, best - 1) / steps);
  let b = Math.exp(lo + (hi - lo) * Math.min(steps, best + 1) / steps);
  const g = (Math.sqrt(5) - 1) / 2;
  let c = b - g * (b - a);
  let d = a + g * (b - a);
  for (let i = 0; i < 40; i++) {
    if (distToLocus(uv, c) < distToLocus(uv, d)) {
      b = d;
    } else {
      a = c;
    }
    c = b - g * (b - a);
    d = a + g * (b - a);
  }
  const cct = (a + b) / 2;
  const l = planckianUv(cct);
  const n = planckianNormal(cct);
  const duv = (uv[0] - l[0]) * n[0] + (uv[1] - l[1]) * n[1];
  return {cct, duv};
};

const xyToCctDuv = (xy: Point): {cct: number; duv: number} => uvToCctDuv(xyToUv(xy));

/** McCamy 近似公式（仅在黑体附近、2000–12500 K 较准） */
const mccamyCct = ([x, y]: Point): number => {
  const n = (x - 0.3320) / (0.1858 - y);
  return 449 * n ** 3 + 3525 * n ** 2 + 6823.3 * n + 5520.33;
};

export {
  E_WHITE,
  Light,
  Dominant,
  lightXyz,
  mixLights,
  centroid,
  dominantWavelength,
  castRay,
  xyToUv,
  uvToXy,
  planckianUv,
  planckianNormal,
  cctDuvToUv,
  cctDuvToXy,
  uvToCctDuv,
  xyToCctDuv,
  mccamyCct
};
