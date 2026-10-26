import {pointInPolygon, spectralLocus, xyzToDisplayRgb} from '../utils/cie';
import type {Point} from '../utils/cie';
import {text} from '../utils/spectral';
import {linearToSrgb, srgbToLinear} from '../utils/space';
import type {Vec3} from '../utils/space';
import {
  SPACES,
  WHITE_D65,
  convertSpace,
  intersectionArea,
  isInside,
  polygonArea,
  spaceInfo,
  to8,
  toUv,
  xyToXyz
} from '../utils/colorman';
import type {SpaceKey} from '../utils/colorman';
import {css4Map, clipMap, linearToOklch, oklchToLinear} from '../utils/gamut';
import {makePhotoScene} from '../utils/scene';

// ---------- 色度图与面积 ----------

const SCALE = 560;
const PLOT = {x: 46, y: 18, w: Math.round(0.8 * SCALE), h: Math.round(0.9 * SCALE)};
const CHART_W = PLOT.x + PLOT.w + 30;
const CHART_H = PLOT.y + PLOT.h + 40;

const toPx = ([x, y]: Point): Point => [PLOT.x + x * SCALE, PLOT.y + PLOT.h - y * SCALE];

let locusImage: ImageData | null = null;

const locusBackground = (ctx: CanvasRenderingContext2D): ImageData => {
  if (locusImage) {
    return locusImage;
  }
  const polygon = spectralLocus(380, 700, 2);
  const image = ctx.createImageData(PLOT.w, PLOT.h);
  for (let py = 0; py < PLOT.h; py++) {
    const y = (PLOT.h - py) / SCALE;
    for (let px = 0; px < PLOT.w; px++) {
      const x = px / SCALE;
      if (!pointInPolygon([x, y], polygon)) {
        continue;
      }
      const rgb = xyzToDisplayRgb(xyToXyz([x, Math.max(y, 1e-4)]));
      const i = (py * PLOT.w + px) * 4;
      image.data[i] = rgb[0] * 0.55 + 255 * 0.45;
      image.data[i + 1] = rgb[1] * 0.55 + 255 * 0.45;
      image.data[i + 2] = rgb[2] * 0.55 + 255 * 0.45;
      image.data[i + 3] = 255;
    }
  }
  locusImage = image;
  return image;
};

const drawGamutChart = (ctx: CanvasRenderingContext2D, visible: Record<string, boolean>): void => {
  ctx.putImageData(locusBackground(ctx), PLOT.x, PLOT.y);
  const locus = spectralLocus(380, 700, 2);
  ctx.beginPath();
  locus.forEach((p, i) => {
    const [px, py] = toPx(p);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  });
  ctx.closePath();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = '#E4E4E4';
  for (let i = 0; i <= 8; i++) {
    const x = PLOT.x + i * 0.1 * SCALE;
    text(ctx, (i / 10).toFixed(1), x, PLOT.y + PLOT.h + 12, 'center', '#555', '11px sans-serif');
  }
  for (let i = 0; i <= 9; i++) {
    const y = PLOT.y + PLOT.h - i * 0.1 * SCALE;
    text(ctx, (i / 10).toFixed(1), PLOT.x - 6, y, 'right', '#555', '11px sans-serif');
  }
  text(ctx, 'x', PLOT.x + PLOT.w / 2, PLOT.y + PLOT.h + 28, 'center', '#333', '12px sans-serif');
  text(ctx, 'y', 12, PLOT.y + PLOT.h / 2, 'center', '#333', '12px sans-serif');
  let legendY = PLOT.y + 14;
  SPACES.forEach(space => {
    if (!visible[space.key]) {
      return;
    }
    ctx.beginPath();
    space.primaries.forEach((p, i) => {
      const [px, py] = toPx(p);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    });
    ctx.closePath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = space.color;
    ctx.stroke();
    ctx.fillStyle = space.color;
    ctx.fillRect(PLOT.x + PLOT.w - 150, legendY - 2, 18, 3);
    text(ctx, space.label, PLOT.x + PLOT.w - 126, legendY, 'left', '#222', '12px sans-serif');
    legendY += 18;
  });
  const [wx, wy] = toPx(WHITE_D65);
  ctx.beginPath();
  ctx.arc(wx, wy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#FFF';
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, 'D65', wx + 8, wy, 'left', '#222', '11px sans-serif');
};

