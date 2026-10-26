import {Vec3, rgbToOklab, oklabToRgb, srgbToLinear, linearToSrgb} from './space';

type Rgb = Vec3; // sRGB 编码值，0~1
type GradeFn = (rgb: Rgb) => Rgb;
type SampleMode = 'nearest' | 'trilinear';

interface Look {
  key: string;
  label: string;
  desc: string;
  grade: GradeFn;
}

/** 数据下标 = r + g * size + b * size * size，即红色变化最快，与 .cube 文件的行顺序一致 */
interface Lut3D {
  size: number;
  data: Float32Array;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

const luma = ([r, g, b]: Rgb): number => {
  return linearToSrgb(clamp01(0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)));
};

// ---------- 一维曲线 ----------

const gammaCurve = (v: number, gamma: number): number => Math.pow(clamp01(v), 1 / gamma);

/** 用 smoothstep 与恒等曲线按 k（0~1）混合，k=1 为最强的 S 形对比度 */
const sCurve = (v: number, k: number): number => {
  const x = clamp01(v);
  const s = x * x * (3 - 2 * x);
  return x + (s - x) * k;
};

/** 简化的 Lift / Gamma / Gain：v' = gain·(v + lift·(1 − v))，再做 gamma */
const liftGammaGain = (v: number, lift: number, gamma: number, gain: number): number => {
  return Math.pow(clamp01(gain * (v + lift * (1 - v))), 1 / gamma);
};

// ---------- 调色预设（输入输出均为 sRGB 编码值） ----------

const mapRgb = (rgb: Rgb, fn: (v: number, i: number) => number): Rgb => {
  return [fn(rgb[0], 0), fn(rgb[1], 1), fn(rgb[2], 2)];
};

const toBytes = (rgb: Rgb): Vec3 => mapRgb(rgb, v => v * 255);

const fromBytes = (rgb: Vec3): Rgb => mapRgb(rgb, v => v / 255);

/** 阴影推向青（OKLab 色相约 195°），高光推向橙（色相约 55°），再轻微加对比 */
const tealOrange: GradeFn = rgb => {
  const [l, a, b] = rgbToOklab(toBytes(rgb));
  const shadow = Math.pow(1 - l, 2);
  const light = Math.pow(l, 2);
  const na = a - 0.03 * shadow + 0.034 * light;
  const nb = b - 0.009 * shadow + 0.049 * light;
  const nl = l + (sCurve(l, 0.6) - l);
  return fromBytes(oklabToRgb([nl, na, nb]).rgb);
};

/** 漂白效果：部分去色并加强对比 */
const bleach: GradeFn = rgb => {
  const y = luma(rgb);
  return mapRgb(rgb, v => sCurve(sCurve(v + (y - v) * 0.55, 1), 0.5));
};

/** 褪色胶片：黑位抬起、饱和度降低、略偏暖 */
const faded: GradeFn = rgb => {
  const y = luma(rgb);
  const warm = [0.025, 0.008, -0.02];
  return mapRgb(rgb, (v, i) => clamp01(0.07 + (y + (v - y) * 0.75) * 0.88 + warm[i] * (1 - v)));
};

const blackWhite: GradeFn = rgb => {
  const y = luma(rgb);
  return [y, y, y];
};

const sepia: GradeFn = ([r, g, b]) => [
  clamp01(0.393 * r + 0.769 * g + 0.189 * b),
  clamp01(0.349 * r + 0.686 * g + 0.168 * b),
  clamp01(0.272 * r + 0.534 * g + 0.131 * b)
];

const LOOKS: Look[] = [
  {key: 'none', label: '原图（恒等）', desc: '输出等于输入，LUT 是一条对角线。', grade: rgb => rgb},
  {
    key: 'contrast',
    label: '高对比（S 曲线）',
    desc: '只用一维曲线：暗部更暗、亮部更亮，三个通道曲线完全相同，不改变色相。',
    grade: rgb => mapRgb(rgb, v => sCurve(v, 1))
  },
  {
    key: 'tealorange',
    label: '青橙（Teal & Orange）',
    desc: '电影常用：阴影偏青，高光和肤色偏橙，两者互补，画面显得更有层次。需要三维 LUT，因为偏色量取决于亮度。',
    grade: tealOrange
  },
  {
    key: 'bleach',
    label: '漂白效果（Bleach Bypass）',
    desc: '部分去色再加对比，画面灰、硬、冷，来自胶片冲洗时跳过漂白步骤。',
    grade: bleach
  },
  {
    key: 'faded',
    label: '复古褪色',
    desc: '黑位抬起（没有纯黑）、饱和度降低、略偏暖，像旧照片。',
    grade: faded
  },
  {
    key: 'bw',
    label: '黑白（亮度加权）',
    desc: '按 Rec.709 的亮度权重在线性光中合成灰度，再编码。三个通道输出相同。',
    grade: blackWhite
  },
  {
    key: 'sepia',
    label: '棕褐（Sepia）',
    desc: '常见的 3×3 矩阵：把灰度映射成棕色调，是一个线性变换，所以三维 LUT 里是一个倾斜的立方体。',
    grade: sepia
  }
];

/** 按强度在原色与调色结果之间插值 */
const gradeWithStrength = (grade: GradeFn, rgb: Rgb, strength: number): Rgb => {
  const out = grade(rgb);
  return mapRgb(rgb, (v, i) => v + (out[i] - v) * strength);
};

// ---------- 三维 LUT ----------

const buildLut = (grade: GradeFn, size: number, strength = 1): Lut3D => {
  const data = new Float32Array(size * size * size * 3);
  const n = size - 1;
  let i = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const out = gradeWithStrength(grade, [r / n, g / n, b / n], strength);
        data[i++] = out[0];
        data[i++] = out[1];
        data[i++] = out[2];
      }
    }
  }
  return {size, data};
};

