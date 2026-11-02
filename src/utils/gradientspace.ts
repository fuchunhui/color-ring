import {
  Vec3,
  rgbToLinear,
  linearToSrgb,
  rgbToLab,
  labToXyz,
  xyzToLinear,
  rgbToOklab,
  rgbToOklch,
  relativeLuminance
} from './space';
import {rgbToHsl, hslToRgb} from './csscolor';

interface Sample {
  rgb: Vec3;
  /** 算出的颜色超出了 sRGB 色域，被截断 */
  clipped: boolean;
}

type Mapper = (stops: Vec3[]) => (t: number) => Sample;

const toByte = (v: number): number => Math.round(Math.min(1, Math.max(0, v)) * 255);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const norm360 = (h: number): number => ((h % 360) + 360) % 360;

/** 把 [0,1] 的位置映射到第 i 段的 u 位置 */
const locate = (count: number, t: number): {i: number; u: number} => {
  const s = Math.min(Math.max(t, 0), 1) * (count - 1);
  const i = Math.min(Math.floor(s), count - 2);
  return {i, u: s - i};
};

/** 线性光 -> 屏幕上的 8 位颜色；差不到半个码值的越界不算截断 */
const fromLinear = (linear: Vec3): Sample => {
  const encoded = linear.map(linearToSrgb);
  const tolerance = 0.5 / 255;
  return {
    rgb: encoded.map(toByte) as Vec3,
    clipped: encoded.some(v => v < -tolerance || v > 1 + tolerance)
  };
};

const oklabToLinear = ([L, a, b]: Vec3): Vec3 => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ];
};

