import type {Vec3} from './space';
import {cmf, wavelengthToXyz, xyzToXy} from './cie';
import type {Point} from './cie';
import {toUv, polygonArea, intersectionArea} from './colorman';

type Spd = (l: number) => number;

interface DisplayDef {
  key: string;
  label: string;
  color: string;
  note: string;
  primaries: [Spd, Spd, Spd];
}

const gauss = (l: number, mu: number, s1: number, s2 = s1): number => {
  const t = (l - mu) / (l < mu ? s1 : s2);
  return Math.exp(-0.5 * t * t);
};

/**
 * 五种显示技术的三原色光谱，全部是按公开描述的峰位和宽度搭的示意曲线，不是某款面板的实测数据。
 * 宽度参数是高斯的标准差 σ，半高全宽 FWHM ≈ 2.355σ。
 */
const buildDisplays = (): DisplayDef[] => [
  {
    key: 'ccfl',
    label: '冷阴极荧光灯（CCFL）液晶',
    color: '#868E96',
    note: '荧光粉的线状发射（汞 436 nm、铽 545 nm、铕 611 nm）加上宽的荧光带，再经滤色片。',
    primaries: [
      l => gauss(l, 611, 2.5) + 0.5 * gauss(l, 630, 12) + 0.25 * gauss(l, 593, 4) + 0.12 * gauss(l, 545, 2.5),
      l => gauss(l, 545, 2.5) + 0.35 * gauss(l, 487, 3) + 0.25 * gauss(l, 525, 22) + 0.15 * gauss(l, 580, 6),
      l => 0.9 * gauss(l, 452, 18) + gauss(l, 436, 2) + 0.35 * gauss(l, 405, 2)
    ]
  },
  {
    key: 'wled',
    label: '白光 LED + 滤色片液晶',
    color: '#E67700',
    note: '蓝光芯片 + 宽带黄色荧光粉得到白光，红、绿原色是荧光粉光谱被滤色片切出来的，FWHM 约 50~70 nm。',
    primaries: [
      l => gauss(l, 625, 28, 22) + 0.03 * gauss(l, 450, 10),
      l => 0.9 * gauss(l, 535, 24, 28) + 0.04 * gauss(l, 450, 10),
      l => gauss(l, 450, 9) + 0.04 * gauss(l, 520, 40)
    ]
  },
  {
    key: 'qd',
    label: '量子点（QD）液晶',
    color: '#2F9E44',
    note: '蓝光 LED 激发量子点发出窄带红、绿光，半峰宽约 20~30 nm。',
    primaries: [
      l => gauss(l, 630, 11),
      l => gauss(l, 530, 10),
      l => gauss(l, 450, 8)
    ]
  },
  {
    key: 'oled',
    label: 'OLED',
    color: '#1971C2',
    note: '有机发光材料直接发光，半峰宽约 30~50 nm，比 QD 宽一些。',
    primaries: [
      l => gauss(l, 620, 18),
      l => gauss(l, 525, 17),
      l => gauss(l, 460, 15)
    ]
  },
  {
    key: 'laser',
    label: 'RGB 激光',
    color: '#C2255C',
    note: '三条近乎单色的谱线（半峰宽约 3 nm），色域最大，但激光散斑和成本是问题。',
    primaries: [
      l => gauss(l, 638, 1.2),
      l => gauss(l, 525, 1.2),
      l => gauss(l, 450, 1.2)
    ]
  }
];

const DISPLAYS = buildDisplays();

const L_MIN = 380;
const L_MAX = 780;

const D65_XY: Point = [0.3127, 0.3290];

const xyzToUv = (xyz: Vec3): Point => toUv(xyzToXy(xyz));

/** 光谱 × 单色光 XYZ（色度取标准轨迹表，亮度取 ȳ 拟合），再按 Y = 1 归一化 */
const primaryXyzAccurate = (spd: Spd): Vec3 => {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let l = L_MIN; l <= L_MAX; l++) {
    const w = spd(l);
    const c = wavelengthToXyz(l);
    x += w * c[0];
    y += w * c[1];
    z += w * c[2];
  }
  return [x / y, 1, z / y];
};

type Cmf = (l: number) => Vec3;

const integrate = (spd: Spd, observer: Cmf): Vec3 => {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let l = L_MIN; l <= L_MAX; l++) {
    const w = spd(l);
    const c = observer(l);
    x += w * c[0];
    y += w * c[1];
    z += w * c[2];
  }
  return [x, y, z];
};