interface GamutStat {
  key: SpaceKey;
  label: string;
  areaXy: number;
  areaUv: number;
  ratioXy: number;
  ratioUv: number;
  coverXy: number;
  coverUv: number;
}

/** 各色域在 xy / u'v' 平面上的三角形面积，相对 sRGB 的倍数，以及对 Rec.2020 的覆盖率 */
const gamutStats = (): GamutStat[] => {
  const area = (key: SpaceKey, uv: boolean): number => {
    const pts = spaceInfo(key).primaries.map(p => (uv ? toUv(p) : p));
    return polygonArea(pts);
  };
  const rec = spaceInfo('rec2020').primaries;
  const recUv = rec.map(toUv);
  return SPACES.map(space => {
    const xy = space.primaries;
    const uv = xy.map(toUv);
    return {
      key: space.key,
      label: space.label,
      areaXy: area(space.key, false),
      areaUv: area(space.key, true),
      ratioXy: area(space.key, false) / area('srgb', false),
      ratioUv: area(space.key, true) / area('srgb', true),
      coverXy: intersectionArea(xy, rec) / polygonArea(rec),
      coverUv: intersectionArea(uv, recUv) / polygonArea(recUv)
    };
  });
};

// ---------- 同一组数字，不同解读 ----------

const IMG_W = 240;
const IMG_H = 190;

/** 一组 0~1 的“编码数值”：上排是中等饱和的色块，中间是色相渐变，下面是照片场景 */
const SAMPLES: {name: string; rgb: Vec3}[] = [
  {name: '橙红', rgb: [0.95, 0.35, 0.2]},
  {name: '金黄', rgb: [0.95, 0.8, 0.2]},
  {name: '草绿', rgb: [0.2, 0.8, 0.3]},
  {name: '青', rgb: [0.2, 0.75, 0.8]},
  {name: '蓝', rgb: [0.25, 0.3, 0.95]},
  {name: '洋红', rgb: [0.85, 0.25, 0.75]}
];

const hsvToRgb01 = (h: number, s: number, v: number): Vec3 => {
  const f = (n: number): number => {
    const k = (n + h * 6) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5), f(3), f(1)];
};

let numbersCache: Float32Array | null = null;

const testNumbers = (): Float32Array => {
  if (numbersCache) {
    return numbersCache;
  }
  const data = new Float32Array(IMG_W * IMG_H * 3);
  const scene = makePhotoScene(IMG_W, IMG_H - 70).image;
  const put = (x: number, y: number, rgb: Vec3): void => {
    const i = (y * IMG_W + x) * 3;
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
  };
  for (let y = 0; y < IMG_H; y++) {
    for (let x = 0; x < IMG_W; x++) {
      if (y < 40) {
        put(x, y, SAMPLES[Math.floor(x / (IMG_W / SAMPLES.length))].rgb);
      } else if (y < 70) {
        put(x, y, hsvToRgb01(x / IMG_W, 0.9, 0.95));
      } else {
        const i = (y - 70) * IMG_W + x;
        put(x, y, [0, 1, 2].map(c => linearToSrgb(Math.min(1, scene.data[i * 3 + c]))) as Vec3);
      }
    }
  }
  numbersCache = data;
  return data;
};

type Remap = 'clip' | 'css4';

const decodeSrgb = (v: number): number => (v < 0 ? -srgbToLinear(-v) : srgbToLinear(v));

/** 把 sRGB 编码值（可能越界）变成显示用的 8 位值：裁切或 CSS4 映射 */
const finishSrgb = (encoded: Vec3, remap: Remap): Vec3 => {
  if (isInside(encoded)) {
    return to8(encoded);
  }
  if (remap === 'clip') {
    return to8(encoded);
  }
  const linear = encoded.map(decodeSrgb) as Vec3;
  return css4Map(linearToOklch(linear)).rgb;
};

const interpret = (rgb: Vec3, asSpace: SpaceKey, remap: Remap): {rgb8: Vec3; inside: boolean} => {
  const encoded = asSpace === 'srgb' ? rgb : convertSpace(asSpace, 'srgb', rgb);
  return {rgb8: finishSrgb(encoded, remap), inside: isInside(encoded)};
};

