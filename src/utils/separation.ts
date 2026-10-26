import {LinearImage, createImage, setPixel, makeNoise, lin, mixLin} from './scene';
import {Vec3, linearToSrgb} from './space';

/** 单色底片：每个像素一个线性光强度（0~1） */
interface Plate {
  width: number;
  height: number;
  data: Float32Array;
}

type Matrix3 = [Vec3, Vec3, Vec3];

/**
 * 三块滤光片的串色矩阵：每行是一块底片对 (R, G, B) 的响应权重。
 * 滤光片并不完美，红滤光片也会漏进一点绿光，所以每行的非主要项不为 0。
 */
const FILTERS: Matrix3 = [
  [0.92, 0.08, 0],
  [0.06, 0.84, 0.1],
  [0, 0.12, 0.88]
];

const invert = (m: Matrix3): Matrix3 => {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  return [
    [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
    [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
    [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det]
  ];
};

const FILTERS_INV = invert(FILTERS);

const WIDTH = 256;
const HEIGHT = 192;

const paintRect = (img: LinearImage, x0: number, y0: number, x1: number, y1: number, c: Vec3): void => {
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(img.height, Math.ceil(y1)); y++) {
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(img.width, Math.ceil(x1)); x++) {
      setPixel(img, x, y, c);
    }
  }
};

const paintEllipse = (img: LinearImage, cx: number, cy: number, rx: number, ry: number, c: Vec3): void => {
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(img.height - 1, Math.ceil(cy + ry)); y++) {
    for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(img.width - 1, Math.ceil(cx + rx)); x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) {
        setPixel(img, x, y, c);
      }
    }
  }
};

/**
 * 第 t 次曝光（t = 0, 1, 2 对应红、绿、蓝底片）的场景。
 * 背景静止；旗、船、行人、树冠在三次曝光之间移动，所以合成后会出现彩色边。
 */
const makeExposure = (t: number): LinearImage => {
  const img = createImage(WIDTH, HEIGHT);
  const noise = makeNoise(WIDTH, HEIGHT, 5, 11);
  const skyTop = lin(60, 120, 220);
  const skyLow = lin(190, 220, 250);
  const grass = lin(74, 124, 46);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const hill = 96 + 9 * Math.sin(x / 22) + 5 * Math.sin(x / 9);
      if (y < hill) {
        setPixel(img, x, y, mixLin(skyTop, skyLow, y / 110));
      } else if (y < 122) {
        setPixel(img, x, y, lin(96, 120, 104));
      } else {
        setPixel(img, x, y, grass, 0.65 + 0.7 * noise(x, y));
      }
    }
  }
  // 房子
  paintRect(img, 18, 52, 92, 122, lin(205, 185, 155));
  paintRect(img, 14, 44, 96, 54, lin(120, 50, 40));
  [[26, 64], [46, 64], [66, 64]].forEach(([x, y]) => {
    paintRect(img, x - 1, y - 1, x + 15, y + 19, lin(245, 245, 240));
    paintRect(img, x, y, x + 14, y + 18, lin(60, 80, 110));
  });
  paintRect(img, 40, 96, 56, 122, lin(110, 70, 40));
  // 池塘与栅栏（高频竖条有利于对齐）
  paintRect(img, 112, 122, 252, 138, lin(70, 110, 150));
  for (let x = 100; x < 252; x += 8) {
    paintRect(img, x, 150, x + 4, 172, lin(235, 235, 225));
  }
  paintRect(img, 100, 156, 252, 159, lin(235, 235, 225));
  // 旗杆静止，旗面随风摆动
  paintRect(img, 209, 28, 211, 120, lin(150, 150, 150));
  for (let x = 211; x < 243; x++) {
    const wave = 3 * Math.sin((x - 211) / 6 + t * 2);
    paintRect(img, x, 30 + wave, x + 1, 50 + wave, lin(215, 30, 35));
    paintRect(img, x, 38 + wave, x + 1, 42 + wave, lin(245, 245, 245));
  }
  // 小船：沿池塘移动
  const boatX = 120 + 24 * t;
  paintRect(img, boatX, 128, boatX + 34, 136, lin(30, 50, 150));
  paintRect(img, boatX + 14, 114, boatX + 16, 128, lin(230, 230, 230));
  paintRect(img, boatX + 16, 114, boatX + 28, 126, lin(250, 250, 245));
  // 行人：黄衣、深色裤
  const px = 60 + 16 * t;
  paintEllipse(img, px, 168, 7, 3, lin(30, 50, 25));
  paintRect(img, px - 4, 156, px + 4, 168, lin(50, 50, 70));
  paintRect(img, px - 5, 140, px + 5, 156, lin(245, 200, 30));
  paintEllipse(img, px, 134, 4, 5, lin(225, 175, 140));
  // 树冠：轻微摇摆
  const sway = 3 * Math.sin(t * 1.7);
  paintRect(img, 150 + sway * 0.3, 86, 154 + sway * 0.3, 122, lin(100, 70, 40));
  paintEllipse(img, 152 + sway, 78, 16, 14, lin(40, 110, 45));
  paintEllipse(img, 142 + sway, 86, 10, 8, lin(55, 130, 55));
  paintEllipse(img, 162 + sway, 86, 10, 8, lin(30, 95, 40));
  return img;
};

