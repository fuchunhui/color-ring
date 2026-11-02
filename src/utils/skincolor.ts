import type {Vec3} from './space';
import {rgbToLab} from './space';
import {WAVELENGTHS, D65, sample, gauss, blackbody, spectrumXyz, xyzToSrgb, adaptXyz} from './spectral';
import type {Spectrum} from './spectral';
import {ksToReflectance} from './physics';
import {deltaE2000} from './deltae';

// 血红蛋白摩尔消光系数，单位 cm⁻¹/(mol/L)。按公开的 Prahl 表格凭记忆取的粗略值，
// 误差可达 ±15%，只用来表现吸收带的位置和相对高低，不能当作测量数据。
// 每行：[波长 nm, 氧合血红蛋白 HbO2, 还原血红蛋白 Hb]
const HB_TABLE: [number, number, number][] = [
  [380, 200000, 180000],
  [400, 266232, 223296],
  [410, 466000, 322000],
  [420, 470000, 480000],
  [430, 310000, 528600],
  [440, 120000, 340000],
  [450, 62816, 103292],
  [460, 44480, 74000],
  [480, 15000, 50000],
  [500, 20932, 35564],
  [520, 31000, 38000],
  [530, 39036, 39000],
  [540, 53236, 46592],
  [550, 43016, 53788],
  [560, 32613, 53412],
  [570, 44496, 44496],
  [577, 55540, 40000],
  [580, 50104, 37020],
  [590, 14400, 28664],
  [600, 3200, 14400],
  [620, 942, 6510],
  [640, 442, 4400],
  [650, 368, 3750],
  [660, 320, 3227],
  [680, 294, 2200],
  [700, 290, 1794],
  [720, 340, 1300],
  [740, 446, 1115],
  [760, 586, 1549],
  [780, 710, 1075],
  [800, 816, 762],
  [820, 920, 740],
  [840, 1022, 692],
  [860, 1100, 700],
  [880, 1154, 726],
  [900, 1198, 762],
  [920, 1210, 720],
  [940, 1214, 693],
  [960, 1204, 680],
  [980, 1150, 650],
  [1000, 1050, 640]
];

/** 在表格里按对数线性插值，范围外取端点 */
const hbEpsilon = (l: number): {hbo2: number; hb: number} => {
  const first = HB_TABLE[0];
  const last = HB_TABLE[HB_TABLE.length - 1];
  if (l <= first[0]) {
    return {hbo2: first[1], hb: first[2]};
  }
  if (l >= last[0]) {
    return {hbo2: last[1], hb: last[2]};
  }
  let i = 0;
  while (HB_TABLE[i + 1][0] < l) {
    i++;
  }
  const [l0, o0, h0] = HB_TABLE[i];
  const [l1, o1, h1] = HB_TABLE[i + 1];
  const t = (l - l0) / (l1 - l0);
  return {
    hbo2: Math.exp(Math.log(o0) * (1 - t) + Math.log(o1) * t),
    hb: Math.exp(Math.log(h0) * (1 - t) + Math.log(h1) * t)
  };
};

// 全血：血红蛋白 150 g/L，分子量 64500 g/mol，μa = 2.303·ε·C
const BLOOD_FACTOR = 2.303 * 150 / 64500;

/** 全血吸收系数 cm⁻¹，sat 为氧饱和度 0~1 */
const bloodMu = (l: number, sat: number): number => {
  const {hbo2, hb} = hbEpsilon(l);
  return BLOOD_FACTOR * (sat * hbo2 + (1 - sat) * hb);
};

/** 黑色素吸收系数 cm⁻¹（幂律近似 6.6e11·λ^-3.33，λ 为 nm） */
const melaninMu = (l: number): number => 6.6e11 * l ** -3.33;

/** 不含血的真皮底色吸收 cm⁻¹（近似 7.84e8·λ^-3.255） */
const baselineMu = (l: number): number => 7.84e8 * l ** -3.255;

/** 真皮的有效散射系数 cm⁻¹，随波长增大缓慢下降（示意） */
const dermisS = (l: number): number => 30 * (600 / l) ** 1.2;

/** 表皮厚度 cm（60 µm） */
const EPI_THICKNESS = 0.006;

/** 皮肤表面的菲涅耳反射（折射率约 1.4，垂直入射约 4%），不带颜色 */
const SURFACE = 0.04;

interface SkinParams {
  /** 表皮黑色素体体积分数，0~1 */
  melanin: number;
  /** 真皮血容量分数，0~1 */
  blood: number;
  /** 血氧饱和度，0~1 */
  sat: number;
}

interface SkinParts {
  total: Spectrum;
  dermis: Spectrum;
  epidermis: Spectrum;
}

/** 表面反射 + 表皮双程透过率 × 真皮的 Kubelka–Munk 漫反射 */
const skinParts = ({melanin, blood, sat}: SkinParams): SkinParts => {
  const epidermis: number[] = [];
  const dermis: number[] = [];
  WAVELENGTHS.forEach(l => {
    const k = blood * bloodMu(l, sat) + (1 - blood) * baselineMu(l);
    dermis.push(ksToReflectance(k / dermisS(l)));
    const t = Math.exp(-melanin * melaninMu(l) * EPI_THICKNESS);
    epidermis.push(t * t);
  });
  return {total: dermis.map((r, i) => SURFACE + (1 - SURFACE) * r * epidermis[i]), dermis, epidermis};
};

const skinReflectance = (p: SkinParams): Spectrum => skinParts(p).total;

const D65_WHITE = spectrumXyz(D65);

/** 反射率在某个光源下的 sRGB；adapt 为真时按 Bradford 把光源白点换回 D65 白 */
const renderUnder = (refl: Spectrum, spd: Spectrum, adapt: boolean): Vec3 => {
  let xyz = spectrumXyz(spd, refl);
  if (adapt) {
    xyz = adaptXyz(xyz, spectrumXyz(spd), D65_WHITE);
  }
  return xyzToSrgb(xyz);
};

