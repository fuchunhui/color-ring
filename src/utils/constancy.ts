import {Vec3} from './space';
import {LinearImage, createImage, fillRect, lin, makeNoise, mixLin, mulberry32, setPixel} from './scene';

const W = 192;
const H = 144;

/** 亮度权重，估出的光源向量按它归一，这样“光源 = 1/增益”在亮度上自洽 */
const LUMA: Vec3 = [0.2126, 0.7152, 0.0722];

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const normalizeLight = (e: Vec3): Vec3 => {
  const top = Math.max(e[0], e[1], e[2], 1e-6);
  const safe = e.map(v => (Number.isFinite(v) ? Math.max(v, top * 1e-3) : top)) as Vec3;
  const y = dot(LUMA, safe);
  return safe.map(v => v / y) as Vec3;
};

// ---------- 光源 ----------

interface Cast {
  key: string;
  name: string;
  full: Vec3;
}

const CASTS: Cast[] = [
  {key: 'tungsten', name: '钨丝灯（偏黄橙）', full: [1.5, 0.95, 0.45]},
  {key: 'shade', name: '阴影（偏蓝）', full: [0.75, 0.95, 1.5]},
  {key: 'fluo', name: '劣质荧光灯（偏绿）', full: [0.85, 1.2, 0.8]}
];

/** strength 0 为白光，1 为完整偏色，中间在线性 RGB 里线性插值 */
const lightOf = (key: string, strength: number): Vec3 => {
  const cast = CASTS.find(item => item.key === key) || CASTS[0];
  const e = cast.full.map(v => 1 + (v - 1) * strength) as Vec3;
  return normalizeLight(e);
};

const clamp01 = (img: LinearImage): LinearImage => {
  const out = createImage(img.width, img.height);
  for (let i = 0; i < img.data.length; i++) {
    out.data[i] = Math.min(1, Math.max(0, img.data[i]));
  }
  return out;
};

/** 光源颜色乘上反射率，再按传感器上限截到 1，过曝的像素会变成纯白 */
const applyLight = (img: LinearImage, e: Vec3): LinearImage => {
  const out = createImage(img.width, img.height);
  for (let i = 0; i < img.data.length; i++) {
    out.data[i] = Math.min(1, img.data[i] * e[i % 3]);
  }
  return out;
};

const correct = (img: LinearImage, e: Vec3): LinearImage => {
  const out = createImage(img.width, img.height);
  for (let i = 0; i < img.data.length; i++) {
    out.data[i] = img.data[i] / e[i % 3];
  }
  return out;
};

// ---------- 场景 ----------

interface Scene {
  key: string;
  name: string;
  note: string;
  build: () => LinearImage;
}

const hsvLin = (h: number, s: number, v: number): Vec3 => {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return lin(f(5) * 255, f(3) * 255, f(1) * 255);
};

const scale = (c: Vec3, k: number): Vec3 => [c[0] * k, c[1] * k, c[2] * k];

const buildPatches = (): LinearImage => {
  const img = createImage(W, H);
  const rand = mulberry32(11);
  const noise = makeNoise(W, H, 4, 3);
  const bg: Vec3 = [0.22, 0.22, 0.22];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      setPixel(img, x, y, bg, 0.96 + 0.08 * noise(x, y));
    }
  }
  const hues = Array.from({length: 24}, (_, i) => i * 15);
  for (let i = hues.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [hues[i], hues[j]] = [hues[j], hues[i]];
  }
  hues.forEach((hue, i) => {
    const col = i % 6;
    const row = Math.floor(i / 6);
    const c = hsvLin(hue, 0.45 + 0.4 * rand(), 0.4 + 0.35 * rand());
    const x0 = 8 + col * 30;
    const y0 = 14 + row * 30;
    for (let y = y0; y < y0 + 26; y++) {
      for (let x = x0; x < x0 + 26; x++) {
        setPixel(img, x, y, c, 0.97 + 0.06 * noise(x, y));
      }
    }
  });
  return img;
};

const buildMeadow = (): LinearImage => {
  const img = createImage(W, H);
  const coarse = makeNoise(W, H, 5, 21);
  const fine = makeNoise(W, H, 14, 5);
  const leaf = lin(62, 132, 48);
  const dark = lin(22, 66, 25);
  const light = lin(120, 170, 66);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = coarse(x, y);
      const base = fine(x, y) > 0.5 ? leaf : mixLin(dark, leaf, 0.5);
      const c = n > 0.62 ? mixLin(base, light, (n - 0.62) * 2.5) : scale(base, 0.55 + 0.9 * n);
      setPixel(img, x, y, c);
    }
  }
  const stones = [{x: 40, y: 112, rx: 7, ry: 4}, {x: 150, y: 30, rx: 5, ry: 3}];
  stones.forEach(s => {
    for (let y = s.y - s.ry; y <= s.y + s.ry; y++) {
      for (let x = s.x - s.rx; x <= s.x + s.rx; x++) {
        const d = ((x - s.x) / s.rx) ** 2 + ((y - s.y) / s.ry) ** 2;
        if (d <= 1) {
          setPixel(img, x, y, [0.34, 0.34, 0.34], 0.85 + 0.3 * coarse(x, y));
        }
      }
    }
  });
  return img;
};

