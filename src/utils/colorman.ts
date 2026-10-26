import type {Vec3} from './space';
import {invert3, mulVec} from './spectral';
import type {Matrix} from './spectral';
import {srgbToLinear, linearToSrgb} from './space';

type Point = [number, number];

// ---------- 色度适应变换 ----------

type CatKey = 'xyz' | 'vonkries' | 'bradford' | 'cat02' | 'cat16';

interface CatInfo {
  key: CatKey;
  label: string;
  matrix: Matrix;
  note: string;
}

const CATS: CatInfo[] = [
  {
    key: 'xyz',
    label: 'XYZ 缩放',
    matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    note: '直接在 XYZ 里按白点之比缩放。最简单，但 XYZ 不是视锥空间，误差最大。'
  },
  {
    key: 'vonkries',
    label: 'von Kries（HPE）',
    matrix: [[0.38971, 0.68898, -0.07868], [-0.22981, 1.18340, 0.04641], [0, 0, 1]],
    note: '真正的视锥响应（Hunt–Pointer–Estevez），物理意义最明确，但对蓝色区域偏差较大。'
  },
  {
    key: 'bradford',
    label: 'Bradford',
    matrix: [[0.8951, 0.2664, -0.1614], [-0.7502, 1.7135, 0.0367], [0.0389, -0.0685, 1.0296]],
    note: 'ICC 色彩管理采用的标准矩阵，“锐化”的视锥响应，是实验数据拟合出来的。'
  },
  {
    key: 'cat02',
    label: 'CAT02',
    matrix: [[0.7328, 0.4296, -0.1624], [-0.7036, 1.6975, 0.0061], [0.0030, 0.0136, 0.9834]],
    note: 'CIECAM02 色貌模型里的适应矩阵，同样是锐化的视锥响应。'
  },
  {
    key: 'cat16',
    label: 'CAT16',
    matrix: [[0.401288, 0.650173, -0.051461], [-0.250268, 1.204414, 0.045854], [-0.002079, 0.048952, 0.953127]],
    note: 'CAM16 里的适应矩阵，修正了 CAT02 对某些蓝色会算出负值的问题。'
  }
];

const INVERSES: Record<string, Matrix> = {};
CATS.forEach(c => {
  INVERSES[c.key] = invert3(c.matrix);
});

const catInfo = (key: CatKey): CatInfo => CATS.find(c => c.key === key) as CatInfo;

/** 把 xyz 在白点 src 下的颜色，按 von Kries 缩放方式适应到白点 dst */
const adaptWith = (xyz: Vec3, src: Vec3, dst: Vec3, method: CatKey): Vec3 => {
  const m = catInfo(method).matrix;
  const s = mulVec(m, src);
  const d = mulVec(m, dst);
  const cone = mulVec(m, xyz);
  return mulVec(INVERSES[method], cone.map((v, i) => v * d[i] / s[i]) as Vec3);
};

/** 相对于白点归一化的“锐化视锥响应”，白色恒为 (1, 1, 1) */
const coneRelative = (xyz: Vec3, white: Vec3, method: CatKey): Vec3 => {
  const m = catInfo(method).matrix;
  const s = mulVec(m, white);
  return mulVec(m, xyz).map((v, i) => v / s[i]) as Vec3;
};

// ---------- RGB 色彩空间 ----------

type SpaceKey = 'srgb' | 'p3' | 'rec2020' | 'adobe' | 'prophoto';

interface RgbSpace {
  key: SpaceKey;
  label: string;
  color: string;
  primaries: [Point, Point, Point];
  white: Point;
  /** 'srgb' 表示 sRGB 分段曲线，数字表示纯幂函数的 γ */
  gamma: 'srgb' | number;
  note: string;
}

const WHITE_D65: Point = [0.3127, 0.3290];
const WHITE_D50: Point = [0.3457, 0.3585];

const SPACES: RgbSpace[] = [
  {
    key: 'srgb',
    label: 'sRGB',
    color: '#111111',
    primaries: [[0.64, 0.33], [0.30, 0.60], [0.15, 0.06]],
    white: WHITE_D65,
    gamma: 'srgb',
    note: '网页和大多数显示器的默认空间'
  },
  {
    key: 'p3',
    label: 'Display P3',
    color: '#D9480F',
    primaries: [[0.680, 0.320], [0.265, 0.690], [0.150, 0.060]],
    white: WHITE_D65,
    gamma: 'srgb',
    note: '苹果设备、数字电影放映（DCI-P3 白点不同）使用的宽色域，传输曲线与 sRGB 相同'
  },
  {
    key: 'rec2020',
    label: 'Rec.2020',
    color: '#1971C2',
    primaries: [[0.708, 0.292], [0.170, 0.797], [0.131, 0.046]],
    white: WHITE_D65,
    gamma: 2.4,
    note: '超高清电视的色域，三个原色都是单色光；这里的传输曲线取 γ = 2.4 的纯幂函数'
  },
  {
    key: 'adobe',
    label: 'Adobe RGB (1998)',
    color: '#2F9E44',
    primaries: [[0.64, 0.33], [0.21, 0.71], [0.15, 0.06]],
    white: WHITE_D65,
    gamma: 2.19921875,
    note: '摄影和印刷常用，比 sRGB 多出青绿色区域'
  },
  {
    key: 'prophoto',
    label: 'ProPhoto RGB',
    color: '#9C36B5',
    primaries: [[0.7347, 0.2653], [0.1596, 0.8404], [0.0366, 0.0001]],
    white: WHITE_D50,
    gamma: 1.8,
    note: '覆盖范围极大，蓝原色的 y 只有 0.0001，已经落在光谱轨迹之外（虚构原色），白点为 D50；这里略去了暗部的线性段'
  }
];