const drawInterpreted = (ctx: CanvasRenderingContext2D, asSpace: SpaceKey, remap: Remap): void => {
  const nums = testNumbers();
  const out = ctx.createImageData(IMG_W, IMG_H);
  for (let p = 0; p < IMG_W * IMG_H; p++) {
    const {rgb8} = interpret([nums[p * 3], nums[p * 3 + 1], nums[p * 3 + 2]], asSpace, remap);
    out.data[p * 4] = rgb8[0];
    out.data[p * 4 + 1] = rgb8[1];
    out.data[p * 4 + 2] = rgb8[2];
    out.data[p * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
};

const sampleRows = (remap: Remap): {name: string; source: Vec3; cells: {space: SpaceKey; rgb8: Vec3; inside: boolean}[]}[] => {
  const keys: SpaceKey[] = ['srgb', 'p3', 'rec2020', 'adobe', 'prophoto'];
  return SAMPLES.map(s => ({
    name: s.name,
    source: s.rgb.map(v => Math.round(v * 255)) as Vec3,
    cells: keys.map(space => ({space, ...interpret(s.rgb, space, remap)}))
  }));
};

// ---------- 渲染意图：裁切与压缩 ----------

interface IntentRow {
  label: string;
  note: string;
  colors: Vec3[];
  distinct: number;
  hueShift: number;
}

const INTENT_STEPS = 14;

const hueDiff = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** 结果颜色相对原色相的平均偏移（度），忽略几乎无色的结果 */
const meanHueShift = (colors: Vec3[], hue: number): number => {
  const shifts = colors
    .map(c => linearToOklch(c.map(v => srgbToLinear(v / 255)) as Vec3))
    .filter(lch => lch[1] > 0.02)
    .map(lch => hueDiff(lch[2], hue));
  return shifts.length ? shifts.reduce((s, v) => s + v, 0) / shifts.length : 0;
};

const maxChroma = (lightness: number, hue: number): number => {
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const linear = oklchToLinear([lightness, mid, hue]);
    if (linear.every(v => v >= -1e-6 && v <= 1 + 1e-6)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return lo;
};

const intentRows = (hue: number, lightness: number): IntentRow[] => {
  const chromas = Array.from({length: INTENT_STEPS}, (_, i) => 0.06 + i * 0.02);
  const lch = chromas.map(c => [lightness, c, hue] as Vec3);
  const limit = maxChroma(lightness, hue);
  const k = Math.min(1, limit / chromas[chromas.length - 1]);
  const rows: [string, string, Vec3[]][] = [
    ['相对比色（直接裁切）', '各通道直接限制在 0~1，不同颜色仍然各不相同，但色相和亮度会偏移', lch.map(l => clipMap(l).rgb)],
    ['相对比色 + 逐点降低色度', '只降低色度（CSS Color 4 的做法），色相和亮度基本不变，代价是最饱和的几个颜色被压成同一个', lch.map(l => css4Map(l).rgb)],
    ['感知（整体压缩）', '所有颜色按同一比例降低色度，层次全部保留，代价是色域内的颜色也变淡', lch.map(l => css4Map([l[0], l[1] * k, l[2]]).rgb)]
  ];
  return rows.map(([label, note, colors]) => ({
    label,
    note,
    colors,
    distinct: new Set(colors.map(c => c.join(','))).size,
    hueShift: meanHueShift(colors, hue)
  }));
};

// ---------- 换算器 ----------

interface CalcCell {
  space: SpaceKey;
  label: string;
  rgb8: Vec3;
  encoded: Vec3;
  inside: boolean;
}

const convertAll = (from: SpaceKey, rgb8: Vec3): CalcCell[] => {
  const rgb = rgb8.map(v => v / 255) as Vec3;
  return SPACES.map(space => {
    const encoded = space.key === from ? rgb : convertSpace(from, space.key, rgb);
    return {space: space.key, label: space.label, rgb8: to8(encoded), encoded, inside: isInside(encoded)};
  });
};

const calcSwatch = (from: SpaceKey, rgb8: Vec3): Vec3 => {
  const encoded = convertSpace(from, 'srgb', rgb8.map(v => v / 255) as Vec3);
  return to8(encoded);
};

export {
  CHART_W,
  CHART_H,
  IMG_W,
  IMG_H,
  SAMPLES,
  INTENT_STEPS,
  drawGamutChart,
  gamutStats,
  drawInterpreted,
  sampleRows,
  intentRows,
  convertAll,
  calcSwatch
};
export type {GamutStat, Remap, IntentRow, CalcCell};
