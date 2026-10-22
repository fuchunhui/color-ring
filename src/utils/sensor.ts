import {LinearImage, createImage, encodeCode, lin, mulberry32} from './scene';

type Algo = 'nearest' | 'bilinear' | 'mhc';
type Mat3 = number[][];

interface Mosaic {
  width: number;
  height: number;
  data: Float32Array; // 每个像素只有一个值，排列为 RGGB
}

/** RGGB：偶数行是 R G R G，奇数行是 G B G B */
const bayerChannel = (x: number, y: number): number => {
  if ((y & 1) === 0) {
    return (x & 1) === 0 ? 0 : 1;
  }
  return (x & 1) === 0 ? 1 : 2;
};

const mirror = (i: number, n: number): number => {
  if (i < 0) {
    return -i;
  }
  if (i >= n) {
    return 2 * n - 2 - i;
  }
  return i;
};

/** 光学低通滤波（OLPF）的简化：水平、垂直各做一次 [1 2 1] / 4 */
const lowPass = (img: LinearImage): LinearImage => {
  const {width: w, height: h} = img;
  const tmp = createImage(w, h);
  const out = createImage(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        const a = img.data[(y * w + mirror(x - 1, w)) * 3 + c];
        const b = img.data[(y * w + x) * 3 + c];
        const d = img.data[(y * w + mirror(x + 1, w)) * 3 + c];
        tmp.data[(y * w + x) * 3 + c] = (a + 2 * b + d) / 4;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        const a = tmp.data[(mirror(y - 1, h) * w + x) * 3 + c];
        const b = tmp.data[(y * w + x) * 3 + c];
        const d = tmp.data[(mirror(y + 1, h) * w + x) * 3 + c];
        out.data[(y * w + x) * 3 + c] = (a + 2 * b + d) / 4;
      }
    }
  }
  return out;
};

const makeMosaic = (img: LinearImage): Mosaic => {
  const {width, height} = img;
  const data = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data[y * width + x] = img.data[(y * width + x) * 3 + bayerChannel(x, y)];
    }
  }
  return {width, height, data};
};

const sampleAt = (m: Mosaic, x: number, y: number): number => {
  return m.data[mirror(y, m.height) * m.width + mirror(x, m.width)];
};

const demosaicNearest = (m: Mosaic): LinearImage => {
  const out = createImage(m.width, m.height);
  for (let y0 = 0; y0 < m.height; y0 += 2) {
    for (let x0 = 0; x0 < m.width; x0 += 2) {
      const r = sampleAt(m, x0, y0);
      const g = (sampleAt(m, x0 + 1, y0) + sampleAt(m, x0, y0 + 1)) / 2;
      const b = sampleAt(m, x0 + 1, y0 + 1);
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const i = ((y0 + dy) * m.width + x0 + dx) * 3;
          out.data[i] = r;
          out.data[i + 1] = g;
          out.data[i + 2] = b;
        }
      }
    }
  }
  return out;
};

const demosaicBilinear = (m: Mosaic): LinearImage => {
  const out = createImage(m.width, m.height);
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) {
      const c = bayerChannel(x, y);
      const i = (y * m.width + x) * 3;
      const own = sampleAt(m, x, y);
      if (c === 1) {
        const horizontal = (sampleAt(m, x - 1, y) + sampleAt(m, x + 1, y)) / 2;
        const vertical = (sampleAt(m, x, y - 1) + sampleAt(m, x, y + 1)) / 2;
        const redRow = (y & 1) === 0;
        out.data[i] = redRow ? horizontal : vertical;
        out.data[i + 1] = own;
        out.data[i + 2] = redRow ? vertical : horizontal;
      } else {
        const green = (sampleAt(m, x - 1, y) + sampleAt(m, x + 1, y) + sampleAt(m, x, y - 1) + sampleAt(m, x, y + 1)) / 4;
        const diagonal = (
          sampleAt(m, x - 1, y - 1) + sampleAt(m, x + 1, y - 1) + sampleAt(m, x - 1, y + 1) + sampleAt(m, x + 1, y + 1)
        ) / 4;
        out.data[i + c] = own;
        out.data[i + 1] = green;
        out.data[i + 2 - c] = diagonal;
      }
    }
  }
  return out;
};

