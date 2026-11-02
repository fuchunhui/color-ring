import {rgbToLab, rgbToOklab, labToRgb, oklabToRgb} from './space';
import type {Vec3} from './space';
import {deltaE2000} from './deltae';

const W = 240;
const H = 150;
const PIXELS = W * H;
const STEP = 3;
const ACCENT_KEPT = 10;

type Rng = () => number;
type Buf = Uint8ClampedArray;
type SpaceKey = 'srgb' | 'oklab' | 'lab';
type AlgoKey = 'median' | 'km-srgb' | 'km-oklab' | 'km-lab';

const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ---------- 程序生成的场景（固定种子，每次都一样）----------

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t
];

const setPx = (b: Buf, x: number, y: number, c: Vec3): void => {
  if (x < 0 || y < 0 || x >= W || y >= H) {
    return;
  }
  const i = (y * W + x) * 4;
  b[i] = c[0];
  b[i + 1] = c[1];
  b[i + 2] = c[2];
  b[i + 3] = 255;
};

const rect = (b: Buf, x0: number, y0: number, x1: number, y1: number, c: Vec3): void => {
  for (let y = Math.round(y0); y < Math.round(y1); y++) {
    for (let x = Math.round(x0); x < Math.round(x1); x++) {
      setPx(b, x, y, c);
    }
  }
};

const vgrad = (b: Buf, y0: number, y1: number, top: Vec3, bottom: Vec3): void => {
  for (let y = y0; y < y1; y++) {
    const c = lerp3(top, bottom, (y - y0) / Math.max(1, y1 - y0 - 1));
    for (let x = 0; x < W; x++) {
      setPx(b, x, y, c);
    }
  }
};

const ellipseFn = (b: Buf, cx: number, cy: number, rx: number, ry: number, color: (nx: number, ny: number) => Vec3): void => {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1) {
        setPx(b, x, y, color(nx, ny));
      }
    }
  }
};

const ellipse = (b: Buf, cx: number, cy: number, rx: number, ry: number, c: Vec3): void => {
  ellipseFn(b, cx, cy, rx, ry, () => c);
};

const jitter = (b: Buf, rng: Rng, amp: number): void => {
  if (amp <= 0) {
    return;
  }
  for (let i = 0; i < PIXELS; i++) {
    const d = (rng() - 0.5) * 2 * amp;
    b[i * 4] += d;
    b[i * 4 + 1] += d * 0.8;
    b[i * 4 + 2] += d * 0.9;
  }
};

const blank = (): Buf => new Uint8ClampedArray(PIXELS * 4);

const sunsetScene = (rng: Rng): Buf => {
  const b = blank();
  vgrad(b, 0, 98, [34, 36, 96], [250, 150, 72]);
  for (let i = 0; i < 14; i++) {
    const y = 10 + Math.floor(rng() * 70);
    const x = Math.floor(rng() * 200);
    rect(b, x, y, x + 20 + rng() * 50, y + 2, lerp3([70, 50, 110], [250, 170, 120], y / 98));
  }
  ellipse(b, 150, 92, 13, 13, [255, 228, 150]);
  vgrad(b, 98, H, [88, 60, 100], [14, 20, 46]);
  for (let y = 100; y < H; y += 3) {
    const half = 28 - (y - 100) * 0.3 + (rng() - 0.5) * 6;
    if (half > 2) {
      rect(b, 150 - half, y, 150 + half, y + 1, lerp3([255, 200, 120], [120, 70, 100], (y - 100) / 50));
    }
  }
  jitter(b, rng, 3);
  return b;
};

const flowerScene = (rng: Rng): Buf => {
  const b = blank();
  vgrad(b, 0, 38, [142, 196, 236], [200, 226, 244]);
  vgrad(b, 38, H, [104, 158, 64], [36, 92, 40]);
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(rng() * W);
    const y = 38 + Math.floor(rng() * (H - 38));
    const c = lerp3([60, 120, 40], [140, 180, 70], rng());
    rect(b, x, y, x + 2 + rng() * 3, y + 2, c);
  }
  for (let i = 0; i < 36; i++) {
    const r = 1.2 + rng() * 1.2;
    ellipse(b, rng() * W, 50 + rng() * (H - 55), r, r, [226, 34, 62]);
  }
  for (let i = 0; i < 12; i++) {
    const r = 1.2 + rng() * 1.2;
    ellipse(b, rng() * W, 50 + rng() * (H - 55), r, r, [248, 214, 50]);
  }
  jitter(b, rng, 3);
  return b;
};

