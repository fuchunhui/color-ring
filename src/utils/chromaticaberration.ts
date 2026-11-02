// 玻璃色散与薄透镜焦距。Sellmeier 系数取自 Schott 数据手册（λ 单位 µm）。

interface Glass {
  key: string;
  name: string;
  B: number[];
  C: number[];
}

const BK7: Glass = {
  key: 'bk7',
  name: 'BK7（冕牌，低色散）',
  B: [1.03961212, 0.231792344, 1.01046945],
  C: [0.00600069867, 0.0200179144, 103.560653]
};

const F2: Glass = {
  key: 'f2',
  name: 'F2（火石，高色散）',
  B: [1.34533359, 0.209073176, 0.937357162],
  C: [0.00997743871, 0.0470450767, 111.886764]
};

const LINE_D = 587.56;
const LINE_F = 486.13;
const LINE_C = 656.27;

/** 折射率，nm 为真空波长 */
const refractiveIndex = (glass: Glass, nm: number): number => {
  const l2 = (nm / 1000) ** 2;
  const n2 = 1 + glass.B.reduce((sum, b, i) => sum + b * l2 / (l2 - glass.C[i]), 0);
  return Math.sqrt(n2);
};

const abbeNumber = (glass: Glass): number => {
  return (refractiveIndex(glass, LINE_D) - 1) / (refractiveIndex(glass, LINE_F) - refractiveIndex(glass, LINE_C));
};

/** 单片薄透镜在 nm 处的焦距与 d 线焦距之比：f ∝ 1 / (n - 1) */
const singleRatio = (glass: Glass, nm: number): number => {
  return (refractiveIndex(glass, LINE_D) - 1) / (refractiveIndex(glass, nm) - 1);
};

/**
 * 冕牌 + 火石密接双合透镜。总光焦度在 d 线处记为 1，
 * 消色差条件 φ1/V1 + φ2/V2 = 0，且 φ1 + φ2 = 1。
 */
const doubletPowers = (): {crown: number; flint: number} => {
  const v1 = abbeNumber(BK7);
  const v2 = abbeNumber(F2);
  return {crown: v1 / (v1 - v2), flint: -v2 / (v1 - v2)};
};

const doubletRatio = (nm: number): number => {
  const {crown, flint} = doubletPowers();
  const power = crown * (refractiveIndex(BK7, nm) - 1) / (refractiveIndex(BK7, LINE_D) - 1)
    + flint * (refractiveIndex(F2, nm) - 1) / (refractiveIndex(F2, LINE_D) - 1);
  return 1 / power;
};

type LensKey = 'single' | 'doublet';

interface Lens {
  key: LensKey;
  name: string;
  ratio: (nm: number) => number;
}

const LENSES: Lens[] = [
  {key: 'single', name: '单片 BK7 透镜', ratio: nm => singleRatio(BK7, nm)},
  {key: 'doublet', name: '消色差双合透镜（BK7 + F2）', ratio: doubletRatio}
];

const lensOf = (key: LensKey): Lens => LENSES.find(item => item.key === key) || LENSES[0];

/** 三个通道的代表波长 */
const CHANNEL_NM = {r: 620, g: 540, b: 460};

/** 相对绿光的横向放大率差：ε = f(λ) / f(绿) - 1 */
const lateralEpsilon = (lens: Lens, nm: number): number => lens.ratio(nm) / lens.ratio(CHANNEL_NM.g) - 1;

/** 对绿光对焦时，nm 处的像面离焦量（占焦距的比例）：|f(绿) / f(λ) - 1| */
const axialDefocus = (lens: Lens, nm: number): number => Math.abs(lens.ratio(CHANNEL_NM.g) / lens.ratio(nm) - 1);

interface Sensor {
  key: string;
  name: string;
  widthPx: number;
  heightPx: number;
  pitchUm: number;
  focalMm: number;
  fNumber: number;
}

const SENSORS: Sensor[] = [
  {key: 'ff', name: '全画幅 2400 万像素，50mm f/2.8', widthPx: 6000, heightPx: 4000, pitchUm: 6, focalMm: 50, fNumber: 2.8},
  {key: 'aps', name: 'APS-C 2400 万像素，35mm f/2.8', widthPx: 6000, heightPx: 4000, pitchUm: 3.9, focalMm: 35, fNumber: 2.8},
  {key: 'phone', name: '手机 1200 万像素，6mm f/1.8', widthPx: 4000, heightPx: 3000, pitchUm: 1.4, focalMm: 6, fNumber: 1.8}
];

const sensorOf = (key: string): Sensor => SENSORS.find(item => item.key === key) || SENSORS[0];

const halfDiagonalPx = (s: Sensor): number => Math.hypot(s.widthPx, s.heightPx) / 2;

/** 孔径半径（mm） */
const apertureRadiusMm = (s: Sensor): number => s.focalMm / (2 * s.fNumber);

/** 传感器上，nm 处弥散圆半径（像素） */
const blurRadiusPx = (lens: Lens, s: Sensor, nm: number): number => {
  return apertureRadiusMm(s) * axialDefocus(lens, nm) * 1000 / s.pitchUm;
};

/** 传感器角落，nm 通道相对绿通道的错位（像素） */
const cornerShiftPx = (lens: Lens, s: Sensor, nm: number): number => lateralEpsilon(lens, nm) * halfDiagonalPx(s);

export {
  Glass,
  Lens,
  LensKey,
  Sensor,
  BK7,
  F2,
  LINE_D,
  LINE_F,
  LINE_C,
  LENSES,
  SENSORS,
  CHANNEL_NM,
  refractiveIndex,
  abbeNumber,
  singleRatio,
  doubletPowers,
  doubletRatio,
  lensOf,
  sensorOf,
  lateralEpsilon,
  axialDefocus,
  apertureRadiusMm,
  blurRadiusPx,
  cornerShiftPx,
  halfDiagonalPx
};
