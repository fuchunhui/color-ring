import {Vec3, srgbToLinear, linearToSrgb} from './space';

interface LinearImage {
  width: number;
  height: number;
  data: Float32Array; // 线性光 RGB，每像素 3 个值
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PhotoScene {
  image: LinearImage;
  grayCard: Rect;
  patches: Rect[];
}

const createImage = (width: number, height: number): LinearImage => {
  return {width, height, data: new Float32Array(width * height * 3)};
};

const mulberry32 = (seed: number): () => number => {
  let a = seed;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const lin = (r: number, g: number, b: number): Vec3 => {
  return [srgbToLinear(r / 255), srgbToLinear(g / 255), srgbToLinear(b / 255)];
};

const mixLin = (a: Vec3, b: Vec3, t: number): Vec3 => {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
};

const setPixel = (img: LinearImage, x: number, y: number, c: Vec3, gain = 1): void => {
  const i = (y * img.width + x) * 3;
  img.data[i] = c[0] * gain;
  img.data[i + 1] = c[1] * gain;
  img.data[i + 2] = c[2] * gain;
};

const fillRect = (img: LinearImage, rect: Rect, c: Vec3): void => {
  const x0 = Math.max(0, Math.round(rect.x));
  const y0 = Math.max(0, Math.round(rect.y));
  const x1 = Math.min(img.width, Math.round(rect.x + rect.w));
  const y1 = Math.min(img.height, Math.round(rect.y + rect.h));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      setPixel(img, x, y, c);
    }
  }
};

const hsvToLinear = (h: number, s: number, v: number): Vec3 => {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return lin(f(5) * 255, f(3) * 255, f(1) * 255);
};

/** 带整数格点随机数的平滑噪声，0~1 */
const makeNoise = (width: number, height: number, cell: number, seed: number): (x: number, y: number) => number => {
  const rand = mulberry32(seed);
  const gw = Math.ceil(width / cell) + 2;
  const gh = Math.ceil(height / cell) + 2;
  const grid = Array.from({length: gw * gh}, () => rand());
  const white = Array.from({length: width * height}, () => rand());
  return (x, y) => {
    const gx = x / cell;
    const gy = y / cell;
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const fx = gx - ix;
    const fy = gy - iy;
    const at = (a: number, b: number) => grid[b * gw + a];
    const top = at(ix, iy) * (1 - fx) + at(ix + 1, iy) * fx;
    const bottom = at(ix, iy + 1) * (1 - fx) + at(ix + 1, iy + 1) * fx;
    return 0.65 * (top * (1 - fy) + bottom * fy) + 0.35 * white[y * width + x];
  };
};

const CHECKER_COLORS: Vec3[] = [
  [srgbToLinear(118 / 255), srgbToLinear(118 / 255), srgbToLinear(118 / 255)], // 18% 灰卡
  lin(240, 240, 240),
  lin(115, 82, 68),
  lin(175, 54, 60),
  lin(70, 148, 73),
  lin(56, 61, 150),
  lin(231, 199, 31)
];

/** 底部的灰卡与色卡条，第一块是 18% 灰卡 */
const drawChecker = (img: LinearImage): Rect[] => {
  const {width: w, height: h} = img;
  fillRect(img, {x: w * 0.02, y: h * 0.8, w: w * 0.86, h: h * 0.19}, lin(30, 30, 30));
  const patches: Rect[] = [];
  CHECKER_COLORS.forEach((c, i) => {
    const rect = {x: w * (0.04 + i * 0.12), y: h * 0.82, w: w * 0.1, h: h * 0.15};
    fillRect(img, rect, c);
    patches.push(rect);
  });
  return patches;
};

const makePhotoScene = (width: number, height: number): PhotoScene => {
  const img = createImage(width, height);
  const noise = makeNoise(width, height, 6, 7);
  const skyTop = lin(60, 120, 220);
  const skyLow = lin(190, 220, 250);
  const grass = lin(74, 124, 46);
  const wall = lin(205, 185, 155);
  const windowColor = lin(60, 80, 110);
  const cx = width * 0.16;
  const cy = height * 0.22;
  const radius = height * 0.15;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const v = y / height;
      let c: Vec3;
      if (v < 0.5) {
        c = mixLin(skyTop, skyLow, v / 0.5);
      } else {
        c = grass.map(n => n * (0.65 + 0.7 * noise(x, y))) as Vec3;
      }
      if (u > 0.62 && u < 0.98 && v > 0.18 && v < 0.62) {
        const inWindow = v > 0.28 && v < 0.42 && ((u > 0.7 && u < 0.8) || (u > 0.84 && u < 0.94));
        c = inWindow ? windowColor : wall.map(n => n * (0.93 + 0.14 * noise(x, y))) as Vec3;
      }
      const d = Math.hypot(x - cx, y - cy);
      if (d < radius) {
        c = hsvToLinear((Math.atan2(y - cy, x - cx) * 180 / Math.PI + 360) % 360, d / radius, 1);
      }
      setPixel(img, x, y, c);
    }
  }
  const patches = drawChecker(img);
  return {image: img, grayCard: patches[0], patches};
};

