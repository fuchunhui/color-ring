import type {Vec3} from './space';
import {rgbToLab} from './space';
import {
  WAVELENGTHS,
  D65,
  sample,
  gauss,
  edge,
  blackbody,
  spectrumXyz,
  xyzToSrgb,
  adaptXyz
} from './spectral';
import type {Spectrum} from './spectral';
import {deltaE2000} from './deltae';

interface Gem {
  key: string;
  name: string;
  note: string;
  transmittance: Spectrum;
}

interface Illuminant {
  key: string;
  name: string;
  spd: Spectrum;
}

// 以下透射谱都是示意曲线（按文献里的吸收带位置手工构造），不是实测数据
const GEMS: Gem[] = [
  {
    key: 'alexandrite',
    name: '变石（Alexandrite）',
    note: '蓝绿窗口约 490nm，红光窗口 > 620nm，两者之间 560~590nm 被强烈吸收（Cr³⁺ 的吸收带）',
    transmittance: sample(l => 0.03 + 0.5 * gauss(l, 490, 20, 18) + 0.95 * edge(l, 622, 9) * gauss(l, 700, 90, 400))
  },
  {
    key: 'ruby',
    name: '红宝石（Ruby）',
    note: 'Cr³⁺ 在 400 和 550nm 附近有两个吸收带，只让红光通过；红光还会激发出约 694nm 的荧光',
    transmittance: sample(l => 0.03 + 0.85 * edge(l, 600, 14) + 0.1 * gauss(l, 450, 25) * 0.3)
  },
  {
    key: 'sapphire',
    name: '蓝宝石（Sapphire）',
    note: 'Fe²⁺/Ti⁴⁺ 电荷转移吸收，吸收黄红光，蓝光通过',
    transmittance: sample(l => 0.04 + 0.7 * gauss(l, 450, 40, 55) * (1 - 0.7 * edge(l, 580, 20)))
  }
];

const lines = (list: [number, number][]): Spectrum => sample(l => {
  return list.reduce((sum, [c, a]) => sum + a * Math.exp(-0.5 * ((l - c) / 2.5) ** 2), 0);
});

const fluorescentSpd = (): Spectrum => {
  const line = lines([[405, 2], [436, 4], [546, 8], [578, 3], [611, 6]]);
  const broad = sample(l => 1.8 * gauss(l, 580, 70, 55));
  return WAVELENGTHS.map((_, i) => line[i] + broad[i]);
};

const ILLUMINANTS: Illuminant[] = [
  {key: 'D65', name: 'D65 日光', spd: D65},
  {key: 'A', name: 'A 白炽灯（2856K）', spd: blackbody(2856)},
  {key: 'F', name: '荧光灯（示意，窄线 + 荧光粉带）', spd: fluorescentSpd()}
];

const D65_WHITE = spectrumXyz(D65);

/** 在某光源下看透射谱 T 的颜色；adapt 为真时按 Bradford 适应到 D65，模拟人眼对光源颜色的适应 */
const transmittedColor = (T: Spectrum, spd: Spectrum, adapt: boolean): Vec3 => {
  let xyz = spectrumXyz(spd, T);
  if (adapt) {
    xyz = adaptXyz(xyz, spectrumXyz(spd), D65_WHITE);
  }
  return xyzToSrgb(xyz);
};

const gemDeltaE = (T: Spectrum, a: Illuminant, b: Illuminant, adapt: boolean): number => {
  return deltaE2000(rgbToLab(transmittedColor(T, a.spd, adapt)), rgbToLab(transmittedColor(T, b.spd, adapt)));
};

// ---------- 金纳米颗粒（Lycurgus 杯）----------

/** 金纳米颗粒：吸收峰约 520nm，散射峰偏向短波一侧（示意） */
const goldAbsorption = (l: number): number => 0.9 * gauss(l, 525, 35, 60) + 1.6 * (1 - edge(l, 490, 22));
const goldScattering = (l: number): number => 0.5 * gauss(l, 545, 30, 45);

const lycurgusTransmit = (thickness: number): Spectrum => {
  return sample(l => Math.exp(-(goldAbsorption(l) + goldScattering(l)) * thickness));
};

const lycurgusScatter = (): Spectrum => sample(l => goldScattering(l));

// ---------- 薄膜二向色玻璃 ----------

const dichroicReflect = (center: number, width: number): Spectrum => {
  return sample(l => 0.92 * Math.exp(-0.5 * ((l - center) / width) ** 4) + 0.04);
};

const dichroicTransmit = (center: number, width: number): Spectrum => {
  return dichroicReflect(center, width).map(r => 1 - r);
};

export {
  Gem,
  Illuminant,
  GEMS,
  ILLUMINANTS,
  transmittedColor,
  gemDeltaE,
  goldAbsorption,
  goldScattering,
  lycurgusTransmit,
  lycurgusScatter,
  dichroicReflect,
  dichroicTransmit
};
