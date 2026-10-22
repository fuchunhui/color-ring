import {Vec3, xyzToLab} from '../utils/space';
import {
  Point,
  GAMUTS,
  D65,
  spectralLocus,
  locusXy,
  pointInPolygon,
  xyToXyz,
  xyzToDisplayRgb
} from '../utils/cie';
import {xyToUv, uvToXy, xyzToLuv, deltaEuv} from '../utils/luv';
import {deltaE76, deltaE2000} from '../utils/deltae';

type Space = 'xy' | 'uv';
type Metric = 'uv' | 'lab76' | 'lab2000';

interface ChartState {
  gamuts: Record<string, boolean>;
  ellipses: boolean;
  metric: Metric;
}

interface Spec {
  min: Point;
  max: Point;
  scale: number;
  xLabel: string;
  yLabel: string;
  step: number;
}

const WIDTH = 520;
const HEIGHT = 520;
const MARGIN = 42;
const ELLIPSE_Y = 0.2;
const ELLIPSE_SCALE = 3;
const DIRECTIONS = 24;

const makeSpec = (min: Point, max: Point, xLabel: string, yLabel: string, step: number): Spec => {
  const scale = Math.min((WIDTH - 2 * MARGIN) / (max[0] - min[0]), (HEIGHT - 2 * MARGIN) / (max[1] - min[1]));
  return {min, max, scale, xLabel, yLabel, step};
};

const SPECS: Record<Space, Spec> = {
  xy: makeSpec([0, 0], [0.8, 0.9], 'x', 'y', 0.1),
  uv: makeSpec([0, 0], [0.65, 0.6], "u'", "v'", 0.1)
};

const toPx = (space: Space, a: number, b: number): Point => {
  const {min, scale} = SPECS[space];
  return [MARGIN + (a - min[0]) * scale, HEIGHT - MARGIN - (b - min[1]) * scale];
};

const fromPx = (space: Space, px: number, py: number): Point => {
  const {min, scale} = SPECS[space];
  return [min[0] + (px - MARGIN) / scale, min[1] + (HEIGHT - MARGIN - py) / scale];
};

const xyTo = (space: Space, p: Point): Point => (space === 'xy' ? p : xyToUv(p[0], p[1]));

const LOCUS_POLYGON: Point[] = spectralLocus(380, 700, 2);

const backgrounds = new Map<Space, HTMLCanvasElement>();

