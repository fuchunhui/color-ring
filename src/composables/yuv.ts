type Matrix = number[][];
type Triple = [number, number, number];

interface YuvModel {
  key: string;
  label: string;
  names: [string, string, string];
  matrix: Matrix; // RGB(0~255) -> [Y, U, V] 去掉偏移后的值
  inverse: Matrix;
  offset: Triple;
  range: [number, number]; // U、V 平面显示的取值范围
}

const invert3 = (m: Matrix): Matrix => {
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

const makeModel = (
  key: string,
  label: string,
  names: [string, string, string],
  matrix: Matrix,
  offset: Triple,
  range: [number, number]
): YuvModel => ({key, label, names, matrix, inverse: invert3(matrix), offset, range});

const MODELS: YuvModel[] = [
  makeModel('bt601', 'BT.601 YCbCr（标清）', ['Y', 'Cb', 'Cr'], [
    [0.299, 0.587, 0.114],
    [-0.168736, -0.331264, 0.5],
    [0.5, -0.418688, -0.081312]
  ], [0, 128, 128], [0, 255]),
  makeModel('bt709', 'BT.709 YCbCr（高清）', ['Y', 'Cb', 'Cr'], [
    [0.2126, 0.7152, 0.0722],
    [-0.114572, -0.385428, 0.5],
    [0.5, -0.454153, -0.045847]
  ], [0, 128, 128], [0, 255]),
  makeModel('yiq', 'YIQ（NTSC）', ['Y', 'I', 'Q'], [
    [0.299, 0.587, 0.114],
    [0.595716, -0.274453, -0.321263],
    [0.211456, -0.522591, 0.311135]
  ], [0, 0, 0], [-152, 152])
];

const SUBSAMPLING = [
  {key: '444', label: '4:4:4（不抽样）', fx: 1, fy: 1},
  {key: '422', label: '4:2:2（水平减半）', fx: 2, fy: 1},
  {key: '420', label: '4:2:0（水平、垂直都减半）', fx: 2, fy: 2},
  {key: '411', label: '4:1:1（水平缩小到 1/4）', fx: 4, fy: 1}
];

const byte = (n: number): number => Math.min(255, Math.max(0, Math.round(n)));

const forward = (model: YuvModel, r: number, g: number, b: number): Triple => {
  const m = model.matrix;
  const o = model.offset;
  return [
    m[0][0] * r + m[0][1] * g + m[0][2] * b + o[0],
    m[1][0] * r + m[1][1] * g + m[1][2] * b + o[1],
    m[2][0] * r + m[2][1] * g + m[2][2] * b + o[2]
  ];
};

/** 未截断的反变换结果，可用于判断是否超出 sRGB 色域 */
const inverseRaw = (model: YuvModel, y: number, u: number, v: number): Triple => {
  const m = model.inverse;
  const a = y - model.offset[0];
  const b = u - model.offset[1];
  const c = v - model.offset[2];
  return [
    m[0][0] * a + m[0][1] * b + m[0][2] * c,
    m[1][0] * a + m[1][1] * b + m[1][2] * c,
    m[2][0] * a + m[2][1] * b + m[2][2] * c
  ];
};

const inverse = (model: YuvModel, y: number, u: number, v: number): Triple => {
  const [r, g, b] = inverseRaw(model, y, u, v);
  return [byte(r), byte(g), byte(b)];
};

const term = (coef: number, name: string, first: boolean): string => {
  const sign = coef < 0 ? '-' : '+';
  const body = `${Math.abs(coef).toFixed(4)} ${name}`;
  return first ? `${coef < 0 ? '-' : ''}${body}` : ` ${sign} ${body}`;
};

/** 生成 “Y = 0.2990 R + 0.5870 G + 0.1140 B” 形式的公式文本 */
const formulas = (model: YuvModel): string[] => {
  return model.matrix.map((row, i) => {
    const offset = model.offset[i] ? ` + ${model.offset[i]}` : '';
    const body = row.map((c, j) => term(c, 'RGB'[j], j === 0)).join('');
    return `${model.names[i].padEnd(2, ' ')} = ${body}${offset}`;
  });
};

type Channel = 'y' | 'u' | 'v' | 'chroma';

/** 把图像拆成亮度或色度通道：u、v 通道以 Y=128 的中性灰为底显示 */
const decompose = (src: ImageData, model: YuvModel, channel: Channel): ImageData => {
  const out = new ImageData(src.width, src.height);
  const s = src.data;
  const d = out.data;
  const neutral = model.offset;
  for (let i = 0; i < s.length; i += 4) {
    const [y, u, v] = forward(model, s[i], s[i + 1], s[i + 2]);
    let rgb: Triple;
    if (channel === 'y') {
      const gray = byte(y);
      rgb = [gray, gray, gray];
    } else if (channel === 'u') {
      rgb = inverse(model, 128, u, neutral[2]);
    } else if (channel === 'v') {
      rgb = inverse(model, 128, neutral[1], v);
    } else {
      rgb = inverse(model, 128, u, v);
    }
    d[i] = rgb[0];
    d[i + 1] = rgb[1];
    d[i + 2] = rgb[2];
    d[i + 3] = 255;
  }
  return out;
};

/** 色度子采样：亮度保持全分辨率，U、V 按 fx×fy 的块取平均后再复制回每个像素 */
const subsample = (src: ImageData, model: YuvModel, fx: number, fy: number): ImageData => {
  const {width, height} = src;
  const s = src.data;
  const planes = [0, 1, 2].map(() => new Float32Array(width * height));
  for (let p = 0; p < width * height; p++) {
    const yuv = forward(model, s[p * 4], s[p * 4 + 1], s[p * 4 + 2]);
    planes[0][p] = yuv[0];
    planes[1][p] = yuv[1];
    planes[2][p] = yuv[2];
  }

  if (fx > 1 || fy > 1) {
    for (let by = 0; by < height; by += fy) {
      for (let bx = 0; bx < width; bx += fx) {
        const x1 = Math.min(bx + fx, width);
        const y1 = Math.min(by + fy, height);
        const count = (x1 - bx) * (y1 - by);
        [1, 2].forEach(c => {
          let sum = 0;
          for (let y = by; y < y1; y++) {
            for (let x = bx; x < x1; x++) {
              sum += planes[c][y * width + x];
            }
          }
          const avg = sum / count;
          for (let y = by; y < y1; y++) {
            for (let x = bx; x < x1; x++) {
              planes[c][y * width + x] = avg;
            }
          }
        });
      }
    }
  }

  const out = new ImageData(width, height);
  for (let p = 0; p < width * height; p++) {
    const [r, g, b] = inverse(model, planes[0][p], planes[1][p], planes[2][p]);
    out.data[p * 4] = r;
    out.data[p * 4 + 1] = g;
    out.data[p * 4 + 2] = b;
    out.data[p * 4 + 3] = 255;
  }
  return out;
};

/** 固定 Y 时的 U-V 平面：横轴 U，纵轴 V（向上增大），超出 sRGB 色域的像素透明 */
const uvPlane = (model: YuvModel, y: number, size: number): ImageData => {
  const out = new ImageData(size, size);
  const [lo, hi] = model.range;
  const tolerance = 0.5;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const u = lo + (hi - lo) * i / (size - 1);
      const v = hi - (hi - lo) * j / (size - 1);
      const raw = inverseRaw(model, y, u, v);
      const p = (j * size + i) * 4;
      if (raw.every(n => n >= -tolerance && n <= 255 + tolerance)) {
        out.data[p] = byte(raw[0]);
        out.data[p + 1] = byte(raw[1]);
        out.data[p + 2] = byte(raw[2]);
        out.data[p + 3] = 255;
      }
    }
  }
  return out;
};

export {
  MODELS,
  SUBSAMPLING,
  formulas,
  forward,
  decompose,
  subsample,
  uvPlane,
  YuvModel,
  Channel
};