const rgbToHsv = (rgb: Vec3): Vec3 => {
  const [r, g, b] = rgb.map(v => v / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d !== 0) {
    if (max === r) {
      h = ((g - b) / d) % 6;
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
  }
  return [norm360(h * 60), max === 0 ? 0 : d / max * 100, max * 100];
};

const hsvToRgb = ([h, s, v]: Vec3): Vec3 => {
  const sat = s / 100;
  const val = v / 100;
  const k = (n: number) => (n + norm360(h) / 60) % 6;
  const f = (n: number) => val - val * sat * Math.max(0, Math.min(k(n), 4 - k(n), 1));
  return [f(5) * 255, f(3) * 255, f(1) * 255];
};

const vectorMapper = (to: (rgb: Vec3) => Vec3, from: (c: Vec3) => Sample): Mapper => stops => {
  const cs = stops.map(to);
  return t => {
    const {i, u} = locate(cs.length, t);
    const a = cs[i];
    const b = cs[i + 1];
    return from([lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]);
  };
};

/** 带色相的空间，内部坐标统一为 [色相, 彩度, 第三轴]；彩度接近 0 时色相无意义，借用另一端的色相 */
const hueMapper = (
  to: (rgb: Vec3) => Vec3,
  from: (c: Vec3) => Sample,
  powerless: number,
  longer: boolean
): Mapper => stops => {
  const cs = stops.map(to);
  return t => {
    const {i, u} = locate(cs.length, t);
    const a = cs[i];
    const b = cs[i + 1];
    const ha = a[1] < powerless ? b[0] : a[0];
    const hb = b[1] < powerless ? a[0] : b[0];
    let delta = norm360(hb - ha);
    if (delta > 180) {
      delta -= 360;
    }
    if (longer) {
      if (delta > 0 && delta < 180) {
        delta -= 360;
      } else if (delta > -180 && delta <= 0) {
        delta += 360;
      }
    }
    return from([norm360(ha + delta * u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]);
  };
};

const fromRgbFloat = (rgb255: Vec3): Sample => ({
  rgb: rgb255.map(v => toByte(v / 255)) as Vec3,
  clipped: false
});

// ---------- 各个插值空间 ----------

const oklchTo = (rgb: Vec3): Vec3 => {
  const [L, C, h] = rgbToOklch(rgb);
  return [h, C, L];
};
const oklchFrom = ([h, c, L]: Vec3): Sample => {
  const rad = h * Math.PI / 180;
  return fromLinear(oklabToLinear([L, c * Math.cos(rad), c * Math.sin(rad)]));
};
const hslTo = (rgb: Vec3): Vec3 => {
  const [h, s, l] = rgbToHsl(rgb);
  return [h, s, l];
};
const hsvTo = (rgb: Vec3): Vec3 => rgbToHsv(rgb);

interface Method {
  key: string;
  name: string;
  color: string;
  css: string;
  build: Mapper;
}

const METHODS: Method[] = [
  {
    key: 'srgb',
    name: 'sRGB 数值（CSS 默认）',
    color: '#333333',
    css: 'linear-gradient(A, B)',
    build: vectorMapper(rgb => rgb.map(v => v / 255) as Vec3, c => fromRgbFloat(c.map(v => v * 255) as Vec3))
  },
  {
    key: 'linear',
    name: '线性光 RGB',
    color: '#E69F00',
    css: 'linear-gradient(in srgb-linear, A, B)',
    build: vectorMapper(rgbToLinear, fromLinear)
  },
  {
    key: 'lab',
    name: 'CIELAB',
    color: '#56B4E9',
    css: 'linear-gradient(in lab, A, B)',
    build: vectorMapper(rgbToLab, lab => fromLinear(xyzToLinear(labToXyz(lab))))
  },
  {
    key: 'oklab',
    name: 'OKLab',
    color: '#009E73',
    css: 'linear-gradient(in oklab, A, B)',
    build: vectorMapper(rgbToOklab, lab => fromLinear(oklabToLinear(lab)))
  },
  {
    key: 'oklchShort',
    name: 'OKLCH（短弧）',
    color: '#D55E00',
    css: 'linear-gradient(in oklch, A, B)',
    build: hueMapper(oklchTo, oklchFrom, 0.004, false)
  },
  {
    key: 'oklchLong',
    name: 'OKLCH（长弧）',
    color: '#CC79A7',
    css: 'linear-gradient(in oklch longer hue, A, B)',
    build: hueMapper(oklchTo, oklchFrom, 0.004, true)
  },
  {
    key: 'hsl',
    name: 'HSL（短弧）',
    color: '#0072B2',
    css: 'linear-gradient(in hsl, A, B)',
    build: hueMapper(hslTo, ([h, s, l]) => fromRgbFloat(hslToRgb([h, s, l])), 0.5, false)
  },
  {
    key: 'hsv',
    name: 'HSV（短弧）',
    color: '#8C8C8C',
    css: '—（CSS 没有 HSV）',
    build: hueMapper(hsvTo, c => fromRgbFloat(hsvToRgb(c)), 0.5, false)
  }
];

const METRIC_STEPS = 64;
const PLOT_STEPS = 120;

interface MethodResult {
  key: string;
  name: string;
  color: string;
  css: string;
  at: (t: number) => Sample;
  /** 相邻两步在 OKLab 里的距离的最大值 × 100 */
  maxStep: number;
  /** 最大一步 / 平均一步 */
  unevenness: number;
  /** 路径上 OKLab 彩度的最小值 */
  minChroma: number;
  /** minChroma 相对于各停靠点中最低彩度的比例；停靠点本身接近灰色时为 null */
  dip: number | null;
  clippedSteps: number;
  luminance: number[];
  chroma: number[];
}

const chromaOf = (rgb: Vec3): number => {
  const [, a, b] = rgbToOklab(rgb);
  return Math.hypot(a, b);
};

const analyse = (stops: Vec3[]): MethodResult[] => {
  const stopChroma = Math.min(...stops.map(chromaOf));
  return METHODS.map(method => {
    const at = method.build(stops);
    const labs: Vec3[] = [];
    let clippedSteps = 0;
    let minChroma = Infinity;
    for (let i = 0; i <= METRIC_STEPS; i++) {
      const s = at(i / METRIC_STEPS);
      labs.push(rgbToOklab(s.rgb));
      minChroma = Math.min(minChroma, chromaOf(s.rgb));
      if (s.clipped) {
        clippedSteps++;
      }
    }
    let total = 0;
    let maxStep = 0;
    for (let i = 1; i < labs.length; i++) {
      const d = Math.hypot(labs[i][0] - labs[i - 1][0], labs[i][1] - labs[i - 1][1], labs[i][2] - labs[i - 1][2]) * 100;
      total += d;
      maxStep = Math.max(maxStep, d);
    }
    const mean = total / METRIC_STEPS;
    const luminance: number[] = [];
    const chroma: number[] = [];
    for (let i = 0; i <= PLOT_STEPS; i++) {
      const s = at(i / PLOT_STEPS);
      luminance.push(relativeLuminance(s.rgb));
      chroma.push(chromaOf(s.rgb));
    }
    return {
      key: method.key,
      name: method.name,
      color: method.color,
      css: method.css,
      at,
      maxStep,
      unevenness: mean > 1e-9 ? maxStep / mean : 1,
      minChroma,
      dip: stopChroma > 0.02 ? Math.min(1, minChroma / stopChroma) : null,
      clippedSteps,
      luminance,
      chroma
    };
  });
};

export {
  Sample,
  Method,
  MethodResult,
  METHODS,
  METRIC_STEPS,
  PLOT_STEPS,
  analyse,
  toByte,
  lerp
};
