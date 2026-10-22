import {Vec3, srgbToLinear, linearToSrgb, linearToXyz, xyzToLinear} from './space';
import {cmf, wavelengthToXyz} from './cie';
import {Matrix, mulVec, invert3} from './spectral';

// ---------- 视锥与对立色 ----------

// Hunt–Pointer–Estevez：XYZ(D65) → LMS
const HPE: Matrix = [
  [0.38971, 0.68898, -0.07868],
  [-0.22981, 1.18340, 0.04641],
  [0, 0, 1]
];
const HPE_INV = invert3(HPE);
const D65_XYZ: Vec3 = [0.95047, 1, 1.08883];
const WHITE_LMS = mulVec(HPE, D65_XYZ);

/** 线性 sRGB(0~1) → LMS，按 D65 白色归一化（白 = 1,1,1） */
const linearToLmsRel = (linear: Vec3): Vec3 => {
  const lms = mulVec(HPE, linearToXyz(linear));
  return lms.map((v, i) => v / WHITE_LMS[i]) as Vec3;
};

const rgbToLinear = (rgb: Vec3): Vec3 => rgb.map(v => srgbToLinear(v / 255)) as Vec3;

const rgbToLmsRel = (rgb: Vec3): Vec3 => linearToLmsRel(rgbToLinear(rgb));

interface Opponent {
  a: number; // 消色（明暗）通道
  rg: number; // 红-绿：正为红，负为绿
  by: number; // 蓝-黄：正为蓝，负为黄
}

/** 简化的线性对立色级：A = (L+M)/2，RG = L−M，BY = S−A；中性色的 RG、BY 恒为 0 */
const lmsToOpponent = ([l, m, s]: Vec3): Opponent => {
  const a = (l + m) / 2;
  return {a, rg: l - m, by: s - a};
};

const rgbToOpponent = (rgb: Vec3): Opponent => lmsToOpponent(rgbToLmsRel(rgb));

/**
 * 负后像的示意预测：被某色刺激过的视锥增益下降（von Kries 适应），
 * 此时看一块中性色，感知到的就是增益倒数加权后的颜色，大致落在原色的补色方向。
 */
const afterimageRgb = (rgb: Vec3): Vec3 => {
  const k = 0.2;
  const lms = rgbToLmsRel(rgb).map((v, i) => WHITE_LMS[i] / (v + k)) as Vec3;
  const linear = xyzToLinear(mulVec(HPE_INV, lms)).map(v => Math.max(0, v));
  const max = Math.max(...linear, 1e-6);
  return linear.map(v => Math.round(Math.min(1, linearToSrgb(v / max)) * 255)) as Vec3;
};

// ---------- CIE RGB 颜色匹配函数 ----------

// XYZ → CIE RGB（等能白 E 对应 R = G = B），三原色为 700 / 546.1 / 435.8 nm
const XYZ_TO_CIERGB: Matrix = [
  [2.36461385, -0.89654057, -0.46807328],
  [-0.51516621, 1.42640810, 0.08875810],
  [0.00520370, -0.01440816, 1.00920446]
];
const CIERGB_TO_XYZ = invert3(XYZ_TO_CIERGB);
const CIE_PRIMARIES = [700, 546.1, 435.8];

// 教科书里 r̄ ḡ b̄ 的纵轴比上面的矩阵小这个系数（亮度单位不同），画图时统一乘上
const TEXTBOOK_SCALE = 0.17697;

const xyzToCieRgb = (xyz: Vec3): Vec3 => mulVec(XYZ_TO_CIERGB, xyz);
const cieRgbToXyz = (rgb: Vec3): Vec3 => mulVec(CIERGB_TO_XYZ, rgb);

/** 单色光 l(nm) 的 CIE RGB 匹配值（教科书纵轴），色度取标准轨迹表，亮度取 ȳ 拟合 */
const cieRgbCmf = (l: number): Vec3 => {
  return xyzToCieRgb(wavelengthToXyz(l)).map(v => v * TEXTBOOK_SCALE) as Vec3;
};