const solve3 = (cols: Vec3[], target: Vec3): Vec3 => {
  const [a, b, c] = cols;
  const m = [
    [a[0], b[0], c[0]],
    [a[1], b[1], c[1]],
    [a[2], b[2], c[2]]
  ];
  const det = (n: number[][]): number => {
    return n[0][0] * (n[1][1] * n[2][2] - n[1][2] * n[2][1])
      - n[0][1] * (n[1][0] * n[2][2] - n[1][2] * n[2][0])
      + n[0][2] * (n[1][0] * n[2][1] - n[1][1] * n[2][0]);
  };
  const d = det(m);
  return [0, 1, 2].map(k => {
    const mk = m.map((row, i) => row.map((v, j) => (j === k ? target[i] : v)));
    return det(mk) / d;
  }) as Vec3;
};

interface DisplayResult {
  key: string;
  label: string;
  color: string;
  note: string;
  xy: [Point, Point, Point];
  areaRatio: number;
  coverRec709: number;
  coverP3: number;
  coverRec2020: number;
}

const REC709: Point[] = [[0.64, 0.33], [0.30, 0.60], [0.15, 0.06]];
const P3: Point[] = [[0.680, 0.320], [0.265, 0.690], [0.150, 0.060]];
const REC2020: Point[] = [[0.708, 0.292], [0.170, 0.797], [0.131, 0.046]];

let cache: DisplayResult[] | null = null;

const computeDisplays = (): DisplayResult[] => {
  if (cache) {
    return cache;
  }
  const area709 = polygonArea(REC709);
  cache = DISPLAYS.map(def => {
    const xy = def.primaries.map(spd => xyzToXy(primaryXyzAccurate(spd))) as [Point, Point, Point];
    const area = polygonArea(xy);
    return {
      key: def.key,
      label: def.label,
      color: def.color,
      note: def.note,
      xy,
      areaRatio: area / area709,
      coverRec709: intersectionArea(xy, REC709) / area709,
      coverP3: intersectionArea(xy, P3) / polygonArea(P3),
      coverRec2020: intersectionArea(xy, REC2020) / polygonArea(REC2020)
    };
  });
  return cache;
};

interface ObserverRow {
  key: string;
  label: string;
  /** 偏移 δ 的示意观察者看到的白点 u'v' 与标准观察者的距离 */
  du: number[];
  /** 偏移 δ 时白点 xy */
  xy: Point[];
}

const OBSERVER_SHIFTS = [-10, -5, 5, 10];

const stdCmf: Cmf = l => cmf(l);

/** 每台显示器用自己的三原色拼出 D65（对标准观察者），再用平移了匹配函数的示意观察者去看 */
const observerTable = (): ObserverRow[] => {
  const targetXyz: Vec3 = [D65_XY[0] / D65_XY[1], 1, (1 - D65_XY[0] - D65_XY[1]) / D65_XY[1]];
  const stdUv = toUv(D65_XY);
  return DISPLAYS.map(def => {
    const prim = def.primaries.map(spd => integrate(spd, stdCmf));
    const normalized = prim.map(p => p.map(v => v / p[1]) as Vec3);
    const w = solve3(normalized, targetXyz);
    const white: Spd = l => {
      let s = 0;
      def.primaries.forEach((spd, i) => {
        s += w[i] * spd(l) / prim[i][1];
      });
      return s;
    };
    const rows = OBSERVER_SHIFTS.map(delta => {
      const xyz = integrate(white, l => cmf(l - delta));
      const xy = xyzToXy(xyz);
      const uv = toUv(xy);
      return {du: Math.hypot(uv[0] - stdUv[0], uv[1] - stdUv[1]), xy};
    });
    return {
      key: def.key,
      label: def.label,
      du: rows.map(r => r.du),
      xy: rows.map(r => r.xy)
    };
  });
};

/** 平滑的光谱曲线，供画图用（1 nm 采样，峰值归一化到 1） */
const sampleSpd = (spd: Spd): number[] => {
  const values: number[] = [];
  for (let l = L_MIN; l <= L_MAX; l++) {
    values.push(spd(l));
  }
  const max = Math.max(...values) || 1;
  return values.map(v => v / max);
};

export {
  DisplayDef,
  DisplayResult,
  ObserverRow,
  DISPLAYS,
  OBSERVER_SHIFTS,
  REC709,
  P3,
  REC2020,
  D65_XY,
  xyzToUv,
  computeDisplays,
  observerTable,
  sampleSpd
};
