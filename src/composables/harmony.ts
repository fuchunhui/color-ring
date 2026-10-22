import Color from '../base/color';
import {hsv} from '../utils/color';

interface Scheme {
  key: string;
  label: string;
  offsets: number[];
}

const schemes: Scheme[] = [
  {key: 'complementary', label: '互补色', offsets: [0, 180]},
  {key: 'analogous', label: '类似色', offsets: [-30, 0, 30]},
  {key: 'triadic', label: '三角配色', offsets: [0, 120, 240]},
  {key: 'split', label: '分裂互补', offsets: [0, 150, 210]},
  {key: 'tetradic', label: '四角配色', offsets: [0, 90, 180, 270]},
  {key: 'rectangle', label: '矩形配色', offsets: [0, 60, 180, 240]}
];

const normalizeHue = (h: number): number => ((h % 360) + 360) % 360;

const schemeHues = (key: string, base: number): number[] => {
  const scheme = schemes.find(item => item.key === key) || schemes[0];
  return scheme.offsets.map(offset => normalizeHue(base + offset));
};

/** h: 0~360，s、v: 0~1 */
const hsvToColor = (h: number, s: number, v: number): Color => hsv(normalizeHue(h), s, v);

const hsvToHex = (h: number, s: number, v: number): string => hsvToColor(h, s, v).toHex().toUpperCase();

export {
  schemes,
  normalizeHue,
  schemeHues,
  hsvToColor,
  hsvToHex
};