/** 两个视场共用同一曝光换算成显示色：色域外去饱和，整体按较亮视场归一化，保留二者的亮度差 */
const displayPair = (a: Vec3, b: Vec3): [Vec3, Vec3] => {
  const prep = (xyz: Vec3): Vec3 => {
    const linear = xyzToLinear(xyz);
    const min = Math.min(...linear);
    return min < 0 ? linear.map(v => v - min) as Vec3 : linear;
  };
  const la = prep(a);
  const lb = prep(b);
  const max = Math.max(...la, ...lb, 1e-6);
  const encode = (linear: Vec3): Vec3 => {
    return linear.map(v => Math.round(Math.min(1, Math.max(0, linearToSrgb(v / max))) * 255)) as Vec3;
  };
  return [encode(la), encode(lb)];
};

// ---------- 明视觉与暗视觉 ----------

// CIE 1951 暗视觉光谱光视效率 V'(λ)，380~700nm，每 10nm 一个值，线性插值
const SCOTOPIC_TABLE = [
  0.000589, 0.002209, 0.00929, 0.03484, 0.0966, 0.1998, 0.3281, 0.455, 0.567, 0.676,
  0.793, 0.904, 0.982, 0.997, 0.935, 0.811, 0.650, 0.481, 0.3288, 0.2076,
  0.1212, 0.0655, 0.03315, 0.01593, 0.00737, 0.003335, 0.001497, 0.000677, 0.000313, 0.000148,
  0.0000715, 0.0000353, 0.0000178
];

const scotopicV = (l: number): number => {
  if (l < 380 || l > 700) {
    return 0;
  }
  const pos = (l - 380) / 10;
  const i = Math.min(SCOTOPIC_TABLE.length - 2, Math.floor(pos));
  const t = pos - i;
  return SCOTOPIC_TABLE[i] * (1 - t) + SCOTOPIC_TABLE[i + 1] * t;
};

/** 明视觉光视效率 V(λ)，即 CIE 1931 的 ȳ（解析拟合） */
const photopicV = (l: number): number => Math.min(1, Math.max(0, cmf(l)[1]));

// Kirk & O'Brien (2011)：由 XYZ 估算暗视觉亮度 V = Y·[1.33(1+(Y+Z)/X) − 1.68]
const scotopicRaw = ([x, y, z]: Vec3): number => {
  if (y <= 1e-9) {
    return 0;
  }
  return Math.max(0, y * (1.33 * (1 + (y + z) / Math.max(x, 1e-6)) - 1.68));
};
const SCOTOPIC_WHITE = scotopicRaw(D65_XYZ);

/** 相对暗视觉亮度：D65 白 = 1 */
const scotopicRel = (xyz: Vec3): number => scotopicRaw(xyz) / SCOTOPIC_WHITE;

/** 适应亮度(cd/m²) → 明视觉占比：高于约 3 为纯明视觉，低于约 0.01 为纯暗视觉，中间是中间视觉 */
const photopicShare = (lum: number): number => {
  const t = (Math.log10(lum) - Math.log10(0.01)) / (Math.log10(3) - Math.log10(0.01));
  return Math.min(1, Math.max(0, t));
};

const tintSum = 0.2126 * 0.8 + 0.7152 * 0.95 + 0.0722 * 1.2;
const NIGHT_TINT: Vec3 = [0.8 / tintSum, 0.95 / tintSum, 1.2 / tintSum];

/** 亮度增益：在黑暗中整体变暗，但不至于全黑（示意） */
const nightGain = (lum: number): number => Math.min(1, Math.max(0.04, (lum / 100) ** 0.25));

/** 简化的夜视模拟：线性 sRGB 输入输出，lum 为适应亮度(cd/m²) */
const nightLinear = (linear: Vec3, lum: number): Vec3 => {
  const m = photopicShare(lum);
  const gray = scotopicRel(linearToXyz(linear));
  const gain = nightGain(lum);
  return linear.map((v, i) => (m * v + (1 - m) * gray * NIGHT_TINT[i]) * gain) as Vec3;
};

export {
  WHITE_LMS,
  Opponent,
  rgbToLinear,
  rgbToLmsRel,
  lmsToOpponent,
  rgbToOpponent,
  afterimageRgb,
  XYZ_TO_CIERGB,
  CIERGB_TO_XYZ,
  CIE_PRIMARIES,
  xyzToCieRgb,
  cieRgbToXyz,
  cieRgbCmf,
  displayPair,
  scotopicV,
  photopicV,
  scotopicRel,
  photopicShare,
  nightGain,
  nightLinear
};