const buildHighlight = (): LinearImage => {
  const img = createImage(W, H);
  const noise = makeNoise(W, H, 6, 9);
  const wall = lin(200, 170, 130);
  const table = lin(150, 150, 150);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const isTable = y > H * 0.66;
      const c = isTable ? table : scale(wall, 0.85 + 0.2 * (1 - y / (H * 0.66)));
      setPixel(img, x, y, c, 0.96 + 0.08 * noise(x, y));
    }
  }
  fillRect(img, {x: 118, y: 52, w: 40, h: 54}, lin(50, 80, 170));
  const ball = (cx: number, cy: number, r: number, color: Vec3) => {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = (x - cx) / r;
        const dy = (y - cy) / r;
        const d2 = dx * dx + dy * dy;
        if (d2 <= 1) {
          const nz = Math.sqrt(1 - d2);
          const lambert = 0.3 + 0.7 * Math.max(0, (-0.5 * dx - 0.55 * dy + 0.65 * nz));
          setPixel(img, x, y, color, lambert);
        }
      }
    }
  };
  ball(60, 84, 24, lin(185, 42, 42));
  ball(98, 104, 17, lin(70, 140, 60));
  const hx = 51;
  const hy = 72;
  for (let y = hy - 5; y <= hy + 5; y++) {
    for (let x = hx - 5; x <= hx + 5; x++) {
      if ((x - hx) ** 2 + (y - hy) ** 2 <= 20) {
        setPixel(img, x, y, [4, 4, 4]);
      }
    }
  }
  return img;
};

const buildHaze = (): LinearImage => {
  const img = createImage(W, H);
  const noise = makeNoise(W, H, 8, 17);
  const grain = makeNoise(W, H, 2, 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const base: Vec3 = [0.35, 0.34, 0.32];
      const k = 0.9 + 0.12 * (y / H) + 0.1 * (noise(x, y) - 0.5) + 0.06 * (grain(x, y) - 0.5);
      setPixel(img, x, y, base, k);
    }
  }
  const tints: {x: number; y: number; w: number; h: number; mul: Vec3}[] = [
    {x: 24, y: 40, w: 46, h: 70, mul: [0.93, 1.0, 1.06]},
    {x: 84, y: 30, w: 38, h: 60, mul: [1.07, 0.98, 0.92]},
    {x: 138, y: 58, w: 36, h: 52, mul: [0.95, 1.05, 0.97]}
  ];
  tints.forEach(t => {
    for (let y = t.y; y < t.y + t.h; y++) {
      for (let x = t.x; x < t.x + t.w; x++) {
        const i = (y * W + x) * 3;
        img.data[i] *= t.mul[0];
        img.data[i + 1] *= t.mul[1];
        img.data[i + 2] *= t.mul[2];
      }
    }
  });
  return img;
};

const SCENES: Scene[] = [
  {key: 'patches', name: '色块与灰底', note: '24 个色相均匀的色块放在中性灰底上，颜色种类多，平均值接近灰色。', build: buildPatches},
  {key: 'meadow', name: '绿色草地', note: '几乎全是绿叶，只有两块小小的灰石头。', build: buildMeadow},
  {key: 'highlight', name: '带高光的静物', note: '红球上有一个反射率 4 倍于白纸的镜面高光，拍摄时会过曝成纯白。', build: buildHighlight},
  {key: 'haze', name: '雾蒙蒙的低对比', note: '所有反射率都挤在 0.3 到 0.4 之间，只有几块很淡的色偏。', build: buildHaze}
];

const rawCache = new Map<string, LinearImage>();
const truthCache = new Map<string, LinearImage>();

/** 场景辐射量（可以超过 1，比如镜面高光），确定性生成，只构造一次，调用方不要修改 */
const sceneRadiance = (key: string): LinearImage => {
  let img = rawCache.get(key);
  if (!img) {
    const scene = SCENES.find(item => item.key === key) || SCENES[0];
    img = scene.build();
    rawCache.set(key, img);
  }
  return img;
};