/** Malvar–He–Cutler 梯度校正插值的 5×5 卷积核，系数需再除以 8 */
const K_GREEN = [
  0, 0, -1, 0, 0,
  0, 0, 2, 0, 0,
  -1, 2, 4, 2, -1,
  0, 0, 2, 0, 0,
  0, 0, -1, 0, 0
];
const K_SIDE_H = [
  0, 0, 0.5, 0, 0,
  0, -1, 0, -1, 0,
  -1, 4, 5, 4, -1,
  0, -1, 0, -1, 0,
  0, 0, 0.5, 0, 0
];
const K_SIDE_V = [
  0, 0, -1, 0, 0,
  0, -1, 4, -1, 0,
  0.5, 0, 5, 0, 0.5,
  0, -1, 4, -1, 0,
  0, 0, -1, 0, 0
];
const K_CROSS = [
  0, 0, -1.5, 0, 0,
  0, 2, 0, 2, 0,
  -1.5, 0, 6, 0, -1.5,
  0, 2, 0, 2, 0,
  0, 0, -1.5, 0, 0
];

const convolve = (m: Mosaic, x: number, y: number, kernel: number[]): number => {
  let sum = 0;
  for (let ky = 0; ky < 5; ky++) {
    for (let kx = 0; kx < 5; kx++) {
      const k = kernel[ky * 5 + kx];
      if (k !== 0) {
        sum += k * sampleAt(m, x + kx - 2, y + ky - 2);
      }
    }
  }
  return Math.max(0, sum / 8);
};

const demosaicMhc = (m: Mosaic): LinearImage => {
  const out = createImage(m.width, m.height);
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) {
      const c = bayerChannel(x, y);
      const i = (y * m.width + x) * 3;
      const own = sampleAt(m, x, y);
      if (c === 1) {
        const redRow = (y & 1) === 0;
        const horizontal = convolve(m, x, y, K_SIDE_H);
        const vertical = convolve(m, x, y, K_SIDE_V);
        out.data[i] = redRow ? horizontal : vertical;
        out.data[i + 1] = own;
        out.data[i + 2] = redRow ? vertical : horizontal;
      } else {
        out.data[i + c] = own;
        out.data[i + 1] = convolve(m, x, y, K_GREEN);
        out.data[i + 2 - c] = convolve(m, x, y, K_CROSS);
      }
    }
  }
  return out;
};

const demosaic = (m: Mosaic, algo: Algo): LinearImage => {
  if (algo === 'nearest') {
    return demosaicNearest(m);
  }
  return algo === 'bilinear' ? demosaicBilinear(m) : demosaicMhc(m);
};

// ---------- 显示与评价 ----------

const encodeBytes = (img: LinearImage): Uint8ClampedArray => {
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

/** 在 sRGB 字节上计算 PSNR（dB）；完全一致返回 Infinity */
const psnr = (a: Uint8ClampedArray, b: Uint8ClampedArray): number => {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < a.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const d = a[i + c] - b[i + c];
      sum += d * d;
      count++;
    }
  }
  const mse = sum / count;
  return mse === 0 ? Infinity : 10 * Math.log10(255 * 255 / mse);
};

/** 误差图：黑底，误差越大越亮 */
const errorBytes = (a: Uint8ClampedArray, b: Uint8ClampedArray, gain: number): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(a.length);
  for (let i = 0; i < a.length; i += 4) {
    const d = (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3;
    const v = Math.min(255, d * gain);
    out[i] = v;
    out[i + 1] = v;
    out[i + 2] = v;
    out[i + 3] = 255;
  }
  return out;
};

