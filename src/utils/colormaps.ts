import {Vec3, rgbToOklab, oklabToRgb} from './space';

type MapKind = 'sequential' | 'diverging' | 'rainbow' | 'cyclic';

interface Colormap {
  key: string;
  label: string;
  kind: MapKind;
  note: string;
  entries: Vec3[]; // 256 个 sRGB 字节色
}

interface Analysis {
  lMin: number;
  lMax: number;
  monotonic: boolean;
  speeds: number[]; // 每隔 STEP 项的 ΔE（OKLab 距离 × 100）折算成的每项速度
  ratio: number; // 最大速度 / 最小速度
  lightness: number[]; // 每项的 OKLab L
}

const SIZE = 256;
const STEP = 8;

const hex = (code: string): Vec3 => {
  const n = parseInt(code.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** 在若干等间距锚点之间于 OKLab 空间线性插值 */
const interpolateOklab = (anchors: string[]): Vec3[] => {
  const labs = anchors.map(code => rgbToOklab(hex(code)));
  return Array.from({length: SIZE}, (_, i) => {
    const pos = i / (SIZE - 1) * (labs.length - 1);
    const k = Math.min(labs.length - 2, Math.floor(pos));
    const f = pos - k;
    const lab = [0, 1, 2].map(c => labs[k][c] * (1 - f) + labs[k + 1][c] * f) as Vec3;
    return oklabToRgb(lab).rgb;
  });
};

const byte = (v: number): number => Math.round(Math.min(1, Math.max(0, v)) * 255);

/** matplotlib 的 jet：每个通道是分段线性函数 */
const jetChannel = (t: number, nodes: number[][]): number => {
  for (let i = 1; i < nodes.length; i++) {
    if (t <= nodes[i][0]) {
      const [x0, y0] = nodes[i - 1];
      const [x1, y1] = nodes[i];
      return y0 + (y1 - y0) * (t - x0) / (x1 - x0);
    }
  }
  return nodes[nodes.length - 1][1];
};

const jetEntries = (): Vec3[] => Array.from({length: SIZE}, (_, i) => {
  const t = i / (SIZE - 1);
  return [
    byte(jetChannel(t, [[0, 0], [0.35, 0], [0.66, 1], [0.89, 1], [1, 0.5]])),
    byte(jetChannel(t, [[0, 0], [0.125, 0], [0.375, 1], [0.64, 1], [0.91, 0], [1, 0]])),
    byte(jetChannel(t, [[0, 0.5], [0.11, 1], [0.34, 1], [0.65, 0], [1, 0]]))
  ];
});

const hsvEntries = (): Vec3[] => Array.from({length: SIZE}, (_, i) => {
  const h: number = i / SIZE * 6;
  const f = (n: number): number => {
    const k = (n + h) % 6;
    return byte(1 - Math.max(0, Math.min(k, 4 - k, 1)));
  };
  return [f(5), f(3), f(1)];
});

const grayEntries = (): Vec3[] => Array.from({length: SIZE}, (_, i) => [i, i, i]);

const reverse = (anchors: string[]): string[] => anchors.slice().reverse();

const COLORMAPS: Colormap[] = [
  {
    key: 'jet',
    label: 'jet',
    kind: 'rainbow',
    note: '经典彩虹图（matplotlib 的分段线性定义），亮度忽高忽低，中段的黄、青最亮，产生“假边缘”。',
    entries: jetEntries()
  },
  {
    key: 'hsv',
    label: 'hsv',
    kind: 'cyclic',
    note: '色相环一圈，首尾都是红，只适合真正循环的数据（如角度、风向）。',
    entries: hsvEntries()
  },
  {
    key: 'turbo',
    label: 'turbo（近似）',
    kind: 'rainbow',
    note: 'Google 为替代 jet 设计的彩虹图，亮度更平滑，但并不单调。',
    entries: interpolateOklab([
      '#30123b', '#4145ab', '#4675ed', '#39a2fc', '#1bcfd4', '#24eca6', '#61fc6c',
      '#a4fc3b', '#d1e834', '#f9ba38', '#fe922a', '#ea5f0e', '#c42503', '#7a0403'
    ])
  },
  {
    key: 'viridis',
    label: 'viridis',
    kind: 'sequential',
    note: 'matplotlib 的默认配色：亮度单调上升、感知速度均匀、色盲友好、灰度打印也能读。',
    entries: interpolateOklab(['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'])
  },
  {
    key: 'plasma',
    label: 'plasma',
    kind: 'sequential',
    note: '同系列的另一张图，从深蓝紫到亮黄，亮度单调。',
    entries: interpolateOklab(['#0d0887', '#7e03a8', '#cc4778', '#f89540', '#f0f921'])
  },
  {
    key: 'inferno',
    label: 'inferno（近似）',
    kind: 'sequential',
    note: '从黑到亮黄，对比强烈，适合需要突出高值的图。',
    entries: interpolateOklab(['#000004', '#420a68', '#932667', '#dd513a', '#fca50a', '#fcffa4'])
  },
  {
    key: 'magma',
    label: 'magma（近似）',
    kind: 'sequential',
    note: '从黑到浅粉黄，比 inferno 柔和。',
    entries: interpolateOklab(['#000004', '#3b0f70', '#8c2981', '#de4968', '#fe9f6d', '#fcfdbf'])
  },
  {
    key: 'cividis',
    label: 'cividis（近似）',
    kind: 'sequential',
    note: '为色觉缺陷者优化，只用蓝到黄两端，红色盲、绿色盲看到的几乎和正常一样。',
    entries: interpolateOklab(['#00204d', '#31446b', '#666970', '#958f78', '#cbba69', '#ffea46'])
  },
  {
    key: 'gray',
    label: 'gray',
    kind: 'sequential',
    note: '纯灰度，亮度严格单调，是任何配色图的参照。',
    entries: grayEntries()
  },
  {
    key: 'coolwarm',
    label: 'coolwarm（近似）',
    kind: 'diverging',
    note: '以浅灰为中点的发散图，两端为蓝和红，适合有明确“零点”的数据。',
    entries: interpolateOklab(['#3b4cc0', '#8db0fe', '#dddddd', '#f4987a', '#b40426'])
  },
  {
    key: 'rdbu',
    label: 'RdBu（反向，ColorBrewer）',
    kind: 'diverging',
    note: 'ColorBrewer 的红蓝发散色，这里反向使用，低值为蓝、高值为红，中点近白。',
    entries: interpolateOklab(reverse([
      '#67001f', '#b2182b', '#d6604d', '#f4a582', '#fddbc7', '#f7f7f7',
      '#d1e5f0', '#92c5de', '#4393c3', '#2166ac', '#053061'
    ]))
  },
  {
    key: 'spectral',
    label: 'Spectral（反向，ColorBrewer）',
    kind: 'rainbow',
    note: '又一张彩虹风格的发散图，亮度在中间（黄）最高，容易被误读为“中间值最大”。',
    entries: interpolateOklab(reverse([
      '#9e0142', '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#ffffbf',
      '#e6f598', '#abdda4', '#66c2a5', '#3288bd', '#5e4fa2'
    ]))
  }
];

const monotone = (values: number[], tol: number): number => {
  let up = true;
  let down = true;
  for (let i = 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    if (d < -tol) {
      up = false;
    }
    if (d > tol) {
      down = false;
    }
  }
  return up ? 1 : down ? -1 : 0;
};

/** 在 OKLab 里度量：L 是否单调，相邻两项差异（感知速度）是否均匀 */
const analyse = (map: Colormap): Analysis => {
  const labs = map.entries.map(rgb => rgbToOklab(rgb));
  const lightness = labs.map(lab => lab[0]);
  // 8 位量化会让相邻两项恰好相同，所以每隔 STEP 项取一次差，再折算成每项的平均速度
  const speeds = labs.slice(STEP).map((lab, i) => {
    return Math.hypot(lab[0] - labs[i][0], lab[1] - labs[i][1], lab[2] - labs[i][2]) * 100 / STEP;
  });
  const half = Math.floor(lightness.length / 2);
  const tol = 0.002;
  let monotonic = monotone(lightness, tol) !== 0;
  if (map.kind === 'diverging') {
    const a = monotone(lightness.slice(0, half), tol);
    const b = monotone(lightness.slice(half), tol);
    monotonic = a !== 0 && b !== 0 && a !== b;
  }
  return {
    lMin: Math.min(...lightness),
    lMax: Math.max(...lightness),
    monotonic,
    speeds,
    ratio: Math.max(...speeds) / Math.max(1e-6, Math.min(...speeds)),
    lightness
  };
};

export {
  MapKind,
  Colormap,
  Analysis,
  SIZE,
  COLORMAPS,
  analyse
};