/** 白光下相机能记录到的样子：辐射量截到 1 */
const groundTruth = (key: string): LinearImage => {
  let img = truthCache.get(key);
  if (!img) {
    img = clamp01(sceneRadiance(key));
    truthCache.set(key, img);
  }
  return img;
};

// ---------- 模糊 ----------

const boxSizes = (sigma: number, n: number): number[] => {
  const ideal = Math.sqrt(12 * sigma * sigma / n + 1);
  let lower = Math.floor(ideal);
  if (lower % 2 === 0) {
    lower--;
  }
  const upper = lower + 2;
  const split = Math.round((12 * sigma * sigma - n * lower * lower - 4 * n * lower - 3 * n) / (-4 * lower - 4));
  return Array.from({length: n}, (_, i) => (i < split ? lower : upper));
};

const boxPass = (src: Float32Array, dst: Float32Array, w: number, h: number, r: number, horizontal: boolean): void => {
  const len = horizontal ? w : h;
  const lines = horizontal ? h : w;
  const stride = horizontal ? 1 : w;
  const lineStep = horizontal ? w : 1;
  const inv = 1 / (2 * r + 1);
  for (let line = 0; line < lines; line++) {
    const base = line * lineStep;
    let sum = 0;
    for (let k = -r; k <= r; k++) {
      sum += src[base + Math.min(len - 1, Math.max(0, k)) * stride];
    }
    for (let i = 0; i < len; i++) {
      dst[base + i * stride] = sum * inv;
      const add = Math.min(len - 1, i + r + 1);
      const sub = Math.max(0, i - r);
      sum += src[base + add * stride] - src[base + sub * stride];
    }
  }
};

/** 三次盒式模糊近似高斯模糊，边缘取最近像素 */
const blurPlane = (plane: Float32Array, w: number, h: number, sigma: number): Float32Array => {
  if (sigma < 0.3) {
    return plane.slice();
  }
  const a = plane.slice();
  const b = new Float32Array(plane.length);
  boxSizes(sigma, 3).forEach(size => {
    const r = Math.max(0, (size - 1) / 2);
    boxPass(a, b, w, h, r, true);
    boxPass(b, a, w, h, r, false);
  });
  return a;
};

const planeOf = (img: LinearImage, c: number): Float32Array => {
  const n = img.width * img.height;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = img.data[i * 3 + c];
  }
  return out;
};

// ---------- 光源估计 ----------

const grayWorld = (img: LinearImage): Vec3 => shadesOfGray(img, 1);

/** Minkowski 范数：p = 1 即灰度世界，p → ∞ 即取最大值 */
const shadesOfGray = (img: LinearImage, p: number): Vec3 => {
  const n = img.width * img.height;
  const e: Vec3 = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += Math.max(0, img.data[i * 3 + c]) ** p;
    }
    e[c] = (sum / n) ** (1 / p);
  }
  return normalizeLight(e);
};

/** percentile = 1 取最大值；0.99 取每个通道第 99 百分位 */
const whitePatch = (img: LinearImage, percentile: number): Vec3 => {
  const n = img.width * img.height;
  const e: Vec3 = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const plane = planeOf(img, c).sort();
    e[c] = plane[Math.min(n - 1, Math.floor(percentile * (n - 1)))];
  }
  return normalizeLight(e);
};

/** 灰边：对 σ≈1 平滑后的每个通道求梯度大小，再取 p 范数 */
const grayEdge = (img: LinearImage, p: number): Vec3 => {
  const {width: w, height: h} = img;
  const e: Vec3 = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const s = blurPlane(planeOf(img, c), w, h, 1);
    let sum = 0;
    let count = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const dx = (s[y * w + x + 1] - s[y * w + x - 1]) / 2;
        const dy = (s[(y + 1) * w + x] - s[(y - 1) * w + x]) / 2;
        sum += Math.hypot(dx, dy) ** p;
        count++;
      }
    }
    e[c] = (sum / Math.max(count, 1)) ** (1 / p);
  }
  return normalizeLight(e);
};

/** 单尺度 Retinex：每个像素除以它周围的高斯模糊，再把整体亮度调回输入的水平 */
const retinex = (img: LinearImage, sigma: number): LinearImage => {
  const {width: w, height: h} = img;
  const out = createImage(w, h);
  const eps = 1e-3;
  for (let c = 0; c < 3; c++) {
    const plane = planeOf(img, c);
    const blur = blurPlane(plane, w, h, sigma);
    for (let i = 0; i < plane.length; i++) {
      out.data[i * 3 + c] = (plane[i] + eps) / (blur[i] + eps);
    }
  }
  const meanY = (m: LinearImage) => {
    let sum = 0;
    for (let i = 0; i < w * h; i++) {
      sum += LUMA[0] * m.data[i * 3] + LUMA[1] * m.data[i * 3 + 1] + LUMA[2] * m.data[i * 3 + 2];
    }
    return sum / (w * h);
  };
  const k = meanY(img) / Math.max(meanY(out), 1e-6);
  for (let i = 0; i < out.data.length; i++) {
    out.data[i] *= k;
  }
  return out;
};

