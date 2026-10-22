/**
 * HDR 相关：PQ（SMPTE ST 2084）、HLG、Jzazbz、ICtCp。亮度均为绝对值 cd/m²。
 */
import {Vec3, rgbToLinear, linearToXyz} from './space';

const M1 = 2610 / 16384;
const M2 = 2523 / 4096 * 128;
const C1 = 3424 / 4096;
const C2 = 2413 / 4096 * 32;
const C3 = 2392 / 4096 * 32;

/** 绝对亮度 cd/m²（0~10000）→ PQ 编码值（0~1） */
const pqEncode = (nits: number): number => {
  const p = (Math.max(nits, 0) / 10000) ** M1;
  return ((C1 + C2 * p) / (1 + C3 * p)) ** M2;
};

const pqDecode = (e: number): number => {
  const p = Math.max(e, 0) ** (1 / M2);
  return 10000 * (Math.max(p - C1, 0) / (C2 - C3 * p)) ** (1 / M1);
};

const HLG_A = 0.17883277;
const HLG_B = 0.28466892;
const HLG_C = 0.55991073;

/** HLG OETF：场景线性光 E（0~1）→ 编码值 */
const hlgOetf = (e: number): number => {
  return e <= 1 / 12 ? Math.sqrt(3 * e) : HLG_A * Math.log(12 * e - HLG_B) + HLG_C;
};

const mulRow = (m: number[][], v: Vec3): Vec3 => m.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]) as Vec3;

const JZ_N = 2610 / 16384;
const JZ_P = 1.7 * 2523 / 32;
const JZ_C1 = 3424 / 4096;
const JZ_C2 = 2413 / 128;
const JZ_C3 = 2392 / 128;
const JZ_D = -0.56;
const JZ_D0 = 1.62954995328215e-11;

const JZ_M1 = [
  [0.41478972, 0.579999, 0.014648],
  [-0.20151, 1.120649, 0.0531008],
  [-0.0166008, 0.2648, 0.6684799]
];
const JZ_M2 = [
  [0.5, 0.5, 0],
  [3.524, -4.066708, 0.542708],
  [0.199076, 1.096799, -1.295875]
];

const jzPq = (x: number): number => {
  const p = (Math.max(x, 0) / 10000) ** JZ_N;
  return ((JZ_C1 + JZ_C2 * p) / (1 + JZ_C3 * p)) ** JZ_P;
};

interface Jzazbz {
  jz: number;
  az: number;
  bz: number;
  cz: number;
  hz: number;
}

/** 绝对 XYZ（cd/m²）→ Jzazbz */
const xyzToJzazbz = ([x, y, z]: Vec3): Jzazbz => {
  const xp = 1.15 * x - 0.15 * z;
  const yp = 0.66 * y + 0.34 * x;
  const lms = mulRow(JZ_M1, [xp, yp, z]).map(jzPq) as Vec3;
  const [iz, az, bz] = mulRow(JZ_M2, lms);
  const jz = (1 + JZ_D) * iz / (1 + JZ_D * iz) - JZ_D0;
  const hz = (Math.atan2(bz, az) * 180 / Math.PI + 360) % 360;
  return {jz, az, bz, cz: Math.hypot(az, bz), hz};
};

const XYZ_TO_REC2020 = [
  [1.7166512, -0.3556708, -0.2533663],
  [-0.6666844, 1.6164812, 0.0157685],
  [0.0176399, -0.0427706, 0.9421031]
];
const REC2020_TO_LMS = [
  [1688, 2146, 262],
  [683, 2951, 462],
  [99, 309, 3688]
].map(r => r.map(v => v / 4096));

interface ICtCp {
  i: number;
  ct: number;
  cp: number;
}

/** 绝对 XYZ（cd/m²）→ ICtCp（BT.2100，PQ） */
const xyzToICtCp = (xyz: Vec3): ICtCp => {
  const rgb = mulRow(XYZ_TO_REC2020, xyz);
  const [l, m, s] = mulRow(REC2020_TO_LMS, rgb).map(pqEncode);
  return {
    i: 0.5 * l + 0.5 * m,
    ct: (6610 * l - 13613 * m + 7003 * s) / 4096,
    cp: (17933 * l - 17390 * m - 543 * s) / 4096
  };
};

/** sRGB（0~255）→ 绝对 XYZ：白（255,255,255）对应 peakNits */
const srgbToAbsXyz = (rgb: Vec3, peakNits: number): Vec3 => {
  const xyz = linearToXyz(rgbToLinear(rgb));
  return xyz.map(v => v * peakNits) as Vec3;
};

export {
  Jzazbz,
  ICtCp,
  pqEncode,
  pqDecode,
  hlgOetf,
  xyzToJzazbz,
  xyzToICtCp,
  srgbToAbsXyz
};