const spaceInfo = (key: SpaceKey): RgbSpace => SPACES.find(s => s.key === key) as RgbSpace;

const xyToXyz = ([x, y]: Point): Vec3 => [x / y, 1, (1 - x - y) / y];

const D65_XYZ = xyToXyz(WHITE_D65);

/** 由三原色和白点推出 RGB → XYZ 矩阵（XYZ 相对于该空间自己的白点，Y 白 = 1） */
const rgbToXyzNative = (space: RgbSpace): Matrix => {
  const cols = space.primaries.map(xyToXyz);
  const p: Matrix = [0, 1, 2].map(row => cols.map(c => c[row]));
  const s = mulVec(invert3(p), xyToXyz(space.white));
  return p.map(row => row.map((v, j) => v * s[j]));
};

const matMul = (a: Matrix, b: Matrix): Matrix => {
  return a.map(row => [0, 1, 2].map(j => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));
};

const TO_XYZ: Record<string, Matrix> = {};
const FROM_XYZ: Record<string, Matrix> = {};

/** 矩阵统一换算到 D65 白点：白点不同的空间（ProPhoto）做 Bradford 适应 */
SPACES.forEach(space => {
  const native = rgbToXyzNative(space);
  const white = xyToXyz(space.white);
  const bradford = catInfo('bradford').matrix;
  const s = mulVec(bradford, white);
  const d = mulVec(bradford, D65_XYZ);
  const scale: Matrix = [[d[0] / s[0], 0, 0], [0, d[1] / s[1], 0], [0, 0, d[2] / s[2]]];
  const adapt = matMul(INVERSES.bradford, matMul(scale, bradford));
  TO_XYZ[space.key] = matMul(adapt, native);
  FROM_XYZ[space.key] = invert3(TO_XYZ[space.key]);
});

const decodeChannel = (space: RgbSpace, v: number): number => {
  const sign = v < 0 ? -1 : 1;
  const a = Math.abs(v);
  return sign * (space.gamma === 'srgb' ? srgbToLinear(a) : a ** space.gamma);
};

const encodeChannel = (space: RgbSpace, v: number): number => {
  const sign = v < 0 ? -1 : 1;
  const a = Math.abs(v);
  return sign * (space.gamma === 'srgb' ? linearToSrgb(a) : a ** (1 / space.gamma));
};

/** 编码值（0~1）→ D65 相对 XYZ */
const spaceToXyz = (key: SpaceKey, rgb: Vec3): Vec3 => {
  const space = spaceInfo(key);
  return mulVec(TO_XYZ[key], rgb.map(v => decodeChannel(space, v)) as Vec3);
};

/** D65 相对 XYZ → 编码值（0~1），不截断，超出 0~1 就是色域外 */
const xyzToSpace = (key: SpaceKey, xyz: Vec3): Vec3 => {
  const space = spaceInfo(key);
  return mulVec(FROM_XYZ[key], xyz).map(v => encodeChannel(space, v)) as Vec3;
};

const isInside = (rgb: Vec3, eps = 1e-4): boolean => rgb.every(v => v >= -eps && v <= 1 + eps);

const clip01 = (rgb: Vec3): Vec3 => rgb.map(v => Math.min(1, Math.max(0, v))) as Vec3;

const to8 = (rgb: Vec3): Vec3 => clip01(rgb).map(v => Math.round(v * 255)) as Vec3;

const convertSpace = (from: SpaceKey, to: SpaceKey, rgb: Vec3): Vec3 => xyzToSpace(to, spaceToXyz(from, rgb));

// ---------- 色域面积（xy 或 u'v' 平面上的多边形） ----------

const toUv = ([x, y]: Point): Point => {
  const d = -2 * x + 12 * y + 3;
  return [4 * x / d, 9 * y / d];
};

const signedArea = (poly: Point[]): number => {
  let sum = 0;
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length];
    sum += p[0] * q[1] - q[0] * p[1];
  });
  return sum / 2;
};

const polygonArea = (poly: Point[]): number => Math.abs(signedArea(poly));

const counterClockwise = (poly: Point[]): Point[] => (signedArea(poly) < 0 ? [...poly].reverse() : poly);

/** Sutherland–Hodgman：用凸多边形 clip 裁剪 subject */
const clipPolygon = (subject: Point[], clip: Point[]): Point[] => {
  const edges = counterClockwise(clip);
  let output = counterClockwise(subject);
  edges.forEach((a, i) => {
    const b = edges[(i + 1) % edges.length];
    const side = (p: Point): number => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const input = output;
    output = [];
    input.forEach((p, j) => {
      const q = input[(j + 1) % input.length];
      const sp = side(p);
      const sq = side(q);
      if (sp >= 0) {
        output.push(p);
      }
      if ((sp >= 0) !== (sq >= 0)) {
        const t = sp / (sp - sq);
        output.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    });
  });
  return output;
};

const intersectionArea = (a: Point[], b: Point[]): number => {
  const clipped = clipPolygon(a, b);
  return clipped.length < 3 ? 0 : polygonArea(clipped);
};

export {
  toUv,
  polygonArea,
  intersectionArea,
  Point,
  CatKey,
  CatInfo,
  CATS,
  SpaceKey,
  RgbSpace,
  SPACES,
  WHITE_D65,
  D65_XYZ,
  catInfo,
  adaptWith,
  coneRelative,
  spaceInfo,
  xyToXyz,
  matMul,
  TO_XYZ,
  FROM_XYZ,
  spaceToXyz,
  xyzToSpace,
  isInside,
  clip01,
  to8,
  convertSpace
};