/** 彩色滤镜示意：每个像素只亮自己那个通道 */
const mosaicColorBytes = (m: Mosaic): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(m.width * m.height * 4);
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) {
      const i = (y * m.width + x) * 4;
      out[i + bayerChannel(x, y)] = encodeCode(m.data[y * m.width + x]);
      out[i + 3] = 255;
    }
  }
  return out;
};

/** 灰度 raw 示意（做了 gamma 编码，便于观看） */
const mosaicGrayBytes = (m: Mosaic): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(m.width * m.height * 4);
  for (let i = 0; i < m.data.length; i++) {
    const v = encodeCode(m.data[i]);
    out[i * 4] = v;
    out[i * 4 + 1] = v;
    out[i * 4 + 2] = v;
    out[i * 4 + 3] = 255;
  }
  return out;
};

// ---------- 相机管线 ----------

/** 传感器滤光片的串色：每个通道会混进一点相邻颜色 */
const CAMERA_MATRIX: Mat3 = [
  [0.8, 0.15, 0.05],
  [0.12, 0.78, 0.1],
  [0.03, 0.17, 0.8]
];
/** 日光下 raw 偏绿：红、蓝通道灵敏度更低 */
const CAMERA_CAST = [0.55, 1, 0.7];

const mulVec3 = (m: Mat3, v: number[]): number[] => {
  return m.map(row => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
};

const invert3 = (m: Mat3): Mat3 => {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det]
  ];
};

const IDENTITY: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

/** 把场景（线性光）变成相机“看到”的 raw：先串色，再按通道灵敏度缩放 */
const makeCameraRaw = (img: LinearImage): LinearImage => {
  const out = createImage(img.width, img.height);
  const n = img.width * img.height;
  for (let p = 0; p < n; p++) {
    const v = mulVec3(CAMERA_MATRIX, [img.data[p * 3], img.data[p * 3 + 1], img.data[p * 3 + 2]]);
    for (let c = 0; c < 3; c++) {
      out.data[p * 3 + c] = v[c] * CAMERA_CAST[c];
    }
  }
  return out;
};

/** 白平衡增益 → 色彩校正矩阵 → sRGB 编码 */
const applyCameraPipeline = (img: LinearImage, gains: number[], ccm: Mat3): Uint8ClampedArray => {
  const n = img.width * img.height;
  const bytes = new Uint8ClampedArray(n * 4);
  for (let p = 0; p < n; p++) {
    const v = mulVec3(ccm, [
      img.data[p * 3] * gains[0],
      img.data[p * 3 + 1] * gains[1],
      img.data[p * 3 + 2] * gains[2]
    ]);
    bytes[p * 4] = encodeCode(v[0]);
    bytes[p * 4 + 1] = encodeCode(v[1]);
    bytes[p * 4 + 2] = encodeCode(v[2]);
    bytes[p * 4 + 3] = 255;
  }
  return bytes;
};

const grayWorldGains = (img: LinearImage): number[] => {
  const sum = [0, 0, 0];
  const n = img.width * img.height;
  for (let p = 0; p < n; p++) {
    for (let c = 0; c < 3; c++) {
      sum[c] += img.data[p * 3 + c];
    }
  }
  return [sum[1] / sum[0], 1, sum[1] / sum[2]];
};

// ---------- 压力测试图 ----------

const hsvLinear = (h: number, s: number, v: number): number[] => {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return lin(f(5) * 255, f(3) * 255, f(1) * 255);
};

