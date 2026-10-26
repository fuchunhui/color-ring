/**
 * Okhsl / Okhsv：Björn Ottosson 2021 年提出的 HSL、HSV 替代方案（https://bottosson.github.io/posts/colorpicker/）。
 * 算法与常数按作者的 MIT 许可参考实现 ok_color.h 移植为 TypeScript。
 * 色相 h 用角度（0~360，对应 OKLab 的 a/b 平面），s、l、v 取 0~1。
 */
import {Vec3, srgbToLinear, linearToSrgb} from './space';

type Hsx = [number, number, number];

const TAU = 2 * Math.PI;

const K1 = 0.206;
const K2 = 0.03;
const K3 = (1 + K1) / (1 + K2);

/** 把 OKLab 的 L 压成更接近 CIE L* 的“亮度”（toe 函数），l 越接近 0，对比越大 */
const toe = (x: number): number => {
  return 0.5 * (K3 * x - K1 + Math.sqrt((K3 * x - K1) * (K3 * x - K1) + 4 * K2 * K3 * x));
};

const toeInv = (x: number): number => (x * x + K1 * x) / (K3 * (x + K2));

const oklabToLinear = (L: number, a: number, b: number): Vec3 => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ];
};

const linearToOklab = (r: number, g: number, b: number): Vec3 => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  ];
};

/** 单位色相方向 (a, b) 上，sRGB 色域内饱和度 S = C/L 的最大值（多项式近似加一步 Halley 迭代） */
const computeMaxSaturation = (a: number, b: number): number => {
  let k0: number;
  let k1: number;
  let k2: number;
  let k3: number;
  let k4: number;
  let wl: number;
  let wm: number;
  let ws: number;

  if (-1.88170328 * a - 0.80936493 * b > 1) {
    k0 = 1.19086277;
    k1 = 1.76576728;
    k2 = 0.59662641;
    k3 = 0.75515197;
    k4 = 0.56771245;
    wl = 4.0767416621;
    wm = -3.3077115913;
    ws = 0.2309699292;
  } else if (1.81444104 * a - 1.19445276 * b > 1) {
    k0 = 0.73956515;
    k1 = -0.45954404;
    k2 = 0.08285427;
    k3 = 0.12541070;
    k4 = 0.14503204;
    wl = -1.2684380046;
    wm = 2.6097574011;
    ws = -0.3413193965;
  } else {
    k0 = 1.35733652;
    k1 = -0.00915799;
    k2 = -1.15130210;
    k3 = -0.50559606;
    k4 = 0.00692167;
    wl = -0.0041960863;
    wm = -0.7034186147;
    ws = 1.7076147010;
  }

  let S = k0 + k1 * a + k2 * b + k3 * a * a + k4 * a * b;

  const kl = 0.3963377774 * a + 0.2158037573 * b;
  const km = -0.1055613458 * a - 0.0638541728 * b;
  const ks = -0.0894841775 * a - 1.2914855480 * b;

  const l_ = 1 + S * kl;
  const m_ = 1 + S * km;
  const s_ = 1 + S * ks;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const lDs = 3 * kl * l_ * l_;
  const mDs = 3 * km * m_ * m_;
  const sDs = 3 * ks * s_ * s_;

  const lDs2 = 6 * kl * kl * l_;
  const mDs2 = 6 * km * km * m_;
  const sDs2 = 6 * ks * ks * s_;

  const f = wl * l + wm * m + ws * s;
  const f1 = wl * lDs + wm * mDs + ws * sDs;
  const f2 = wl * lDs2 + wm * mDs2 + ws * sDs2;

  S -= f * f1 / (f1 * f1 - 0.5 * f * f2);
  return S;
};

interface Cusp {
  L: number;
  C: number;
}

/** 色域边界上色度最大的“尖点” */
const findCusp = (a: number, b: number): Cusp => {
  const S = computeMaxSaturation(a, b);
  const rgb = oklabToLinear(1, S * a, S * b);
  const L = Math.cbrt(1 / Math.max(rgb[0], rgb[1], rgb[2]));
  return {L, C: L * S};
};