const getBackground = (space: Space): HTMLCanvasElement => {
  const cached = backgrounds.get(space);
  if (cached) {
    return cached;
  }
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const image = ctx.createImageData(WIDTH, HEIGHT);
  for (let py = 0; py < HEIGHT; py++) {
    for (let px = 0; px < WIDTH; px++) {
      const [a, b] = fromPx(space, px + 0.5, py + 0.5);
      const [x, y] = space === 'xy' ? [a, b] : uvToXy(a, b);
      if (y < 0.004 || x < 0 || x > 0.76 || y > 0.85 || !pointInPolygon([x, y], LOCUS_POLYGON)) {
        continue;
      }
      const [r, g, bl] = xyzToDisplayRgb(xyToXyz(x, y));
      const i = (py * WIDTH + px) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = bl;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  backgrounds.set(space, canvas);
  return canvas;
};

const labAt = (x: number, y: number): Vec3 => {
  const [X, Y, Z] = xyToXyz(x, y);
  return xyzToLab([X * ELLIPSE_Y, Y * ELLIPSE_Y, Z * ELLIPSE_Y]);
};

const validXy = (x: number, y: number): boolean => y > 0.003 && x > 0.003 && x + y < 0.997;

const METRICS: Array<{key: Metric; label: string; target: number}> = [
  {key: 'uv', label: 'ΔE*uv（CIELUV）', target: 3},
  {key: 'lab76', label: 'ΔE*ab（CIE76）', target: 3},
  {key: 'lab2000', label: 'ΔE2000', target: 1.5}
];

const luvAt = (x: number, y: number): Vec3 => {
  const [X, Y, Z] = xyToXyz(x, y);
  return xyzToLuv([X * ELLIPSE_Y, Y * ELLIPSE_Y, Z * ELLIPSE_Y]);
};

const distance = (metric: Metric, a: Point, b: Point): number => {
  if (metric === 'uv') {
    return deltaEuv(luvAt(a[0], a[1]), luvAt(b[0], b[1]));
  }
  const diff = metric === 'lab76' ? deltaE76 : deltaE2000;
  return diff(labAt(a[0], a[1]), labAt(b[0], b[1]));
};

/** 以 (cx, cy) 为中心，在 xy 平面里找色差恰为 target 的一圈色度坐标 */
const contour = (cx: number, cy: number, metric: Metric, target: number): Point[] => {
  const center: Point = [cx, cy];
  const points: Point[] = [];
  for (let k = 0; k < DIRECTIONS; k++) {
    const theta = 2 * Math.PI * k / DIRECTIONS;
    const dx = Math.cos(theta);
    const dy = Math.sin(theta);
    let hi = 0.25;
    while (hi > 1e-4 && !validXy(cx + dx * hi, cy + dy * hi)) {
      hi *= 0.8;
    }
    let lo = 0;
    if (distance(metric, center, [cx + dx * hi, cy + dy * hi]) < target) {
      lo = hi;
    } else {
      for (let i = 0; i < 28; i++) {
        const mid = (lo + hi) / 2;
        if (distance(metric, center, [cx + dx * mid, cy + dy * mid]) < target) {
          lo = mid;
        } else {
          hi = mid;
        }
      }
    }
    points.push([cx + dx * lo, cy + dy * lo]);
  }
  return points;
};

interface Ellipse {
  center: Point;
  points: Point[];
}

const ellipseCache = new Map<Metric, Ellipse[]>();

const getEllipses = (metric: Metric): Ellipse[] => {
  const cached = ellipseCache.get(metric);
  if (cached) {
    return cached;
  }
  const target = (METRICS.find(m => m.key === metric) as {target: number}).target;
  const result: Ellipse[] = [];
  for (let x = 0.15; x < 0.7; x += 0.1) {
    for (let y = 0.1; y < 0.85; y += 0.1) {
      const around: Point[] = [[x + 0.025, y], [x - 0.025, y], [x, y + 0.025], [x, y - 0.025]];
      if (pointInPolygon([x, y], LOCUS_POLYGON) && around.every(p => pointInPolygon(p, LOCUS_POLYGON))) {
        result.push({center: [x, y], points: contour(x, y, metric, target)});
      }
    }
  }
  ellipseCache.set(metric, result);
  return result;
};

const area = (points: Point[]): number => {
  let sum = 0;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    sum += p[0] * q[1] - q[0] * p[1];
  });
  return Math.abs(sum) / 2;
};

/** 各个等色差椭圆在 xy / u'v' 平面里的面积比（最大 / 最小） */
const ellipseStats = (metric: Metric): {count: number; xy: number; uv: number} => {
  const ellipses = getEllipses(metric);
  const ratio = (space: Space) => {
    const areas = ellipses.map(e => area(e.points.map(p => xyTo(space, p))));
    return Math.max(...areas) / Math.min(...areas);
  };
  return {count: ellipses.length, xy: ratio('xy'), uv: ratio('uv')};
};

