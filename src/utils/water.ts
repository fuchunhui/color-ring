import {xyzToLinear} from './space';
import type {Vec3} from './space';
import {cmf, xyzToClipRgb} from './cie';
import {WAVELENGTHS, D65, gauss, spectrumXyz, xyzToSrgb} from './spectral';
import type {Spectrum} from './spectral';

/** 纯水吸收系数 a(λ)，单位 1/m。锚点取自 Pope & Fry (1997) 一类实测数据的近似值，中间按对数线性插值 */
const ANCHORS: [number, number][] = [
  [380, 0.0220], [400, 0.0066], [420, 0.0045], [450, 0.0092], [480, 0.0145],
  [500, 0.0204], [520, 0.0409], [550, 0.0565], [580, 0.1090], [600, 0.2224],
  [620, 0.2550], [650, 0.3490], [680, 0.4700], [700, 0.6500], [750, 2.6000],
  [780, 2.4000]
];

const absorption = (l: number): number => {
  const first = ANCHORS[0];
  const last = ANCHORS[ANCHORS.length - 1];
  if (l <= first[0]) {
    return first[1];
  }
  if (l >= last[0]) {
    return last[1];
  }
  const i = ANCHORS.findIndex(([wl]) => wl > l) - 1;
  const [l0, a0] = ANCHORS[i];
  const [l1, a1] = ANCHORS[i + 1];
  const t = (l - l0) / (l1 - l0);
  return Math.exp(Math.log(a0) * (1 - t) + Math.log(a1) * t);
};

const ABSORPTION: Spectrum = WAVELENGTHS.map(absorption);

/** 光走过 z 米水之后剩下的比例 */
const transmittance = (l: number, z: number): number => Math.exp(-absorption(l) * z);

/** 剩下比例为 fraction 时对应的水深（米） */
const depthFor = (l: number, fraction = 0.1): number => -Math.log(fraction) / absorption(l);

const Y_BAR: number[] = WAVELENGTHS.map(l => cmf(l)[1]);
const WHITE_Y = D65.reduce((sum, v, i) => sum + v * Y_BAR[i], 0);

/** 日光穿过 z 米水之后的光谱（只算吸收，不计散射） */
const attenuatedSpectrum = (z: number): Spectrum => D65.map((v, i) => v * Math.exp(-ABSORPTION[i] * z));

interface WaterColor {
  /** 自动曝光后的颜色（亮度归一），只看色相 */
  chroma: Vec3;
  /** 保留真实明暗的颜色 */
  actual: Vec3;
  /** 相对水面的亮度（Y 比值） */
  y: number;
}

const scaleXyz = (xyz: Vec3, k: number): Vec3 => xyz.map(v => v * k) as Vec3;

/** 白色物体放在水下 z 米处（或透过 z 米水看白光）所呈现的颜色 */
const waterColor = (z: number): WaterColor => {
  const spd = attenuatedSpectrum(z);
  const xyz = spectrumXyz(spd);
  const y = spd.reduce((sum, v, i) => sum + v * Y_BAR[i], 0) / WHITE_Y;
  return {chroma: xyzToClipRgb(xyz), actual: xyzToSrgb(scaleXyz(xyz, y)), y};
};

const channelWeights = (): Spectrum[] => {
  return [0, 1, 2].map(c => WAVELENGTHS.map(l => Math.max(0, xyzToLinear(cmf(l))[c])));
};

const WEIGHTS = channelWeights();

/** sRGB 三个线性通道各自的有效透过率（用 D65 加权的颜色匹配权重近似） */
const channelTransmittance = (z: number): Vec3 => {
  return WEIGHTS.map(w => {
    let num = 0;
    let den = 0;
    WAVELENGTHS.forEach((_, i) => {
      const k = w[i] * D65[i];
      num += k * Math.exp(-ABSORPTION[i] * z);
      den += k;
    });
    return num / den;
  }) as Vec3;
};

interface Dye {
  key: string;
  label: string;
  /** 摩尔吸收系数形状，已按单位浓度缩放 */
  epsilon: Spectrum;
}

const dyeSpectrum = (fn: (l: number) => number): Spectrum => WAVELENGTHS.map(fn);

const DYES: Dye[] = [
  {
    key: 'red',
    label: '红色染料（吸收绿光）',
    epsilon: dyeSpectrum(l => 3.2 * gauss(l, 530, 36, 42) + 0.5 * gauss(l, 400, 30))
  },
  {
    key: 'blue',
    label: '蓝色染料（吸收橙红光）',
    epsilon: dyeSpectrum(l => 3 * gauss(l, 662, 24, 30) + 1.4 * gauss(l, 610, 26))
  },
  {
    key: 'tea',
    label: '茶（宽带吸收，偏蓝光）',
    epsilon: dyeSpectrum(l => 2.4 * Math.exp(-(l - 380) / 75))
  }
];

/** 白光透过浓度为 conc 的染料溶液（Beer–Lambert），返回实际明暗的 sRGB */
const dyeColor = (dye: Dye, conc: number): Vec3 => {
  const t = dye.epsilon.map(e => Math.exp(-e * conc));
  return xyzToSrgb(spectrumXyz(D65, t));
};

export {
  ANCHORS,
  ABSORPTION,
  Dye,
  DYES,
  WaterColor,
  absorption,
  transmittance,
  depthFor,
  attenuatedSpectrum,
  waterColor,
  channelTransmittance,
  dyeColor
};
