import {Vec3, rgbToXyz} from './space';

const WHITE: Vec3 = [0.95047, 1, 1.08883];
const EPSILON = 216 / 24389;
const KAPPA = 24389 / 27;

/** CIE 1976 UCS 色度坐标 (u', v') */
const xyzToUv = ([x, y, z]: Vec3): [number, number] => {
  const d = x + 15 * y + 3 * z;
  return d ? [4 * x / d, 9 * y / d] : [0, 0];
};

const xyToUv = (x: number, y: number): [number, number] => {
  const d = -2 * x + 12 * y + 3;
  return [4 * x / d, 9 * y / d];
};

const uvToXy = (u: number, v: number): [number, number] => {
  const d = 6 * u - 16 * v + 12;
  return [9 * u / d, 4 * v / d];
};

const [REF_U, REF_V] = xyzToUv(WHITE);

const xyzToLuv = (xyz: Vec3): Vec3 => {
  const yr = xyz[1] / WHITE[1];
  const l = yr > EPSILON ? 116 * Math.cbrt(yr) - 16 : KAPPA * yr;
  if (l === 0) {
    return [0, 0, 0];
  }
  const [u, v] = xyzToUv(xyz);
  return [l, 13 * l * (u - REF_U), 13 * l * (v - REF_V)];
};

const luvToXyz = ([l, us, vs]: Vec3): Vec3 => {
  if (l <= 0) {
    return [0, 0, 0];
  }
  const u = us / (13 * l) + REF_U;
  const v = vs / (13 * l) + REF_V;
  const y = (l > KAPPA * EPSILON ? ((l + 16) / 116) ** 3 : l / KAPPA) * WHITE[1];
  const x = y * 9 * u / (4 * v);
  const z = y * (12 - 3 * u - 20 * v) / (4 * v);
  return [x, y, z];
};

const rgbToLuv = (rgb: Vec3): Vec3 => xyzToLuv(rgbToXyz(rgb));

const luvToLch = ([l, u, v]: Vec3): Vec3 => {
  const h = Math.atan2(v, u) * 180 / Math.PI;
  return [l, Math.hypot(u, v), h < 0 ? h + 360 : h];
};

/** CIELUV 色差（欧氏距离） */
const deltaEuv = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export {
  xyzToUv,
  xyToUv,
  uvToXy,
  xyzToLuv,
  luvToXyz,
  rgbToLuv,
  luvToLch,
  deltaEuv
};