const forestScene = (rng: Rng): Buf => {
  const b = blank();
  vgrad(b, 0, H, [176, 188, 182], [130, 144, 136]);
  const trunks = Array.from({length: 16}, () => ({x: rng() * W, w: 4 + rng() * 9})).sort((a, c) => a.w - c.w);
  trunks.forEach(t => {
    const fog = 1 - t.w / 13;
    rect(b, t.x, 0, t.x + t.w, H - 22, lerp3([44, 56, 48], [176, 188, 182], fog * 0.75));
  });
  vgrad(b, H - 24, H, [92, 104, 80], [58, 70, 50]);
  rect(b, 118, H - 40, 124, H - 30, [232, 110, 30]);
  ellipse(b, 121, H - 43, 3, 3, [214, 170, 140]);
  jitter(b, rng, 3);
  return b;
};

const uiScene = (): Buf => {
  const b = blank();
  rect(b, 0, 0, W, H, [244, 245, 248]);
  rect(b, 0, 0, W, 26, [52, 96, 224]);
  rect(b, 8, 8, 28, 18, [255, 255, 255]);
  const covers: Vec3[] = [[120, 190, 170], [160, 150, 220], [240, 160, 110]];
  covers.forEach((cover, i) => {
    const x = 12 + i * 76;
    rect(b, x, 40, x + 68, 110, [222, 226, 234]);
    rect(b, x + 1, 41, x + 67, 109, [255, 255, 255]);
    rect(b, x + 4, 44, x + 64, 76, cover);
    rect(b, x + 4, 84, x + 50, 87, [150, 158, 170]);
    rect(b, x + 4, 92, x + 36, 95, [150, 158, 170]);
  });
  rect(b, 12, 122, 76, 138, [255, 198, 40]);
  ellipse(b, 12 + 2 * 76 + 66, 42, 5, 5, [230, 40, 50]);
  return b;
};

const portraitScene = (rng: Rng): Buf => {
  const b = blank();
  const hair: Vec3 = [46, 30, 26];
  vgrad(b, 0, H, [40, 116, 126], [22, 78, 90]);
  ellipse(b, 120, H + 20, 70, 48, [58, 58, 92]);
  rect(b, 106, 98, 134, 122, [206, 152, 122]);
  ellipse(b, 120, 44, 40, 34, hair);
  ellipseFn(b, 120, 66, 36, 44, (nx, ny) => {
    const t = Math.min(1, Math.max(0, (nx * 0.7 + ny * 0.3 + 1) / 2));
    return lerp3([238, 190, 158], [196, 140, 108], t);
  });
  ellipse(b, 120, 34, 34, 14, hair);
  ellipse(b, 106, 64, 3, 2, [40, 28, 26]);
  ellipse(b, 134, 64, 3, 2, [40, 28, 26]);
  ellipse(b, 120, 86, 8, 3, [190, 58, 72]);
  jitter(b, rng, 3);
  return b;
};

interface SceneDef {
  key: string;
  name: string;
  accentName: string;
  accent: Vec3;
  build: (rng: Rng) => Buf;
}

const SCENE_DEFS: SceneDef[] = [
  {key: 'flowers', name: '花田', accentName: '红花', accent: [226, 34, 62], build: flowerScene},
  {key: 'sunset', name: '日落海面', accentName: '太阳', accent: [255, 228, 150], build: sunsetScene},
  {key: 'forest', name: '雾中森林', accentName: '橙色外套', accent: [232, 110, 30], build: forestScene},
  {key: 'ui', name: '扁平界面', accentName: '红色角标', accent: [230, 40, 50], build: uiScene},
  {key: 'portrait', name: '人像色块', accentName: '嘴唇', accent: [190, 58, 72], build: portraitScene}
];

