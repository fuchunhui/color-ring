import {Vec3, Converted, oklchToRgb} from './space';

/** 孟塞尔的 10 个主色相，每个再分 2.5 / 5 / 7.5 / 10 四档，共 40 个色相 */
const HUE_NAMES = ['R', 'YR', 'Y', 'GY', 'G', 'BG', 'B', 'PB', 'P', 'RP'];
const HUE_STEPS = [2.5, 5, 7.5, 10];

// 各主色相“5X”在 OKLCH 色相环上的近似角度，最后一项是回绕到 5R 的 +360°
const ANCHORS = [25, 60, 100, 130, 155, 195, 240, 275, 315, 350, 385];

const HUE_COUNT = HUE_NAMES.length * HUE_STEPS.length;

const hueLabel = (index: number): string => {
  return `${HUE_STEPS[index % HUE_STEPS.length]}${HUE_NAMES[Math.floor(index / HUE_STEPS.length)]}`;
};

const HUE_LIST: string[] = Array.from({length: HUE_COUNT}, (_, i) => hueLabel(i));

/** 色相序号(0~39) -> OKLCH 色相角：在相邻 5X 之间线性插值 */
const hueAngle = (index: number): number => {
  const pos = Math.floor(index / HUE_STEPS.length) * HUE_STEPS.length + (index % HUE_STEPS.length) + 1;
  const p = pos < 2 ? pos + HUE_COUNT : pos;
  const j = Math.floor((p - 2) / 4);
  const f = (p - 2) / 4 - j;
  return (ANCHORS[j] + (ANCHORS[j + 1] - ANCHORS[j]) * f) % 360;
};

/** ASTM D1535 五次多项式：明度 V(0~10) -> 相对亮度 Y(0~1) */
const valueToY = (v: number): number => {
  const y = 1.1914 * v - 0.22533 * v ** 2 + 0.23352 * v ** 3 - 0.020484 * v ** 4 + 0.00081939 * v ** 5;
  return Math.min(1, Math.max(0, y / 100));
};

const CHROMA_SCALE = 0.02;

/** 孟塞尔 色相序号/明度/彩度 -> OKLCH；中性色的 OKLab L 恰为亮度的立方根 */
const munsellToOklch = (hueIndex: number, value: number, chroma: number): Vec3 => {
  return [Math.cbrt(valueToY(value)), chroma * CHROMA_SCALE, hueAngle(hueIndex)];
};

const munsellToRgb = (hueIndex: number, value: number, chroma: number): Converted => {
  return oklchToRgb(munsellToOklch(hueIndex, value, chroma));
};

const notation = (hueIndex: number, value: number, chroma: number): string => {
  return `${hueLabel(hueIndex)} ${value}/${chroma}`;
};

export {
  HUE_NAMES,
  HUE_COUNT,
  HUE_LIST,
  hueLabel,
  hueAngle,
  valueToY,
  munsellToOklch,
  munsellToRgb,
  notation
};