const drawAxes = (ctx: CanvasRenderingContext2D, space: Space) => {
  const {min, max, step, xLabel, yLabel} = SPECS[space];
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#666';
  ctx.font = '11px sans-serif';
  for (let v = 0; v <= max[0] + 1e-9; v += step) {
    const [px, top] = toPx(space, v, max[1]);
    const [, bottom] = toPx(space, v, min[1]);
    ctx.beginPath();
    ctx.moveTo(px, top);
    ctx.lineTo(px, bottom);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(v.toFixed(1), px, bottom + 6);
  }
  for (let v = 0; v <= max[1] + 1e-9; v += step) {
    const [left, py] = toPx(space, min[0], v);
    const [right] = toPx(space, max[0], v);
    ctx.beginPath();
    ctx.moveTo(left, py);
    ctx.lineTo(right, py);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(v.toFixed(1), left - 6, py);
  }
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#333';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(xLabel, toPx(space, max[0] / 2, min[1])[0], HEIGHT - 18);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(yLabel, 8, toPx(space, min[0], max[1])[1]);
};

const drawLocus = (ctx: CanvasRenderingContext2D, space: Space) => {
  ctx.beginPath();
  LOCUS_POLYGON.forEach((p, i) => {
    const [x, y] = toPx(space, ...xyTo(space, p));
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.closePath();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const center = toPx(space, ...xyTo(space, [0.33, 0.33]));
  ctx.font = '11px sans-serif';
  [450, 500, 550, 600, 650].forEach(l => {
    const p = toPx(space, ...xyTo(space, locusXy(l)));
    const len = Math.hypot(p[0] - center[0], p[1] - center[1]) || 1;
    const nx = (p[0] - center[0]) / len;
    const ny = (p[1] - center[1]) / len;
    ctx.beginPath();
    ctx.arc(p[0], p[1], 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.textAlign = nx > 0.3 ? 'left' : nx < -0.3 ? 'right' : 'center';
    ctx.textBaseline = ny > 0.3 ? 'top' : ny < -0.3 ? 'bottom' : 'middle';
    let lx = p[0] + nx * 8;
    let ly = p[1] + ny * 8;
    if (l === 450) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      lx = p[0] + 10;
      ly = p[1] - 4;
    } else if (l === 500 && space === 'uv') {
      ctx.textAlign = 'left';
      lx = p[0] + 10;
    }
    ctx.fillText(`${l}nm`, lx, ly);
  });
};

const drawGamuts = (ctx: CanvasRenderingContext2D, space: Space, state: ChartState) => {
  GAMUTS.forEach(g => {
    if (!state.gamuts[g.key]) {
      return;
    }
    ctx.beginPath();
    g.points.forEach((p, i) => {
      const [x, y] = toPx(space, ...xyTo(space, p));
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.strokeStyle = g.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
  const [wx, wy] = toPx(space, ...xyTo(space, D65));
  ctx.beginPath();
  ctx.arc(wx, wy, 3.5, 0, 2 * Math.PI);
  ctx.fillStyle = '#FFF';
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1;
  ctx.stroke();
};

const drawEllipses = (ctx: CanvasRenderingContext2D, space: Space, metric: Metric) => {
  getEllipses(metric).forEach(({center, points}) => {
    const [cu, cv] = xyTo(space, center);
    const path = points.map(p => {
      const [a, b] = xyTo(space, p);
      return toPx(space, cu + ELLIPSE_SCALE * (a - cu), cv + ELLIPSE_SCALE * (b - cv));
    });
    ctx.beginPath();
    path.forEach(([x, y], i) => {
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#111';
    ctx.stroke();
  });
};

type Painter = (ctx: CanvasRenderingContext2D) => void;

const drawChart = (space: Space, state: ChartState): Painter => ctx => {
  ctx.drawImage(getBackground(space), 0, 0);
  drawAxes(ctx, space);
  drawLocus(ctx, space);
  drawGamuts(ctx, space, state);
  if (state.ellipses) {
    drawEllipses(ctx, space, state.metric);
  }
};

export {
  Space,
  Metric,
  METRICS,
  ChartState,
  WIDTH,
  HEIGHT,
  ELLIPSE_Y,
  ELLIPSE_SCALE,
  GAMUTS,
  drawChart,
  ellipseStats
};