const toPlate = (img: LinearImage, weights: Vec3): Plate => {
  const data = new Float32Array(img.width * img.height);
  for (let i = 0; i < data.length; i++) {
    const v = weights[0] * img.data[i * 3] + weights[1] * img.data[i * 3 + 1] + weights[2] * img.data[i * 3 + 2];
    data[i] = Math.min(1, Math.max(0, v));
  }
  return {width: img.width, height: img.height, data};
};

const sampleBilinear = (p: Plate, x: number, y: number): number => {
  const cx = Math.min(p.width - 1, Math.max(0, x));
  const cy = Math.min(p.height - 1, Math.max(0, y));
  const x0 = Math.min(p.width - 2, Math.floor(cx));
  const y0 = Math.min(p.height - 2, Math.floor(cy));
  const fx = cx - x0;
  const fy = cy - y0;
  const at = (xx: number, yy: number) => p.data[yy * p.width + xx];
  return (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
};

/** 让底片内容整体平移 (dx, dy) 像素，并绕中心旋转 angle 度；边缘按最近像素延伸 */
const transformPlate = (p: Plate, dx: number, dy: number, angle = 0): Plate => {
  const out = new Float32Array(p.data.length);
  const rad = angle * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = (p.width - 1) / 2;
  const cy = (p.height - 1) / 2;
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      const ux = x - dx - cx;
      const uy = y - dy - cy;
      out[y * p.width + x] = sampleBilinear(p, cos * ux + sin * uy + cx, -sin * ux + cos * uy + cy);
    }
  }
  return {width: p.width, height: p.height, data: out};
};

/** 三块底片叠成彩色：先按滤光片串色矩阵的逆还原线性光，再编码成 sRGB 的 RGBA 字节 */
const recompose = (r: Plate, g: Plate, b: Plate): Uint8ClampedArray => {
  const n = r.width * r.height;
  const bytes = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const v = [r.data[i], g.data[i], b.data[i]];
    for (let c = 0; c < 3; c++) {
      const lin01 = FILTERS_INV[c][0] * v[0] + FILTERS_INV[c][1] * v[1] + FILTERS_INV[c][2] * v[2];
      bytes[i * 4 + c] = Math.round(Math.min(1, Math.max(0, linearToSrgb(Math.max(0, lin01)))) * 255);
    }
    bytes[i * 4 + 3] = 255;
  }
  return bytes;
};

/** 单色底片转成灰度 RGBA 字节 */
const plateBytes = (p: Plate): Uint8ClampedArray => {
  const bytes = new Uint8ClampedArray(p.data.length * 4);
  for (let i = 0; i < p.data.length; i++) {
    const v = Math.round(Math.min(1, Math.max(0, linearToSrgb(p.data[i]))) * 255);
    bytes[i * 4] = v;
    bytes[i * 4 + 1] = v;
    bytes[i * 4 + 2] = v;
    bytes[i * 4 + 3] = 255;
  }
  return bytes;
};

/** Sobel 梯度幅值：三块底片明暗常常相反（天空在蓝底片上亮、红底片上暗），边缘位置却一致 */
const gradientMagnitude = (p: Plate): Float32Array => {
  const out = new Float32Array(p.data.length);
  const at = (x: number, y: number) => p.data[Math.min(p.height - 1, Math.max(0, y)) * p.width + Math.min(p.width - 1, Math.max(0, x))];
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      const gx = -at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1) + at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1);
      const gy = -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1) + at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1);
      out[y * p.width + x] = Math.hypot(gx, gy);
    }
  }
  return out;
};

interface ShiftEstimate {
  dx: number;
  dy: number;
  score: number;
}

/**
 * 在 ±range 像素内搜索平移，使 moving 的边缘图与 ref 的边缘图归一化互相关（NCC）最大。
 * 返回的 (dx, dy) 是 moving 相对 ref 被平移的量，即 transformPlate(ref, dx, dy) 的方向。
 */
const estimateShift = (ref: Plate, moving: Plate, range: number): ShiftEstimate => {
  const a = gradientMagnitude(ref);
  const b = gradientMagnitude(moving);
  const w = ref.width;
  const h = ref.height;
  let best: ShiftEstimate = {dx: 0, dy: 0, score: -Infinity};
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      let sa = 0;
      let sb = 0;
      let saa = 0;
      let sbb = 0;
      let sab = 0;
      let n = 0;
      for (let y = range; y < h - range; y++) {
        for (let x = range; x < w - range; x++) {
          const va = a[y * w + x];
          const vb = b[(y + dy) * w + x + dx];
          sa += va;
          sb += vb;
          saa += va * va;
          sbb += vb * vb;
          sab += va * vb;
          n++;
        }
      }
      const cov = sab - sa * sb / n;
      const den = Math.sqrt(Math.max(1e-12, (saa - sa * sa / n) * (sbb - sb * sb / n)));
      const score = cov / den;
      if (score > best.score) {
        best = {dx, dy, score};
      }
    }
  }
  return best;
};

export {
  Plate,
  Matrix3,
  ShiftEstimate,
  FILTERS,
  FILTERS_INV,
  WIDTH,
  HEIGHT,
  makeExposure,
  toPlate,
  transformPlate,
  recompose,
  plateBytes,
  estimateShift
};