const renderD65 = (refl: Spectrum): Vec3 => renderUnder(refl, D65, false);

/** 线性亮度 Y（完全漫反射白 = 1） */
const lumaY = (refl: Spectrum): number => spectrumXyz(D65, refl)[1];

interface ChromaPoint {
  cb: number;
  cr: number;
  chroma: number;
  angle: number;
}

/** Rec.709 的 Cb、Cr（对 sRGB 编码值，范围约 ±0.5）与它在矢量示波器上的角度（度） */
const cbcr = ([r, g, b]: Vec3): ChromaPoint => {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const y = 0.2126 * rn + 0.7152 * gn + 0.0722 * bn;
  const cb = (bn - y) / 1.8556;
  const cr = (rn - y) / 1.5748;
  const angle = (Math.atan2(cr, cb) * 180 / Math.PI + 360) % 360;
  return {cb, cr, chroma: Math.hypot(cb, cr), angle};
};

const MELANIN_STEPS = [1.5, 3, 6, 10, 16, 24, 32, 40];
const BLOOD_STEPS = [0.5, 1, 2, 3, 4.5, 6];

interface GridCell {
  melanin: number;
  blood: number;
  rgb: Vec3;
  y: number;
  point: ChromaPoint;
}

let gridCache: {sat: number; cells: GridCell[]} | null = null;

/** 黑色素（列）× 血容量（行）网格，血氧用给定值 */
const skinGrid = (sat: number): GridCell[] => {
  if (gridCache && gridCache.sat === sat) {
    return gridCache.cells;
  }
  const cells: GridCell[] = [];
  BLOOD_STEPS.forEach(blood => {
    MELANIN_STEPS.forEach(melanin => {
      const refl = skinReflectance({melanin: melanin / 100, blood: blood / 100, sat});
      const rgb = renderD65(refl);
      cells.push({melanin, blood, rgb, y: lumaY(refl), point: cbcr(rgb)});
    });
  });
  gridCache = {sat, cells};
  return cells;
};

interface GridStats {
  yMelanin: [number, number];
  yBlood: [number, number];
  angleMin: number;
  angleMax: number;
  counted: number;
}

const gridStats = (sat: number): GridStats => {
  const cells = skinGrid(sat);
  const pick = (melanin: number, blood: number): GridCell => {
    return cells.find(c => c.melanin === melanin && c.blood === blood) as GridCell;
  };
  const midBlood = 2;
  const midMelanin = 10;
  const lastMelanin = MELANIN_STEPS[MELANIN_STEPS.length - 1];
  const lastBlood = BLOOD_STEPS[BLOOD_STEPS.length - 1];
  const usable = cells.filter(c => c.point.chroma >= 0.03);
  const angles = usable.map(c => c.point.angle);
  return {
    yMelanin: [pick(MELANIN_STEPS[0], midBlood).y, pick(lastMelanin, midBlood).y],
    yBlood: [pick(midMelanin, BLOOD_STEPS[0]).y, pick(midMelanin, lastBlood).y],
    angleMin: angles.length ? Math.min(...angles) : 0,
    angleMax: angles.length ? Math.max(...angles) : 0,
    counted: usable.length
  };
};

interface Light {
  key: string;
  name: string;
  note: string;
  spd: Spectrum;
}

// 光源的光谱都是示意：白光 LED 按“蓝光芯片 + 荧光粉”造，缺红 LED 把长波端几乎拿掉
const LIGHTS: Light[] = [
  {key: 'd65', name: 'D65 日光', note: 'CIE 标准数据', spd: D65},
  {key: 'a', name: 'A 钨丝灯', note: '2856K 黑体', spd: blackbody(2856)},
  {
    key: 'led',
    name: '冷白 LED',
    note: '示意：蓝光芯片 + 黄色荧光粉',
    spd: sample(l => 0.85 * gauss(l, 450, 10) + 0.5 * gauss(l, 565, 55, 70) + 0.14 * gauss(l, 625, 40) + 0.16 * gauss(l, 495, 25))
  },
  {
    key: 'poor',
    name: '缺红光的 LED',
    note: '示意：几乎没有 610 nm 以上的光',
    spd: sample(l => 0.85 * gauss(l, 450, 10) + 0.6 * gauss(l, 545, 28, 32) + 0.04 * gauss(l, 600, 15))
  }
];

/** 同一份反射率在两个光源下的 ΔE2000（都按给定的 adapt 渲染） */
const colorDifference = (refl: Spectrum, spd: Spectrum, adapt: boolean): number => {
  const a = renderUnder(refl, D65, false);
  const b = renderUnder(refl, spd, adapt);
  return deltaE2000(rgbToLab(a), rgbToLab(b));
};

/** 脉搏血氧仪用的两个波长（nm） */
const OXI_RED = 660;
const OXI_IR = 940;

/** 660 nm 与 940 nm 处吸光度之比，随血氧饱和度变化 */
const oximeterRatio = (sat: number): number => bloodMu(OXI_RED, sat) / bloodMu(OXI_IR, sat);

export {
  HB_TABLE,
  MELANIN_STEPS,
  BLOOD_STEPS,
  LIGHTS,
  OXI_RED,
  OXI_IR,
  SURFACE,
  SkinParams,
  GridCell,
  GridStats,
  ChromaPoint,
  Light,
  hbEpsilon,
  bloodMu,
  melaninMu,
  skinParts,
  skinReflectance,
  renderUnder,
  renderD65,
  lumaY,
  cbcr,
  skinGrid,
  gridStats,
  colorDifference,
  oximeterRatio
};