// ---------- 场景数据与特征缓存 ----------

interface Scene {
  key: string;
  name: string;
  accentName: string;
  accent: Vec3;
  accentShare: number;
  rgba: Buf;
  sample: Int32Array;
  features: Partial<Record<SpaceKey, Float32Array>>;
}

const labAt = (rgba: Buf, i: number): Vec3 => rgbToLab([rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]]);

const toFeature = (rgb: Vec3, space: SpaceKey): Vec3 => {
  if (space === 'srgb') {
    return rgb;
  }
  if (space === 'lab') {
    return rgbToLab(rgb);
  }
  const [L, a, b] = rgbToOklab(rgb);
  return [L * 100, a * 100, b * 100];
};

const featuresOf = (scene: Scene, space: SpaceKey): Float32Array => {
  const cached = scene.features[space];
  if (cached) {
    return cached;
  }
  const out = new Float32Array(PIXELS * 3);
  for (let i = 0; i < PIXELS; i++) {
    const f = toFeature([scene.rgba[i * 4], scene.rgba[i * 4 + 1], scene.rgba[i * 4 + 2]], space);
    out[i * 3] = f[0];
    out[i * 3 + 1] = f[1];
    out[i * 3 + 2] = f[2];
  }
  scene.features[space] = out;
  return out;
};

const sceneCache = new Map<string, Scene>();

const getScene = (key: string): Scene => {
  const hit = sceneCache.get(key);
  if (hit) {
    return hit;
  }
  const def = SCENE_DEFS.find(item => item.key === key) || SCENE_DEFS[0];
  const rgba = def.build(mulberry32(20240 + SCENE_DEFS.indexOf(def)));
  const sample: number[] = [];
  for (let y = 1; y < H; y += STEP) {
    for (let x = 1; x < W; x += STEP) {
      sample.push(y * W + x);
    }
  }
  const accentLab = rgbToLab(def.accent);
  let near = 0;
  for (let i = 0; i < PIXELS; i++) {
    if (deltaE2000(labAt(rgba, i), accentLab) < 8) {
      near++;
    }
  }
  const scene: Scene = {
    key: def.key,
    name: def.name,
    accentName: def.accentName,
    accent: def.accent,
    accentShare: near / PIXELS,
    rgba,
    sample: Int32Array.from(sample),
    features: {}
  };
  sceneCache.set(def.key, scene);
  return scene;
};

// ---------- 算法 ----------

const gather = (feat: Float32Array, idx: Int32Array): Float64Array => {
  const out = new Float64Array(idx.length * 3);
  idx.forEach((p, j) => {
    out[j * 3] = feat[p * 3];
    out[j * 3 + 1] = feat[p * 3 + 1];
    out[j * 3 + 2] = feat[p * 3 + 2];
  });
  return out;
};

const dist2 = (a: ArrayLike<number>, ai: number, c: ArrayLike<number>, ci: number): number => {
  const dx = a[ai] - c[ci];
  const dy = a[ai + 1] - c[ci + 1];
  const dz = a[ai + 2] - c[ci + 2];
  return dx * dx + dy * dy + dz * dz;
};