/** 三个区域：渐密的斜条纹、细小笔画、带放射条纹的色轮，都容易产生拉链和伪色 */
const makeStressImage = (width: number, height: number): LinearImage => {
  const img = createImage(width, height);
  const third = Math.floor(width / 3);
  const rand = mulberry32(5);
  const set = (x: number, y: number, c: number[]) => {
    const i = (y * width + x) * 3;
    img.data[i] = c[0];
    img.data[i + 1] = c[1];
    img.data[i + 2] = c[2];
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      set(x, y, [1, 1, 1]);
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < third; x++) {
      const freq = 0.25 + 0.5 * y / height;
      const v = 0.5 + 0.5 * Math.sin(2 * Math.PI * freq * (x + y));
      const g = 0.02 + 0.98 * v;
      set(x, y, [g, g, g]);
    }
  }
  const inks = [[0.02, 0.02, 0.02], [0.4, 0.02, 0.02], [0.02, 0.05, 0.4]];
  for (let k = 0; k < 220; k++) {
    const len = 3 + Math.floor(rand() * 5);
    const x0 = third + 2 + Math.floor(rand() * (third - 12));
    const y0 = 2 + Math.floor(rand() * (height - 12));
    const horizontal = rand() < 0.5;
    const ink = inks[Math.floor(rand() * inks.length)];
    for (let t = 0; t < len; t++) {
      set(horizontal ? x0 + t : x0, horizontal ? y0 : y0 + t, ink);
    }
  }
  const cx = third * 2 + (width - third * 2) / 2;
  const cy = height / 2;
  const radius = Math.min(width - third * 2, height) / 2 - 3;
  for (let y = 0; y < height; y++) {
    for (let x = third * 2; x < width; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const r = Math.hypot(dx, dy);
      if (r <= radius) {
        const angle = Math.atan2(dy, dx);
        const hue = (angle * 180 / Math.PI + 360) % 360;
        const spoke = Math.sin(24 * angle) > 0 ? 1 : 0.55;
        set(x, y, hsvLinear(hue, Math.min(1, r / radius), spoke));
      }
    }
  }
  return img;
};

// ---------- ClearType 式子像素渲染 ----------

/** coverage 是 3 倍水平分辨率的覆盖率（0~1），返回逻辑像素的 RGBA（黑字白底） */
const subpixelRender = (coverage: Float32Array, subWidth: number, height: number): Uint8ClampedArray => {
  const w = Math.floor(subWidth / 3);
  const out = new Uint8ClampedArray(w * height * 4);
  const weights = [1, 2, 3, 2, 1];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let k = 0; k < 5; k++) {
          const j = Math.min(subWidth - 1, Math.max(0, 3 * x + c + k - 2));
          sum += weights[k] * coverage[y * subWidth + j];
        }
        out[(y * w + x) * 4 + c] = Math.round(255 * (1 - sum / 9));
      }
      out[(y * w + x) * 4 + 3] = 255;
    }
  }
  return out;
};

/** 普通灰度抗锯齿：三个子采样点取平均 */
const grayscaleRender = (coverage: Float32Array, subWidth: number, height: number): Uint8ClampedArray => {
  const w = Math.floor(subWidth / 3);
  const out = new Uint8ClampedArray(w * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < w; x++) {
      const sum = coverage[y * subWidth + 3 * x] + coverage[y * subWidth + 3 * x + 1] + coverage[y * subWidth + 3 * x + 2];
      const v = Math.round(255 * (1 - sum / 3));
      const i = (y * w + x) * 4;
      out[i] = v;
      out[i + 1] = v;
      out[i + 2] = v;
      out[i + 3] = 255;
    }
  }
  return out;
};

export {
  Algo,
  Mat3,
  Mosaic,
  IDENTITY,
  CAMERA_MATRIX,
  CAMERA_CAST,
  mulVec3,
  invert3,
  makeCameraRaw,
  applyCameraPipeline,
  grayWorldGains,
  makeStressImage,
  subpixelRender,
  grayscaleRender,
  bayerChannel,
  mirror,
  lowPass,
  makeMosaic,
  sampleAt,
  demosaicNearest,
  demosaicBilinear,
  demosaicMhc,
  demosaic,
  encodeBytes,
  psnr,
  errorBytes,
  mosaicColorBytes,
  mosaicGrayBytes
};
