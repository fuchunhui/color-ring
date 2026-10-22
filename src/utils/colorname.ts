import list from './source';
import {Vec3, rgbToLab} from './space';
import {deltaE2000} from './deltae';

export interface NamedColor {
  name: string;
  hex: string;
  rgb: Vec3;
  lab: Vec3;
}

export interface NameMatch {
  name: string;
  hex: string;
  delta: number;
}

// source.ts 里带 _synonym 的是同色别名，grey 与 gray 是同一个颜色的两种拼写，统一保留 aqua、fuchsia 和 gray
const DISPLAY: Record<string, string> = {
  aqua: 'aqua / cyan',
  fuchsia: 'fuchsia / magenta'
};

const parseHex = (hex: string): Vec3 => {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as Vec3;
};

const NAMED: NamedColor[] = Object.entries(list as Record<string, string>)
  .filter(([name]) => !name.includes('_synonym') && !name.endsWith('grey'))
  .map(([name, hex]) => {
    const rgb = parseHex(hex);
    return {name: DISPLAY[name] || name, hex: hex.toUpperCase(), rgb, lab: rgbToLab(rgb)};
  });

/** 按 ΔE2000 在 CSS 命名色里找最接近的 k 个 */
const nearestNames = (rgb: Vec3, k = 5): NameMatch[] => {
  const lab = rgbToLab(rgb);
  return NAMED
    .map(item => ({name: item.name, hex: item.hex, delta: deltaE2000(lab, item.lab)}))
    .sort((a, b) => a.delta - b.delta)
    .slice(0, k);
};

const hslToRgb = (h: number, s: number, l: number): Vec3 => {
  const a = s * Math.min(l, 1 - l);
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map(v => Math.round(v * 255)) as Vec3;
};

const toHex = (rgb: Vec3): string => {
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
};

export {
  NAMED,
  nearestNames,
  hslToRgb,
  toHex,
  parseHex
};
