import {Vec3, rgbToLab, rgbToOklch} from './space';

export type SolidModel = 'rgb' | 'hsv' | 'hsl' | 'hwb' | 'lab' | 'oklch';

export interface Anchor {
  text: string;
  pos: Vec3;
}

export interface Solid {
  count: number;
  pos: Float32Array; // xyz 交替，范围约 [-1, 1]
  color: Uint32Array; // 小端 ABGR，可直接写入 ImageData
  anchors: Anchor[];
}

export interface View {
  width: number;
  height: number;
  yaw: number;
  pitch: number;
  zoom: number;
  cut: number; // 0~1，沿模型 z 轴切掉的比例
  pointSize: number;
}

const pack = (r: number, g: number, b: number): number => {
  return (0xFF000000 | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0;
};

const hsvToRgb = (h: number, s: number, v: number): Vec3 => {
  const k = (n: number) => (n + h / 60) % 6;
  const f = (n: number) => v * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
  return [f(5) * 255, f(3) * 255, f(1) * 255];
};

const hslToRgb = (h: number, s: number, l: number): Vec3 => {
  const a = s * Math.min(l, 1 - l);
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
};

const hwbToRgb = (h: number, w: number, b: number): Vec3 => {
  if (w + b >= 1) {
    const gray = w / (w + b) * 255;
    return [gray, gray, gray];
  }
  const base = hsvToRgb(h, 1, 1);
  return base.map(c => c * (1 - w - b) + w * 255) as Vec3;
};

const createBuilder = () => {
  const pos: number[] = [];
  const color: number[] = [];
  return {
    add(x: number, y: number, z: number, rgb: Vec3) {
      pos.push(x, y, z);
      color.push(pack(rgb[0], rgb[1], rgb[2]));
    },
    done(anchors: Anchor[]): Solid {
      return {
        count: color.length,
        pos: Float32Array.from(pos),
        color: Uint32Array.from(color),
        anchors
      };
    }
  };
};

const AXIS_ANCHORS: Anchor[] = [
  {text: '白', pos: [0, 1.08, 0]},
  {text: '黑', pos: [0, -1.1, 0]}
];

// 每个色相上的 (半径 r, 高度 y, 颜色) 采样，ring 密度与半径成正比，使面积密度大致均匀
type Cell = [number, number, Vec3];
type HueSampler = (hue: number, a: number, b: number) => Cell;

const buildHueSolid = (
  n: number,
  slice: number | null,
  grid: Array<[number, number]>,
  sampler: HueSampler
): Solid => {
  const builder = createBuilder();
  const maxRing = Math.round(n * 8);
  const rad = (h: number) => h * Math.PI / 180;

  if (slice !== null) {
    [slice, slice + 180].forEach(hue => {
      grid.forEach(([a, b]) => {
        const [r, y, rgb] = sampler(hue, a, b);
        builder.add(Math.cos(rad(hue)) * r, y, Math.sin(rad(hue)) * r, rgb);
      });
    });
    return builder.done(AXIS_ANCHORS);
  }

  grid.forEach(([a, b], index) => {
    const [r] = sampler(0, a, b);
    const count = r < 1e-6 ? 1 : Math.max(3, Math.round(maxRing * r));
    const shift = (index % 2) * 0.5;
    for (let k = 0; k < count; k++) {
      const hue = 360 * (k + shift) / count;
      const [radius, height, rgb] = sampler(hue, a, b);
      builder.add(Math.cos(rad(hue)) * radius, height, Math.sin(rad(hue)) * radius, rgb);
    }
  });
  return builder.done(AXIS_ANCHORS);
};

const gridOf = (na: number, nb: number, triangle = false): Array<[number, number]> => {
  const result: Array<[number, number]> = [];
  for (let i = 0; i <= na; i++) {
    const limit = triangle ? nb - Math.round(i * nb / na) : nb;
    for (let j = 0; j <= limit; j++) {
      result.push([i / na, j / nb]);
    }
  }
  return result;
};

const buildRgb = (n: number): Solid => {
  const builder = createBuilder();
  const s = 0.8;
  for (let r = 0; r <= n; r++) {
    for (let g = 0; g <= n; g++) {
      for (let b = 0; b <= n; b++) {
        builder.add((r / n * 2 - 1) * s, (g / n * 2 - 1) * s, (b / n * 2 - 1) * s, [r / n * 255, g / n * 255, b / n * 255]);
      }
    }
  }
  return builder.done([
    {text: '白', pos: [s, s, s]},
    {text: '黑', pos: [-s, -s, -s]},
    {text: '红', pos: [s, -s, -s]},
    {text: '绿', pos: [-s, s, -s]},
    {text: '蓝', pos: [-s, -s, s]}
  ]);
};

const buildPerceptual = (n: number, model: 'lab' | 'oklch'): Solid => {
  const builder = createBuilder();
  for (let r = 0; r <= n; r++) {
    for (let g = 0; g <= n; g++) {
      for (let b = 0; b <= n; b++) {
        const rgb: Vec3 = [r / n * 255, g / n * 255, b / n * 255];
        if (model === 'lab') {
          const [l, a, bb] = rgbToLab(rgb);
          builder.add(a / 110, l / 50 - 1, bb / 110, rgb);
        } else {
          const [l, c, h] = rgbToOklch(rgb);
          const rad = h * Math.PI / 180;
          builder.add(c * Math.cos(rad) / 0.33, l * 2 - 1, c * Math.sin(rad) / 0.33, rgb);
        }
      }
    }
  }
  return builder.done([
    {text: model === 'lab' ? 'L*=100' : 'L=1', pos: [0, 1.08, 0]},
    {text: model === 'lab' ? 'L*=0' : 'L=0', pos: [0, -1.1, 0]}
  ]);
};

const buildSolid = (model: SolidModel, density: number, slice: number | null = null): Solid => {
  const n = Math.round(density);
  const fine = slice !== null ? Math.round(n * 1.6) : n;
  switch (model) {
    case 'rgb':
      return buildRgb(n);
    case 'hsv':
      return buildHueSolid(n, slice, gridOf(Math.ceil(fine / 2), fine), (hue, s, v) => {
        return [s * v, v * 2 - 1, hsvToRgb(hue, s, v)];
      });
    case 'hsl':
      return buildHueSolid(n, slice, gridOf(Math.ceil(fine / 2), fine), (hue, s, l) => {
        return [s * (1 - Math.abs(2 * l - 1)), l * 2 - 1, hslToRgb(hue, s, l)];
      });
    case 'hwb':
      return buildHueSolid(n, slice, gridOf(fine, fine, true), (hue, w, b) => {
        return [Math.max(0, 1 - w - b), (1 - b) * 2 - 1, hwbToRgb(hue, w, b)];
      });
    default:
      return buildPerceptual(Math.min(n, 30), model);
  }
};

const BACKGROUND = pack(128, 128, 128);
const CAMERA = 4.2;

/** 把模型坐标投影到画布，返回 [x, y, 深度]；深度越大离观察者越近 */
const project = (view: View, x: number, y: number, z: number): Vec3 => {
  const cy = Math.cos(view.yaw);
  const sy = Math.sin(view.yaw);
  const cp = Math.cos(view.pitch);
  const sp = Math.sin(view.pitch);
  const scale = Math.min(view.width, view.height) * 0.27 * view.zoom;
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const y2 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;
  const f = CAMERA / (CAMERA - z2);
  return [view.width / 2 + x1 * scale * f, view.height / 2 - y2 * scale * f, z2];
};

/** 软件渲染：逐点写入带深度缓冲的像素，无需排序 */
const renderSolid = (solid: Solid, view: View, img: ImageData, depth: Float32Array): void => {
  const buf = new Uint32Array(img.data.buffer);
  buf.fill(BACKGROUND);
  depth.fill(-1e9);

  const {width, height, yaw, pitch, zoom, cut, pointSize} = view;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const scale = Math.min(width, height) * 0.27 * zoom;
  const limit = 1.12 - 2.24 * cut;
  const {pos, color, count} = solid;

  for (let i = 0; i < count; i++) {
    const x = pos[3 * i];
    const y = pos[3 * i + 1];
    const z = pos[3 * i + 2];
    if (z > limit) {
      continue;
    }
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const y2 = y * cp - z1 * sp;
    const z2 = y * sp + z1 * cp;
    const f = CAMERA / (CAMERA - z2);
    const size = Math.max(1, Math.round(pointSize * f));
    const x0 = Math.round(width / 2 + x1 * scale * f - size / 2);
    const y0 = Math.round(height / 2 - y2 * scale * f - size / 2);
    const xEnd = Math.min(width, x0 + size);
    const yEnd = Math.min(height, y0 + size);
    for (let yy = Math.max(0, y0); yy < yEnd; yy++) {
      const row = yy * width;
      for (let xx = Math.max(0, x0); xx < xEnd; xx++) {
        if (z2 > depth[row + xx]) {
          depth[row + xx] = z2;
          buf[row + xx] = color[i];
        }
      }
    }
  }
};

export {
  buildSolid,
  renderSolid,
  project
};