const fetchNode = (lut: Lut3D, r: number, g: number, b: number): Rgb => {
  const i = (r + g * lut.size + b * lut.size * lut.size) * 3;
  return [lut.data[i], lut.data[i + 1], lut.data[i + 2]];
};

const sampleNearest = (lut: Lut3D, r: number, g: number, b: number): Rgb => {
  const n = lut.size - 1;
  return fetchNode(lut, Math.round(clamp01(r) * n), Math.round(clamp01(g) * n), Math.round(clamp01(b) * n));
};

const sampleTrilinear = (lut: Lut3D, r: number, g: number, b: number): Rgb => {
  const n = lut.size - 1;
  const x = clamp01(r) * n;
  const y = clamp01(g) * n;
  const z = clamp01(b) * n;
  const x0 = Math.min(n - 1, Math.floor(x));
  const y0 = Math.min(n - 1, Math.floor(y));
  const z0 = Math.min(n - 1, Math.floor(z));
  const fx = x - x0;
  const fy = y - y0;
  const fz = z - z0;
  const out: Rgb = [0, 0, 0];
  for (let dz = 0; dz < 2; dz++) {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz);
        const c = fetchNode(lut, x0 + dx, y0 + dy, z0 + dz);
        out[0] += c[0] * w;
        out[1] += c[1] * w;
        out[2] += c[2] * w;
      }
    }
  }
  return out;
};

const sampleLut = (lut: Lut3D, rgb: Rgb, mode: SampleMode): Rgb => {
  return mode === 'nearest' ? sampleNearest(lut, rgb[0], rgb[1], rgb[2]) : sampleTrilinear(lut, rgb[0], rgb[1], rgb[2]);
};

const byte = (v: number): number => Math.round(clamp01(v) * 255);

/** 对 RGBA 字节数组套 LUT，返回新数组 */
const applyLutBytes = (src: Uint8ClampedArray, lut: Lut3D, mode: SampleMode): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const c = sampleLut(lut, [src[i] / 255, src[i + 1] / 255, src[i + 2] / 255], mode);
    out[i] = byte(c[0]);
    out[i + 1] = byte(c[1]);
    out[i + 2] = byte(c[2]);
    out[i + 3] = src[i + 3];
  }
  return out;
};

/** 直接对每个像素调用调色函数（不经过 LUT），作为“标准答案” */
const applyGradeBytes = (src: Uint8ClampedArray, grade: GradeFn, strength: number): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const c = gradeWithStrength(grade, [src[i] / 255, src[i + 1] / 255, src[i + 2] / 255], strength);
    out[i] = byte(c[0]);
    out[i + 1] = byte(c[1]);
    out[i + 2] = byte(c[2]);
    out[i + 3] = src[i + 3];
  }
  return out;
};

/** 两组 RGBA 字节的平均绝对误差（只算 RGB） */
const meanAbsError = (a: Uint8ClampedArray, b: Uint8ClampedArray): number => {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < a.length; i += 4) {
    sum += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    count += 3;
  }
  return sum / count;
};

/** 恒等 Hald CLUT：level 4 对应 16³ 个节点，图像边长 level³ = 64，红色变化最快 */
const makeHaldIdentity = (level: number): {side: number; bytes: Uint8ClampedArray} => {
  const cube = level * level;
  const side = level * level * level;
  const bytes = new Uint8ClampedArray(side * side * 4);
  for (let i = 0; i < side * side; i++) {
    bytes[i * 4] = Math.round((i % cube) / (cube - 1) * 255);
    bytes[i * 4 + 1] = Math.round((Math.floor(i / cube) % cube) / (cube - 1) * 255);
    bytes[i * 4 + 2] = Math.round(Math.floor(i / (cube * cube)) / (cube - 1) * 255);
    bytes[i * 4 + 3] = 255;
  }
  return {side, bytes};
};

/** 取 LUT 中蓝色下标为 k 的切片，r 沿横轴、g 沿纵轴，返回 size×size 的 RGBA 字节 */
const lutSlice = (lut: Lut3D, k: number): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(lut.size * lut.size * 4);
  for (let g = 0; g < lut.size; g++) {
    for (let r = 0; r < lut.size; r++) {
      const c = fetchNode(lut, r, g, k);
      const i = (g * lut.size + r) * 4;
      out[i] = byte(c[0]);
      out[i + 1] = byte(c[1]);
      out[i + 2] = byte(c[2]);
      out[i + 3] = 255;
    }
  }
  return out;
};

/** 生成 Adobe/Resolve 通用的 .cube 文本：3D 数据表中红色下标变化最快，蓝色最慢 */
const toCube = (lut: Lut3D, title: string): string => {
  const lines = [
    `TITLE "${title}"`,
    `LUT_3D_SIZE ${lut.size}`,
    'DOMAIN_MIN 0.0 0.0 0.0',
    'DOMAIN_MAX 1.0 1.0 1.0'
  ];
  for (let i = 0; i < lut.data.length; i += 3) {
    lines.push(`${lut.data[i].toFixed(6)} ${lut.data[i + 1].toFixed(6)} ${lut.data[i + 2].toFixed(6)}`);
  }
  return lines.join('\n') + '\n';
};

export {
  Rgb,
  GradeFn,
  SampleMode,
  Look,
  Lut3D,
  LOOKS,
  clamp01,
  luma,
  gammaCurve,
  sCurve,
  liftGammaGain,
  mapRgb,
  gradeWithStrength,
  buildLut,
  sampleNearest,
  sampleTrilinear,
  sampleLut,
  applyLutBytes,
  applyGradeBytes,
  meanAbsError,
  makeHaldIdentity,
  lutSlice,
  toCube
};
