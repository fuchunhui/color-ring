/**
 * CAM16 色貌模型（Li 等 2017）、CAM16-UCS，以及 HDR 相关的 PQ / HLG / Jzazbz / ICtCp。
 * 这里是计算器 / 演示实现，不是完整的色彩管理流程。
 */
import {Vec3} from './space';

type Surround = 'average' | 'dim' | 'dark';
type Mat3 = [Vec3, Vec3, Vec3];

const M16: Mat3 = [
  [0.401288, 0.650173, -0.051461],
  [-0.250268, 1.204414, 0.045854],
  [-0.002079, 0.048952, 0.953127]
];

const mul = (m: Mat3, v: Vec3): Vec3 => m.map(row => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) as Vec3;

const invert = (m: Mat3): Mat3 => {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  return [
    [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
    [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
    [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det]
  ];
};

const M16_INV = invert(M16);

const SURROUNDS: Record<Surround, {c: number; nc: number; f: number}> = {
  average: {c: 0.69, nc: 1, f: 1},
  dim: {c: 0.59, nc: 0.9, f: 0.9},
  dark: {c: 0.525, nc: 0.8, f: 0.8}
};

interface Viewing {
  c: number;
  nc: number;
  fl: number;
  n: number;
  z: number;
  nbb: number;
  ncb: number;
  dRgb: Vec3;
  aw: number;
  d: number;
}

const RAD = Math.PI / 180;

const adapt = (v: number, fl: number): number => {
  const t = (fl * Math.abs(v) / 100) ** 0.42;
  return Math.sign(v) * 400 * t / (27.13 + t);
};

/** whiteXyz 按 Y = 100 归一；la 为适应亮度（cd/m²）；yb 为背景相对亮度（Y 为 100 的白） */
const makeViewing = (whiteXyz: Vec3, la: number, yb: number, surround: Surround): Viewing => {
  const {c, nc, f} = SURROUNDS[surround];
  const k = 1 / (5 * la + 1);
  const fl = 0.2 * k ** 4 * (5 * la) + 0.1 * (1 - k ** 4) ** 2 * (5 * la) ** (1 / 3);
  const n = yb / whiteXyz[1];
  const z = 1.48 + Math.sqrt(n);
  const nbb = 0.725 * (1 / n) ** 0.2;
  const d = Math.min(1, Math.max(0, f * (1 - (1 / 3.6) * Math.exp((-la - 42) / 92))));
  const rgbW = mul(M16, whiteXyz);
  const dRgb = rgbW.map(v => d * whiteXyz[1] / v + 1 - d) as Vec3;
  const rgbAw = rgbW.map((v, i) => adapt(dRgb[i] * v, fl) + 0.1);
  const aw = (2 * rgbAw[0] + rgbAw[1] + 0.05 * rgbAw[2] - 0.305) * nbb;
  return {c, nc, fl, n, z, nbb, ncb: nbb, dRgb, aw, d};
};

interface Cam16 {
  J: number;
  C: number;
  h: number;
  M: number;
  s: number;
  Q: number;
}

const TERM = (n: number): number => (1.64 - 0.29 ** n) ** 0.73;

const xyzToCam16 = (xyz: Vec3, v: Viewing): Cam16 => {
  const rgb = mul(M16, xyz);
  const [ra, ga, ba] = rgb.map((x, i) => adapt(v.dRgb[i] * x, v.fl) + 0.1);
  const a = ra - 12 * ga / 11 + ba / 11;
  const b = (ra + ga - 2 * ba) / 9;
  const hDeg = (Math.atan2(b, a) / RAD + 360) % 360;
  const et = 0.25 * (Math.cos(hDeg * RAD + 2) + 3.8);
  const A = (2 * ra + ga + 0.05 * ba - 0.305) * v.nbb;
  const J = A > 0 ? 100 * (A / v.aw) ** (v.c * v.z) : 0;
  const Q = 4 / v.c * Math.sqrt(J / 100) * (v.aw + 4) * v.fl ** 0.25;
  const denom = ra + ga + 21 / 20 * ba;
  const t = denom === 0 ? 0 : 50000 / 13 * v.nc * v.ncb * et * Math.hypot(a, b) / denom;
  const C = t ** 0.9 * Math.sqrt(J / 100) * TERM(v.n);
  const M = C * v.fl ** 0.25;
  const s = Q === 0 ? 0 : 100 * Math.sqrt(M / Q);
  return {J, C, h: hDeg, M, s, Q};
};

const cam16ToXyz = (J: number, C: number, hDeg: number, v: Viewing): Vec3 => {
  if (J <= 0) {
    return [0, 0, 0];
  }
  const t = (C / (Math.sqrt(J / 100) * TERM(v.n))) ** (1 / 0.9);
  const hr = hDeg * RAD;
  const et = 0.25 * (Math.cos(hr + 2) + 3.8);
  const A = v.aw * (J / 100) ** (1 / (v.c * v.z));
  const p1 = t === 0 ? 0 : 50000 / 13 * v.nc * v.ncb * et / t;
  const p2 = A / v.nbb + 0.305;
  const p3 = 21 / 20;
  const sin = Math.sin(hr);
  const cos = Math.cos(hr);
  let a = 0;
  let b = 0;
  if (t !== 0) {
    if (Math.abs(sin) >= Math.abs(cos)) {
      const p4 = p1 / sin;
      b = p2 * (2 + p3) * (460 / 1403) / (p4 + (2 + p3) * (220 / 1403) * (cos / sin) - 27 / 1403 + p3 * (6300 / 1403));
      a = b * cos / sin;
    } else {
      const p5 = p1 / cos;
      a = p2 * (2 + p3) * (460 / 1403) / (p5 + (2 + p3) * (220 / 1403) - (27 / 1403 - p3 * (6300 / 1403)) * (sin / cos));
      b = a * sin / cos;
    }
  }
  const ra = (460 * p2 + 451 * a + 288 * b) / 1403;
  const ga = (460 * p2 - 891 * a - 261 * b) / 1403;
  const ba = (460 * p2 - 220 * a - 6300 * b) / 1403;
  const rgb = [ra, ga, ba].map((x, i) => {
    const d = Math.abs(x - 0.1);
    const comp = Math.sign(x - 0.1) * 100 / v.fl * (27.13 * d / (400 - d)) ** (1 / 0.42);
    return comp / v.dRgb[i];
  }) as Vec3;
  return mul(M16_INV, rgb);
};

/** CAM16-UCS：J'、a'、b' */
const toUcs = ({J, M, h}: Cam16): Vec3 => {
  const jp = 1.7 * J / (1 + 0.007 * J);
  const mp = Math.log(1 + 0.0228 * M) / 0.0228;
  return [jp, mp * Math.cos(h * RAD), mp * Math.sin(h * RAD)];
};

/** 由 UCS 的 J'、M'、色相还原 XYZ（M' 即 UCS 中的色度半径） */
const ucsToXyz = (jp: number, mp: number, hDeg: number, v: Viewing): Vec3 => {
  const J = jp / (1.7 - 0.007 * jp);
  const M = (Math.exp(0.0228 * mp) - 1) / 0.0228;
  return cam16ToXyz(J, M / v.fl ** 0.25, hDeg, v);
};

export {
  Surround,
  Viewing,
  Cam16,
  makeViewing,
  xyzToCam16,
  cam16ToXyz,
  toUcs,
  ucsToXyz
};