const meanColor = (img: LinearImage): Vec3 => {
  const n = img.width * img.height;
  const m: Vec3 = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    m[0] += img.data[i * 3];
    m[1] += img.data[i * 3 + 1];
    m[2] += img.data[i * 3 + 2];
  }
  return m.map(v => v / n) as Vec3;
};

/** 两个 RGB 向量的夹角（度），色彩恒常性研究里常用的 recovery angular error */
const angleBetween = (a: Vec3, b: Vec3): number => {
  const na = Math.hypot(a[0], a[1], a[2]);
  const nb = Math.hypot(b[0], b[1], b[2]);
  if (na < 1e-9 || nb < 1e-9) {
    return 0;
  }
  const cos = Math.min(1, Math.max(-1, dot(a, b) / (na * nb)));
  return Math.acos(cos) * 180 / Math.PI;
};

// ---------- 汇总 ----------

interface Params {
  scene: string;
  cast: string;
  strength: number;
  p: number;
  sigma: number;
  percentile: number;
}

type MethodKey = 'gray' | 'white' | 'sog' | 'edge';

interface Estimate {
  key: MethodKey;
  name: string;
  light: Vec3;
  error: number;
}

const METHOD_NAMES: Record<MethodKey, string> = {
  gray: '灰度世界',
  white: '白块',
  sog: '灰度之阴',
  edge: '灰边'
};

const EDGE_P = 5;

const estimateAll = (cast: LinearImage, truth: Vec3, p: number, percentile: number): Estimate[] => {
  const lights: Record<MethodKey, Vec3> = {
    gray: grayWorld(cast),
    white: whitePatch(cast, percentile),
    sog: shadesOfGray(cast, p),
    edge: grayEdge(cast, EDGE_P)
  };
  return (Object.keys(lights) as MethodKey[]).map(key => ({
    key,
    name: METHOD_NAMES[key],
    light: lights[key],
    error: angleBetween(lights[key], truth)
  }));
};

interface Analysis {
  truthImage: LinearImage;
  cast: LinearImage;
  light: Vec3;
  estimates: Estimate[];
  corrected: Record<MethodKey, LinearImage>;
  retinex: LinearImage;
  retinexResidual: number;
}

const analyze = (params: Params): Analysis => {
  const truthImage = groundTruth(params.scene);
  const light = lightOf(params.cast, params.strength);
  const cast = applyLight(sceneRadiance(params.scene), light);
  const estimates = estimateAll(cast, light, params.p, params.percentile);
  const corrected = {} as Record<MethodKey, LinearImage>;
  estimates.forEach(item => {
    corrected[item.key] = correct(cast, item.light);
  });
  const ret = retinex(cast, params.sigma);
  return {
    truthImage,
    cast,
    light,
    estimates,
    corrected,
    retinex: ret,
    retinexResidual: angleBetween(meanColor(ret), meanColor(truthImage))
  };
};

interface TableRow {
  scene: Scene;
  errors: Record<MethodKey | 'white99', number>;
  retinexResidual: number;
  untouched: number;
}

/** 每个场景在当前光源下，各方法的光源估计误差（度）。白块同时给出最大值与前 1% 两种 */
const errorTable = (params: Params): TableRow[] => {
  return SCENES.map(scene => {
    const truthImage = groundTruth(scene.key);
    const light = lightOf(params.cast, params.strength);
    const cast = applyLight(sceneRadiance(scene.key), light);
    const maxEst = estimateAll(cast, light, params.p, 1);
    const topEst = whitePatch(cast, 0.99);
    const errors = {white99: angleBetween(topEst, light)} as TableRow['errors'];
    maxEst.forEach(item => {
      errors[item.key] = item.error;
    });
    return {
      scene,
      errors,
      retinexResidual: angleBetween(meanColor(retinex(cast, params.sigma)), meanColor(truthImage)),
      untouched: angleBetween([1, 1, 1], light)
    };
  });
};

export {
  W,
  H,
  CASTS,
  SCENES,
  METHOD_NAMES,
  EDGE_P,
  lightOf,
  groundTruth,
  analyze,
  errorTable,
  angleBetween,
  shadesOfGray,
  whitePatch,
  grayEdge,
  grayWorld,
  retinex,
  applyLight,
  blurPlane
};
export type {Params, MethodKey, Estimate, Analysis, TableRow};