const nearest = (a: ArrayLike<number>, ai: number, centers: ArrayLike<number>, k: number): number => {
  let best = 0;
  let bestD = Infinity;
  for (let c = 0; c < k; c++) {
    const d = dist2(a, ai, centers, c * 3);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
};

const medianCut = (pts: Float64Array, k: number): Vec3[] => {
  const n = pts.length / 3;
  let boxes: number[][] = [Array.from({length: n}, (_, i) => i)];
  const widest = (box: number[]): {axis: number; span: number} => {
    let axis = 0;
    let span = 0;
    for (let c = 0; c < 3; c++) {
      let lo = Infinity;
      let hi = -Infinity;
      box.forEach(i => {
        lo = Math.min(lo, pts[i * 3 + c]);
        hi = Math.max(hi, pts[i * 3 + c]);
      });
      if (hi - lo > span) {
        span = hi - lo;
        axis = c;
      }
    }
    return {axis, span};
  };
  while (boxes.length < k) {
    let pick = -1;
    let pickSpan = 0;
    let pickAxis = 0;
    boxes.forEach((box, bi) => {
      if (box.length < 2) {
        return;
      }
      const {axis, span} = widest(box);
      if (span > pickSpan) {
        pick = bi;
        pickSpan = span;
        pickAxis = axis;
      }
    });
    if (pick < 0) {
      break;
    }
    const box = boxes[pick].slice().sort((p, q) => pts[p * 3 + pickAxis] - pts[q * 3 + pickAxis]);
    const mid = box.length >> 1;
    boxes = [...boxes.slice(0, pick), box.slice(0, mid), box.slice(mid), ...boxes.slice(pick + 1)];
  }
  return boxes.map(box => {
    const sum = [0, 0, 0];
    box.forEach(i => {
      sum[0] += pts[i * 3];
      sum[1] += pts[i * 3 + 1];
      sum[2] += pts[i * 3 + 2];
    });
    return sum.map(v => Math.round(v / Math.max(1, box.length))) as Vec3;
  });
};

const kmeansInit = (pts: Float64Array, k: number, rng: Rng): Float64Array => {
  const n = pts.length / 3;
  const centers = new Float64Array(k * 3);
  const first = Math.floor(rng() * n);
  centers.set([pts[first * 3], pts[first * 3 + 1], pts[first * 3 + 2]], 0);
  const d2 = new Float64Array(n).fill(Infinity);
  for (let c = 1; c < k; c++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      d2[i] = Math.min(d2[i], dist2(pts, i * 3, centers, (c - 1) * 3));
      sum += d2[i];
    }
    let pick = Math.floor(rng() * n);
    if (sum > 0) {
      let r = rng() * sum;
      pick = n - 1;
      for (let i = 0; i < n; i++) {
        r -= d2[i];
        if (r <= 0) {
          pick = i;
          break;
        }
      }
    }
    centers.set([pts[pick * 3], pts[pick * 3 + 1], pts[pick * 3 + 2]], c * 3);
  }
  return centers;
};

const kmeans = (pts: Float64Array, k: number, rng: Rng, maxIter = 20): Float64Array => {
  const n = pts.length / 3;
  const centers = kmeansInit(pts, k, rng);
  const labels = new Int32Array(n).fill(-1);
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      const l = nearest(pts, i * 3, centers, k);
      if (l !== labels[i]) {
        labels[i] = l;
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
    const sums = new Float64Array(k * 3);
    const counts = new Int32Array(k);
    for (let i = 0; i < n; i++) {
      const l = labels[i];
      sums[l * 3] += pts[i * 3];
      sums[l * 3 + 1] += pts[i * 3 + 1];
      sums[l * 3 + 2] += pts[i * 3 + 2];
      counts[l]++;
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        centers.set([sums[c * 3] / counts[c], sums[c * 3 + 1] / counts[c], sums[c * 3 + 2] / counts[c]], c * 3);
        continue;
      }
      let far = 0;
      let farD = -1;
      for (let i = 0; i < n; i++) {
        const d = dist2(pts, i * 3, centers, labels[i] * 3);
        if (d > farD) {
          farD = d;
          far = i;
        }
      }
      centers.set([pts[far * 3], pts[far * 3 + 1], pts[far * 3 + 2]], c * 3);
    }
  }
  return centers;
};

const centerToRgb = (center: Vec3, space: SpaceKey): Vec3 => {
  if (space === 'srgb') {
    return center.map(v => Math.min(255, Math.max(0, Math.round(v)))) as Vec3;
  }
  if (space === 'lab') {
    return labToRgb(center).rgb;
  }
  return oklabToRgb([center[0] / 100, center[1] / 100, center[2] / 100]).rgb;
};

// ---------- 提取与评估 ----------

interface AlgoDef {
  key: AlgoKey;
  label: string;
  space: SpaceKey;
  seeded: boolean;
}