/** 从 (L0, 0) 出发向 (L1, C1) 的射线与 sRGB 色域边界相交的位置 t（0~1） */
const findGamutIntersection = (a: number, b: number, L1: number, C1: number, L0: number, cusp: Cusp): number => {
  let t: number;
  if ((L1 - L0) * cusp.C - (cusp.L - L0) * C1 <= 0) {
    t = cusp.C * L0 / (C1 * cusp.L + cusp.C * (L0 - L1));
  } else {
    t = cusp.C * (L0 - 1) / (C1 * (cusp.L - 1) + cusp.C * (L0 - L1));

    const dL = L1 - L0;
    const dC = C1;

    const kl = 0.3963377774 * a + 0.2158037573 * b;
    const km = -0.1055613458 * a - 0.0638541728 * b;
    const ks = -0.0894841775 * a - 1.2914855480 * b;

    const lDt = dL + dC * kl;
    const mDt = dL + dC * km;
    const sDt = dL + dC * ks;

    const L = L0 * (1 - t) + t * L1;
    const C = t * C1;

    const l_ = L + C * kl;
    const m_ = L + C * km;
    const s_ = L + C * ks;

    const l = l_ ** 3;
    const m = m_ ** 3;
    const s = s_ ** 3;

    const ldt = 3 * lDt * l_ * l_;
    const mdt = 3 * mDt * m_ * m_;
    const sdt = 3 * sDt * s_ * s_;

    const ldt2 = 6 * lDt * lDt * l_;
    const mdt2 = 6 * mDt * mDt * m_;
    const sdt2 = 6 * sDt * sDt * s_;

    const step = (wl: number, wm: number, ws: number): number => {
      const v = wl * l + wm * m + ws * s - 1;
      const v1 = wl * ldt + wm * mdt + ws * sdt;
      const v2 = wl * ldt2 + wm * mdt2 + ws * sdt2;
      const u = v1 / (v1 * v1 - 0.5 * v * v2);
      return u >= 0 ? -v * u : Number.MAX_VALUE;
    };

    t += Math.min(
      step(4.0767416621, -3.3077115913, 0.2309699292),
      step(-1.2684380046, 2.6097574011, -0.3413193965),
      step(-0.0041960863, -0.7034186147, 1.7076147010)
    );
  }
  return t;
};

/** 用 L、色相方向估计“中等饱和度”曲线的 S、T 参数（多项式拟合） */
const getStMid = (a: number, b: number): [number, number] => {
  const S = 0.11516993 + 1 / (
    7.44778970 + 4.15901240 * b
    + a * (-2.19557347 + 1.75198401 * b
      + a * (-2.13704948 - 10.02301043 * b
        + a * (-4.24894561 + 5.38770819 * b + 4.69891013 * a)))
  );
  const T = 0.11239642 + 1 / (
    1.61320320 - 0.68124379 * b
    + a * (0.40370612 + 0.90148123 * b
      + a * (-0.27087943 + 0.61223990 * b
        + a * (0.00299215 - 0.45399568 * b - 0.14661872 * a)))
  );
  return [S, T];
};

interface Chromas {
  c0: number;
  cMid: number;
  cMax: number;
}

/** 给定 L 和色相方向，饱和度 s=0、0.8、1 三个位置对应的色度 */
const getCs = (L: number, a: number, b: number): Chromas => {
  const cusp = findCusp(a, b);
  const cMax = findGamutIntersection(a, b, L, 1, L, cusp);
  const stMax = [cusp.C / cusp.L, cusp.C / (1 - cusp.L)];

  const k = cMax / Math.min(L * stMax[0], (1 - L) * stMax[1]);

  const [S, T] = getStMid(a, b);
  const ca = L * S;
  const cb = (1 - L) * T;
  const cMid = 0.9 * k * Math.sqrt(Math.sqrt(1 / (1 / ca ** 4 + 1 / cb ** 4)));

  const c0a = L * 0.4;
  const c0b = (1 - L) * 0.8;
  const c0 = Math.sqrt(1 / (1 / (c0a * c0a) + 1 / (c0b * c0b)));

  return {c0, cMid, cMax};
};

const MID = 0.8;
const MID_INV = 1.25;

const encode = (linear: Vec3): Vec3 => linear.map(v => linearToSrgb(v) * 255) as Vec3;

const toLinearOklab = (rgb: Vec3): Vec3 => {
  const [r, g, b] = rgb.map(v => srgbToLinear(v / 255));
  return linearToOklab(r, g, b);
};

const round = (rgb: Vec3): Vec3 => rgb.map(v => Math.round(Math.min(255, Math.max(0, v)))) as Vec3;

/** Okhsl → sRGB（0~255 小数，未取整，可能略微超出范围） */
const okhslToSrgb = ([h, s, l]: Hsx): Vec3 => {
  if (l >= 1) {
    return [255, 255, 255];
  }
  if (l <= 0) {
    return [0, 0, 0];
  }
  const rad = h / 360 * TAU;
  const a = Math.cos(rad);
  const b = Math.sin(rad);
  const L = toeInv(l);

  const {c0, cMid, cMax} = getCs(L, a, b);

  let C: number;
  if (s < MID) {
    const t = MID_INV * s;
    const k1 = MID * c0;
    const k2 = 1 - k1 / cMid;
    C = t * k1 / (1 - k2 * t);
  } else {
    const t = (s - MID) / (1 - MID);
    const k0 = cMid;
    const k1 = (1 - MID) * cMid * cMid * MID_INV * MID_INV / c0;
    const k2 = 1 - k1 / (cMax - cMid);
    C = k0 + t * k1 / (1 - k2 * t);
  }

  return encode(oklabToLinear(L, C * a, C * b));
};

