import {Vec3} from './space';
import {blackbodyXyz, xyzToDisplayRgb} from './cie';

/** Ballesteros (2012)：B−V 色指数 → 有效温度（K） */
const bvToTemperature = (bv: number): number => {
  return 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
};

/** 黑体在屏幕上的显示颜色（亮度归一化，sRGB 字节） */
const starColor = (t: number): Vec3 => xyzToDisplayRgb(blackbodyXyz(Math.round(t / 10) * 10));

interface SpectralClass {
  key: string;
  min: number;
  max: number;
  note: string;
}

/** 摩根–肯那光谱型的温度范围，常见教科书近似值 */
const SPECTRAL_CLASSES: SpectralClass[] = [
  {key: 'O', min: 30000, max: 50000, note: '蓝色，电离氦线'},
  {key: 'B', min: 10000, max: 30000, note: '蓝白，中性氦线'},
  {key: 'A', min: 7500, max: 10000, note: '白，氢线最强'},
  {key: 'F', min: 6000, max: 7500, note: '黄白'},
  {key: 'G', min: 5200, max: 6000, note: '黄，太阳属于 G'},
  {key: 'K', min: 3700, max: 5200, note: '橙'},
  {key: 'M', min: 2400, max: 3700, note: '橙红，分子带'}
];

type StarKind = '主序星' | '巨星' | '超巨星' | '白矮星';

interface Star {
  name: string;
  temperature: number; // 有效温度 K
  luminosity: number; // 太阳光度倍数
  kind: StarKind;
}

/** 常见恒星的近似值（文献值各家略有出入，光度尤其如此） */
const STARS: Star[] = [
  {name: '太阳', temperature: 5772, luminosity: 1, kind: '主序星'},
  {name: '天狼星 A', temperature: 9940, luminosity: 25.4, kind: '主序星'},
  {name: '织女星', temperature: 9600, luminosity: 40, kind: '主序星'},
  {name: '河鼓二（牛郎星）', temperature: 7700, luminosity: 10.6, kind: '主序星'},
  {name: '南河三 A', temperature: 6530, luminosity: 6.9, kind: '主序星'},
  {name: '北落师门', temperature: 8590, luminosity: 16.6, kind: '主序星'},
  {name: '轩辕十四', temperature: 12460, luminosity: 288, kind: '主序星'},
  {name: '南门二 A', temperature: 5790, luminosity: 1.52, kind: '主序星'},
  {name: '南门二 B', temperature: 5260, luminosity: 0.5, kind: '主序星'},
  {name: '天仓五', temperature: 5344, luminosity: 0.52, kind: '主序星'},
  {name: '天苑四', temperature: 5084, luminosity: 0.34, kind: '主序星'},
  {name: '巴纳德星', temperature: 3134, luminosity: 0.0035, kind: '主序星'},
  {name: '比邻星', temperature: 3042, luminosity: 0.0017, kind: '主序星'},
  {name: '狼 359', temperature: 2800, luminosity: 0.0011, kind: '主序星'},
  {name: '角宿一', temperature: 22400, luminosity: 12100, kind: '主序星'},
  {name: '大角星', temperature: 4290, luminosity: 170, kind: '巨星'},
  {name: '北河三', temperature: 4666, luminosity: 43, kind: '巨星'},
  {name: '五车二 Aa', temperature: 4970, luminosity: 79, kind: '巨星'},
  {name: '毕宿五', temperature: 3900, luminosity: 440, kind: '巨星'},
  {name: '老人星', temperature: 7350, luminosity: 10700, kind: '超巨星'},
  {name: '北极星', temperature: 6015, luminosity: 1260, kind: '超巨星'},
  {name: '天津四', temperature: 8525, luminosity: 196000, kind: '超巨星'},
  {name: '参宿七（Rigel）', temperature: 12100, luminosity: 120000, kind: '超巨星'},
  {name: '参宿四', temperature: 3600, luminosity: 100000, kind: '超巨星'},
  {name: '心宿二', temperature: 3400, luminosity: 75000, kind: '超巨星'},
  {name: '天狼星 B', temperature: 25200, luminosity: 0.056, kind: '白矮星'},
  {name: '南河三 B', temperature: 7740, luminosity: 0.00049, kind: '白矮星'}
];

/** 半径（太阳半径）：L = R² (T / 5772)⁴ */
const starRadius = (s: Star): number => Math.sqrt(s.luminosity) / (s.temperature / 5772) ** 2;

/** 主序带的中心线：[log T, log L]，示意 */
const MAIN_SEQUENCE: [number, number][] = [
  [4.65, 5.5], [4.4, 4.0], [4.2, 2.7], [4.0, 1.5], [3.9, 0.8], [3.8, 0.2],
  [3.76, 0], [3.7, -0.4], [3.6, -1.2], [3.5, -2.3], [3.45, -3.0]
];

const WIEN = 2.897771955e6; // nm·K

const peakWavelength = (t: number): number => WIEN / t;

/** 多普勒红移（非相对论之外的完整公式）：β = v/c，v > 0 为远离 */
const C_KMS = 299792.458;
const dopplerWavelength = (rest: number, v: number): number => {
  const beta = v / C_KMS;
  return rest * Math.sqrt((1 + beta) / (1 - beta));
};

export {
  SPECTRAL_CLASSES,
  STARS,
  MAIN_SEQUENCE,
  C_KMS,
  bvToTemperature,
  starColor,
  starRadius,
  peakWavelength,
  dopplerWavelength
};
export type {SpectralClass, Star, StarKind};
