import {Vec3, linearToXyz, xyzToLinear, srgbToLinear} from '../utils/space';
import {blackbodyXyz} from '../utils/cie';
import {LinearImage, Rect, createImage, encodeCode} from '../utils/scene';

type Matrix = number[][];

const D65: Vec3 = [0.95047, 1, 1.08883];

const BRADFORD: Matrix = [
  [0.8951, 0.2664, -0.1614],
  [-0.7502, 1.7135, 0.0367],
  [0.0389, -0.0685, 1.0296]
];

const BRADFORD_INV: Matrix = [
  [0.9869929, -0.1470543, 0.1599627],
  [0.4323053, 0.5183603, 0.0492912],
  [-0.0085287, 0.0400428, 0.9684867]
];

const mulVec = (m: Matrix, v: Vec3): Vec3 => {
  return m.map(row => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) as Vec3;
};

const mulMat = (a: Matrix, b: Matrix): Matrix => {
  return a.map(row => [0, 1, 2].map(j => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));
};

const luminance = (c: Vec3): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

const toCodes = (c: Vec3): Vec3 => c.map(encodeCode) as Vec3;

const hexToLinear = (hex: string): Vec3 => {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => srgbToLinear(v / 255)) as Vec3;
};

const rgbOfCct = (cct: number): Vec3 => {
  return xyzToLinear(blackbodyXyz(cct)).map(v => Math.max(v, 1e-3)) as Vec3;
};

/** 假设相机按 D65 白平衡，色温为 cct 的光源照亮场景后各通道的增益，亮度保持不变 */
const illuminantGain = (cct: number): Vec3 => {
  const c = rgbOfCct(cct);
  const ref = rgbOfCct(6504);
  const g = c.map((v, i) => v / ref[i]) as Vec3;
  const y = luminance(g);
  return g.map(v => v / y) as Vec3;
};

const applyGain = (img: LinearImage, gain: Vec3): LinearImage => {
  const out = createImage(img.width, img.height);
  for (let i = 0; i < img.data.length; i++) {
    out.data[i] = img.data[i] * gain[i % 3];
  }
  return out;
};

/** Bradford 色适应：把 srcWhite 映射为 D65，在 XYZ 中完成 */
const bradfordAdapt = (img: LinearImage, srcWhite: Vec3): LinearImage => {
  const rs = mulVec(BRADFORD, srcWhite);
  const rd = mulVec(BRADFORD, D65);
  const scale: Matrix = [
    [rd[0] / rs[0], 0, 0],
    [0, rd[1] / rs[1], 0],
    [0, 0, rd[2] / rs[2]]
  ];
  const m = mulMat(BRADFORD_INV, mulMat(scale, BRADFORD));
  const out = createImage(img.width, img.height);
  const n = img.width * img.height;
  for (let i = 0; i < n; i++) {
    const xyz = linearToXyz([img.data[i * 3], img.data[i * 3 + 1], img.data[i * 3 + 2]]);
    const rgb = xyzToLinear(mulVec(m, xyz));
    out.data[i * 3] = rgb[0];
    out.data[i * 3 + 1] = rgb[1];
    out.data[i * 3 + 2] = rgb[2];
  }
  return out;
};

const imageMean = (img: LinearImage): Vec3 => {
  const sum = [0, 0, 0];
  const n = img.width * img.height;
  for (let i = 0; i < n; i++) {
    sum[0] += img.data[i * 3];
    sum[1] += img.data[i * 3 + 1];
    sum[2] += img.data[i * 3 + 2];
  }
  return sum.map(v => v / n) as Vec3;
};

const imageMax = (img: LinearImage): Vec3 => {
  const max = [1e-6, 1e-6, 1e-6];
  for (let i = 0; i < img.data.length; i++) {
    max[i % 3] = Math.max(max[i % 3], img.data[i]);
  }
  return max as Vec3;
};

const rectMean = (img: LinearImage, rect: Rect): Vec3 => {
  const sum = [0, 0, 0];
  let count = 0;
  const x0 = Math.round(rect.x);
  const y0 = Math.round(rect.y);
  for (let y = y0; y < y0 + Math.round(rect.h); y++) {
    for (let x = x0; x < x0 + Math.round(rect.w); x++) {
      const i = (y * img.width + x) * 3;
      sum[0] += img.data[i];
      sum[1] += img.data[i + 1];
      sum[2] += img.data[i + 2];
      count++;
    }
  }
  return sum.map(v => v / count) as Vec3;
};

const grayWorldGain = (img: LinearImage): Vec3 => {
  const mean = imageMean(img);
  const avg = (mean[0] + mean[1] + mean[2]) / 3;
  return mean.map(v => avg / v) as Vec3;
};

const whitePointGain = (img: LinearImage): Vec3 => {
  const max = imageMax(img);
  const top = Math.max(...max);
  return max.map(v => top / v) as Vec3;
};

/** 以参考灰色（线性光）为基准，使其变成中性灰且亮度不变 */
const referenceGain = (ref: Vec3): Vec3 => {
  const y = luminance(ref);
  return ref.map(v => y / Math.max(v, 1e-6)) as Vec3;
};

export {
  illuminantGain,
  applyGain,
  bradfordAdapt,
  imageMean,
  rectMean,
  grayWorldGain,
  whitePointGain,
  referenceGain,
  hexToLinear,
  toCodes,
  rgbOfCct,
  luminance
};