const srgbToOkhsl = (rgb: Vec3): Hsx => {
  const [L, la, lb] = toLinearOklab(rgb);
  const C = Math.hypot(la, lb);
  if (C < 1e-7) {
    return [0, 0, toe(L)];
  }
  const a = la / C;
  const b = lb / C;
  const h = (Math.atan2(lb, la) / TAU + 1) % 1 * 360;

  const {c0, cMid, cMax} = getCs(L, a, b);

  let s: number;
  if (C < cMid) {
    const k1 = MID * c0;
    const k2 = 1 - k1 / cMid;
    const t = C / (k1 + k2 * C);
    s = t * MID;
  } else {
    const k0 = cMid;
    const k1 = (1 - MID) * cMid * cMid * MID_INV * MID_INV / c0;
    const k2 = 1 - k1 / (cMax - cMid);
    const t = (C - k0) / (k1 + k2 * (C - k0));
    s = MID + (1 - MID) * t;
  }
  return [h, s, toe(L)];
};

const S_0 = 0.5;

const scaleFor = (a: number, b: number, Lvt: number, Cvt: number): number => {
  const rgb = oklabToLinear(Lvt, a * Cvt, b * Cvt);
  return Math.cbrt(1 / Math.max(rgb[0], rgb[1], rgb[2], 0));
};

/** Okhsv → sRGB（0~255 小数，未取整） */
const okhsvToSrgb = ([h, s, v]: Hsx): Vec3 => {
  const rad = h / 360 * TAU;
  const a = Math.cos(rad);
  const b = Math.sin(rad);

  const cusp = findCusp(a, b);
  const sMax = cusp.C / cusp.L;
  const tMax = cusp.C / (1 - cusp.L);
  const k = 1 - S_0 / sMax;

  const Lv = 1 - s * S_0 / (S_0 + tMax - tMax * k * s);
  const Cv = s * tMax * S_0 / (S_0 + tMax - tMax * k * s);

  let L = v * Lv;
  let C = v * Cv;

  const Lvt = toeInv(Lv);
  const Cvt = Cv * Lvt / Lv;

  const Lnew = toeInv(L);
  C = C * Lnew / L;
  L = Lnew;

  const scale = scaleFor(a, b, Lvt, Cvt);
  L *= scale;
  C *= scale;

  return encode(oklabToLinear(L, C * a, C * b));
};

const srgbToOkhsv = (rgb: Vec3): Hsx => {
  const [L0, la, lb] = toLinearOklab(rgb);
  if (L0 <= 1e-9) {
    return [0, 0, 0];
  }
  const C0 = Math.hypot(la, lb);
  const a = C0 < 1e-7 ? 1 : la / C0;
  const b = C0 < 1e-7 ? 0 : lb / C0;
  const h = C0 < 1e-7 ? 0 : (Math.atan2(lb, la) / TAU + 1) % 1 * 360;

  const cusp = findCusp(a, b);
  const sMax = cusp.C / cusp.L;
  const tMax = cusp.C / (1 - cusp.L);
  const k = 1 - S_0 / sMax;

  let L = L0;
  let C = C0;

  const t = tMax / (C + L * tMax);
  const Lv = t * L;
  const Cv = t * C;

  const Lvt = toeInv(Lv);
  const Cvt = Cv * Lvt / Lv;

  const scale = scaleFor(a, b, Lvt, Cvt);
  L /= scale;
  C /= scale;

  C = C * toe(L) / L;
  L = toe(L);

  const v = L / Lv;
  const s = (S_0 + tMax) * Cv / (tMax * S_0 + tMax * k * Cv);
  return [h, s, v];
};

const okhslToRgb = (hsl: Hsx): Vec3 => round(okhslToSrgb(hsl));
const okhsvToRgb = (hsv: Hsx): Vec3 => round(okhsvToSrgb(hsv));

export {
  Hsx,
  toe,
  toeInv,
  findCusp,
  computeMaxSaturation,
  getCs,
  okhslToSrgb,
  srgbToOkhsl,
  okhsvToSrgb,
  srgbToOkhsv,
  okhslToRgb,
  okhsvToRgb
};
