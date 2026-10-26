import {Vec3, rgbToOklch, oklchToRgb, contrastRatio} from './space';

type Method = 'light' | 'invert' | 'invertHue' | 'oklch' | 'designed';

interface Pair {
  key: string;
  label: string;
  fg: string;
  bg: string;
  target: number;
}

const LIGHT: Record<string, string> = {
  bg: '#FFFFFF',
  surface: '#F5F6FA',
  text: '#1F2937',
  muted: '#6B7280',
  link: '#1D4ED8',
  primary: '#2563EB',
  primaryText: '#FFFFFF',
  secondary: '#E5E7EB',
  secondaryText: '#374151',
  alertBg: '#FEE2E2',
  alertText: '#991B1B',
  border: '#D1D5DB',
  s1: '#2563EB',
  s2: '#DC2626',
  s3: '#16A34A',
  s4: '#D97706'
};

const ROLES = Object.keys(LIGHT);

const PAIRS: Pair[] = [
  {key: 'text-bg', label: '正文 / 页面背景', fg: 'text', bg: 'bg', target: 4.5},
  {key: 'text-surface', label: '正文 / 卡片', fg: 'text', bg: 'surface', target: 4.5},
  {key: 'muted-surface', label: '次要文字 / 卡片', fg: 'muted', bg: 'surface', target: 4.5},
  {key: 'link-surface', label: '链接 / 卡片', fg: 'link', bg: 'surface', target: 4.5},
  {key: 'primary-text', label: '主按钮文字 / 主按钮', fg: 'primaryText', bg: 'primary', target: 4.5},
  {key: 'secondary-text', label: '次按钮文字 / 次按钮', fg: 'secondaryText', bg: 'secondary', target: 4.5},
  {key: 'alert-text', label: '警告文字 / 警告背景', fg: 'alertText', bg: 'alertBg', target: 4.5},
  {key: 's1', label: '图表系列 1 / 卡片', fg: 's1', bg: 'surface', target: 3},
  {key: 's2', label: '图表系列 2 / 卡片', fg: 's2', bg: 'surface', target: 3},
  {key: 's3', label: '图表系列 3 / 卡片', fg: 's3', bg: 'surface', target: 3},
  {key: 's4', label: '图表系列 4 / 卡片', fg: 's4', bg: 'surface', target: 3}
];

const hexToRgb = (hex: string): Vec3 => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgbToHex = (rgb: Vec3): string => {
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
};

const ratio = (fg: string, bg: string): number => contrastRatio(hexToRgb(fg), hexToRgb(bg));

/** 固定 L、h，色度超出 sRGB 时二分压低色度 */
const fit = (l: number, c: number, h: number): Vec3 => {
  const lc = Math.min(1, Math.max(0, l));
  if (oklchToRgb([lc, c, h]).inGamut) {
    return oklchToRgb([lc, c, h]).rgb;
  }
  let lo = 0;
  let hi = c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (oklchToRgb([lc, mid, h]).inGamut) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return oklchToRgb([lc, lo, h]).rgb;
};

const convert = (hex: string, fn: (l: number, c: number, h: number) => [number, number, number]): string => {
  const [l, c, h] = rgbToOklch(hexToRgb(hex));
  const [l2, c2, h2] = fn(l, c, h);
  return rgbToHex(fit(l2, c2, (h2 + 360) % 360));
};

const invert = (hex: string): string => rgbToHex(hexToRgb(hex).map(v => 255 - v) as Vec3);

/** Filter Effects 规范里 hue-rotate() 的矩阵，作用在 sRGB 编码值上 */
const hueRotate = (rgb: Vec3, deg: number): Vec3 => {
  const cos = Math.cos((deg * Math.PI) / 180);
  const sin = Math.sin((deg * Math.PI) / 180);
  const m = [
    [0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928],
    [0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.140, 0.072 - cos * 0.072 - sin * 0.283],
    [0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072]
  ];
  return m.map(row => {
    const v = row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2];
    return Math.round(Math.min(255, Math.max(0, v)));
  }) as Vec3;
};

/** 等价于 CSS：filter: invert(1) hue-rotate(180deg) */
const invertHue = (hex: string): string => rgbToHex(hueRotate(hexToRgb(invert(hex)), 180));

const oklchInvert = (hex: string): string => convert(hex, (l, c, h) => [1 - l, c, h]);

/** 在保持色相、色度不变的前提下，二分调整亮度，直到与背景对比度达到目标 */
const adjustForContrast = (hex: string, bg: string, target: number): string => {
  if (ratio(hex, bg) >= target) {
    return hex;
  }
  const [l0, c, h] = rgbToOklch(hexToRgb(hex));
  const lighten = ratio('#FFFFFF', bg) > ratio('#000000', bg);
  const end = lighten ? 1 : 0;
  const at = (l: number) => rgbToHex(fit(l, c, h));
  if (ratio(at(end), bg) < target) {
    return at(end);
  }
  let near = l0;
  let far = end;
  for (let i = 0; i < 30; i++) {
    const mid = (near + far) / 2;
    if (ratio(at(mid), bg) >= target) {
      far = mid;
    } else {
      near = mid;
    }
  }
  return at(far);
};

const BG_HUE = 265;

const neutral = (l: number, c = 0.012): string => rgbToHex(fit(l, c, BG_HUE));

/** 设计过的映射：背景为深灰，强调色保持色相、抬高亮度、略降饱和，再按对比度目标校正 */
const designed = (): Record<string, string> => {
  const out: Record<string, string> = {};
  out.bg = neutral(0.17);
  out.surface = neutral(0.22);
  out.secondary = neutral(0.3);
  out.border = neutral(0.38);
  out.alertBg = convert(LIGHT.alertBg, (_, c, h) => [0.27, Math.min(c, 0.05), h]);
  out.primary = convert(LIGHT.primary, (_, c, h) => [0.72, c * 0.85, h]);
  out.text = neutral(0.93, 0.005);
  out.primaryText = neutral(0.18, 0.01);
  out.secondaryText = neutral(0.9, 0.005);
  out.muted = neutral(0.74, 0.01);
  ['link', 'alertText', 's1', 's2', 's3', 's4'].forEach(role => {
    out[role] = convert(LIGHT[role], (l, c, h) => [Math.max(0.74, 1 - l * 0.4 - 0.1), c * 0.85, h]);
  });
  PAIRS.forEach(p => {
    out[p.fg] = adjustForContrast(out[p.fg], out[p.bg], p.target);
  });
  return out;
};

const buildPalette = (method: Method): Record<string, string> => {
  if (method === 'light') {
    return {...LIGHT};
  }
  if (method === 'designed') {
    return designed();
  }
  const fn = method === 'invert' ? invert : method === 'invertHue' ? invertHue : oklchInvert;
  const out: Record<string, string> = {};
  ROLES.forEach(role => {
    out[role] = fn(LIGHT[role]);
  });
  return out;
};

export {
  Method,
  Pair,
  LIGHT,
  PAIRS,
  buildPalette,
  ratio
};