const ALGOS: AlgoDef[] = [
  {key: 'median', label: '中位切分（sRGB）', space: 'srgb', seeded: false},
  {key: 'km-srgb', label: 'k-means（sRGB）', space: 'srgb', seeded: true},
  {key: 'km-lab', label: 'k-means（CIELAB）', space: 'lab', seeded: true},
  {key: 'km-oklab', label: 'k-means（OKLab）', space: 'oklab', seeded: true}
];

interface Extraction {
  key: AlgoKey;
  label: string;
  seeded: boolean;
  palette: Vec3[];
  share: number[];
  order: number[];
  meanDe: number;
  accentDe: number;
  accentKept: boolean;
  recon: Buf | null;
}

const runExtraction = (scene: Scene, algo: AlgoDef, k: number, seed: number, withRecon: boolean): Extraction => {
  const feat = featuresOf(scene, algo.space);
  const pts = gather(feat, scene.sample);
  let centers: Float64Array;
  let palette: Vec3[];
  if (algo.key === 'median') {
    palette = medianCut(gather(featuresOf(scene, 'srgb'), scene.sample), k);
    centers = Float64Array.from(palette.flat());
  } else {
    const rng = mulberry32(seed * 1000 + ALGOS.findIndex(item => item.key === algo.key) * 17 + 5);
    centers = kmeans(pts, k, rng);
    palette = Array.from({length: k}, (_, c) => centerToRgb([centers[c * 3], centers[c * 3 + 1], centers[c * 3 + 2]], algo.space));
  }
  const kk = palette.length;
  const paletteLab = palette.map(c => rgbToLab(c));
  const counts = new Array<number>(kk).fill(0);
  let totalDe = 0;
  const n = scene.sample.length;
  for (let j = 0; j < n; j++) {
    const l = nearest(pts, j * 3, centers, kk);
    counts[l]++;
    totalDe += deltaE2000(labAt(scene.rgba, scene.sample[j]), paletteLab[l]);
  }
  const share = counts.map(c => c / n);
  const order = share.map((_, i) => i).sort((a, b) => share[b] - share[a]);
  const accentLab = rgbToLab(scene.accent);
  const accentDe = Math.min(...paletteLab.map(l => deltaE2000(accentLab, l)));
  let recon: Buf | null = null;
  if (withRecon) {
    recon = blank();
    for (let i = 0; i < PIXELS; i++) {
      const c = palette[nearest(feat, i * 3, centers, kk)];
      recon[i * 4] = c[0];
      recon[i * 4 + 1] = c[1];
      recon[i * 4 + 2] = c[2];
      recon[i * 4 + 3] = 255;
    }
  }
  return {
    key: algo.key,
    label: algo.label,
    seeded: algo.seeded,
    palette,
    share,
    order,
    meanDe: totalDe / n,
    accentDe,
    accentKept: accentDe < ACCENT_KEPT,
    recon
  };
};

const analyse = (sceneKey: string, k: number, seed: number): Extraction[] => {
  const scene = getScene(sceneKey);
  return ALGOS.map(algo => runExtraction(scene, algo, k, seed, true));
};

interface Stability {
  key: AlgoKey;
  label: string;
  seeded: boolean;
  minDe: number;
  maxDe: number;
  kept: number;
  runs: number;
}

const stability = (sceneKey: string, k: number, runs = 12): Stability[] => {
  const scene = getScene(sceneKey);
  return ALGOS.map(algo => {
    const total = algo.seeded ? runs : 1;
    let minDe = Infinity;
    let maxDe = -Infinity;
    let kept = 0;
    for (let s = 1; s <= total; s++) {
      const r = runExtraction(scene, algo, k, s, false);
      minDe = Math.min(minDe, r.meanDe);
      maxDe = Math.max(maxDe, r.meanDe);
      kept += r.accentKept ? 1 : 0;
    }
    return {key: algo.key, label: algo.label, seeded: algo.seeded, minDe, maxDe, kept, runs: total};
  });
};

export {
  W,
  H,
  ACCENT_KEPT,
  SCENE_DEFS,
  ALGOS,
  getScene,
  analyse,
  stability
};
export type {Scene, Extraction, Stability, AlgoKey};