/** 几乎全是绿叶的画面，底部仍有灰卡，用来说明灰世界假设失效 */
const makeFoliageScene = (width: number, height: number): PhotoScene => {
  const img = createImage(width, height);
  const noise = makeNoise(width, height, 5, 21);
  const fine = makeNoise(width, height, 14, 5);
  const leaf = lin(60, 135, 48);
  const dark = lin(22, 70, 25);
  const light = lin(130, 175, 70);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = noise(x, y);
      const base = fine(x, y) > 0.5 ? leaf : mixLin(dark, leaf, 0.5);
      const c = n > 0.62 ? mixLin(base, light, (n - 0.62) * 2.5) : base.map(m => m * (0.55 + 0.9 * n)) as Vec3;
      setPixel(img, x, y, c);
    }
  }
  const patches = drawChecker(img);
  return {image: img, grayCard: patches[0], patches};
};

/** 浮点 HDR 场景：窗外太阳可达 600，室内暗部低至 0.002，另有同色相不同强度的色块 */
const makeHdrScene = (width: number, height: number): LinearImage => {
  const img = createImage(width, height);
  const noise = makeNoise(width, height, 8, 3);
  const sx = width * 0.72;
  const sy = height * 0.3;
  const sunR = width * 0.045;
  const glowS = width * 0.07;
  const win = {x0: 0.5, x1: 0.92, y0: 0.08, y1: 0.55};

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const v = y / height;
      let c: Vec3 = [0.16 - 0.1 * u, 0.13 - 0.085 * u, 0.1 - 0.065 * u];
      const shade = 0.6 + 0.4 * noise(x, y);
      c = c.map(n => n * shade) as Vec3;
      if (u < 0.45 && v > 0.3) {
        c = c.map(n => n * 0.04) as Vec3;
      }
      if (u > win.x0 && u < win.x1 && v > win.y0 && v < win.y1) {
        const t = (v - win.y0) / (win.y1 - win.y0);
        c = mixLin([0.4, 0.8, 2.4], [2.4, 2.8, 3.2], t);
        const d = Math.hypot(x - sx, y - sy);
        const glow = 12 * Math.exp(-d * d / (2 * glowS * glowS));
        c = [c[0] + glow, c[1] + glow * 0.95, c[2] + glow * 0.85];
        if (d < sunR) {
          c = [600, 570, 500];
        }
        const bar = Math.abs(u - 0.71) < 0.006 || Math.abs(v - 0.3) < 0.008;
        if (bar) {
          c = [0.02, 0.02, 0.02];
        }
      }
      setPixel(img, x, y, c);
    }
  }

  const scales = [0.5, 2, 8, 32];
  scales.forEach((s, i) => {
    const x = width * (0.04 + i * 0.11);
    fillRect(img, {x, y: height * 0.64, w: width * 0.09, h: height * 0.14}, [1 * s, 0.25 * s, 0.02 * s]);
    fillRect(img, {x, y: height * 0.82, w: width * 0.09, h: height * 0.14}, [0.05 * s, 0.2 * s, 1 * s]);
  });

  const rampX0 = Math.round(width * 0.5);
  const rampX1 = Math.round(width * 0.98);
  for (let x = rampX0; x < rampX1; x++) {
    const value = 10 ** (-2 + 4 * (x - rampX0) / (rampX1 - rampX0));
    fillRect(img, {x, y: height * 0.64, w: 1, h: height * 0.14}, [value, value, value]);
  }
  fillRect(img, {x: width * 0.52, y: height * 0.82, w: width * 0.1, h: height * 0.14}, [0.18, 0.18, 0.18]);
  fillRect(img, {x: width * 0.68, y: height * 0.82, w: width * 0.1, h: height * 0.14}, [0.002, 0.002, 0.002]);
  return img;
};

const encodeCode = (linear: number): number => {
  const v = Math.round(linearToSrgb(Math.min(1, Math.max(0, linear))) * 255);
  return v;
};

/** 线性光图像编码成 sRGB 画在画布左上角 */
const drawLinearImage = (ctx: CanvasRenderingContext2D, img: LinearImage): void => {
  const out = ctx.createImageData(img.width, img.height);
  const n = img.width * img.height;
  for (let i = 0; i < n; i++) {
    out.data[i * 4] = encodeCode(img.data[i * 3]);
    out.data[i * 4 + 1] = encodeCode(img.data[i * 3 + 1]);
    out.data[i * 4 + 2] = encodeCode(img.data[i * 3 + 2]);
    out.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
};

/** 线性光图像转成 sRGB 编码的 RGBA 字节数组 */
const toSrgbBytes = (img: LinearImage): Uint8ClampedArray => {
  const n = img.width * img.height;
  const bytes = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    bytes[i * 4] = encodeCode(img.data[i * 3]);
    bytes[i * 4 + 1] = encodeCode(img.data[i * 3 + 1]);
    bytes[i * 4 + 2] = encodeCode(img.data[i * 3 + 2]);
    bytes[i * 4 + 3] = 255;
  }
  return bytes;
};

export {
  LinearImage,
  Rect,
  PhotoScene,
  createImage,
  mulberry32,
  lin,
  mixLin,
  setPixel,
  fillRect,
  makeNoise,
  drawChecker,
  makePhotoScene,
  makeFoliageScene,
  makeHdrScene,
  encodeCode,
  drawLinearImage,
  toSrgbBytes
};
