import {srgbToLinear, linearToSrgb} from './space';

type Matrix = number[][];

const IDENTITY: Matrix = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

const LUMA = [0.2126, 0.7152, 0.0722];

// Machado, Oliveira & Fernandes (2009)，严重程度 1.0，作用于线性RGB
const MATRICES: Record<string, Matrix> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998]
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.011820, 0.042940, 0.968881]
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.303900]
  ],
  achromatopsia: [LUMA, LUMA, LUMA]
};

const CVD_TYPES = [
  {key: 'protanopia', label: '红色盲（Protanopia）'},
  {key: 'deuteranopia', label: '绿色盲（Deuteranopia）'},
  {key: 'tritanopia', label: '蓝黄色盲（Tritanopia）'},
  {key: 'achromatopsia', label: '全色盲（Achromatopsia）'}
];

const DECODE = Array.from({length: 256}, (_, i) => srgbToLinear(i / 255));

const ENCODE_STEPS = 4095;
const ENCODE = Array.from({length: ENCODE_STEPS + 1}, (_, i) => {
  return Math.round(Math.min(1, Math.max(0, linearToSrgb(i / ENCODE_STEPS))) * 255);
});

const encode = (v: number): number => ENCODE[Math.round(Math.min(1, Math.max(0, v)) * ENCODE_STEPS)];

/** 在单位矩阵与目标矩阵之间线性插值，severity 取 0~1 */
const blendMatrix = (matrix: Matrix, severity: number): Matrix => {
  return matrix.map((row, i) => row.map((v, j) => IDENTITY[i][j] * (1 - severity) + v * severity));
};

const simulate = (src: ImageData, type: string, severity = 1): ImageData => {
  const m = blendMatrix(MATRICES[type], severity);
  const out = new ImageData(src.width, src.height);
  const s = src.data;
  const d = out.data;
  for (let i = 0; i < s.length; i += 4) {
    const r = DECODE[s[i]];
    const g = DECODE[s[i + 1]];
    const b = DECODE[s[i + 2]];
    d[i] = encode(m[0][0] * r + m[0][1] * g + m[0][2] * b);
    d[i + 1] = encode(m[1][0] * r + m[1][1] * g + m[1][2] * b);
    d[i + 2] = encode(m[2][0] * r + m[2][1] * g + m[2][2] * b);
    d[i + 3] = s[i + 3];
  }
  return out;
};

export {
  CVD_TYPES,
  MATRICES,
  simulate
};
