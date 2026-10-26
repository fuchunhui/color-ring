import {GAMUTS, D65, spectralLocus, locusXy, xyToXyz, xyzToDisplayRgb, toHex} from '../utils/cie';
import type {Point} from '../utils/cie';
import {dominantWavelength, E_WHITE, mixLights, centroid} from '../utils/colorimetry';
import type {Dominant} from '../utils/colorimetry';

const X_MAX = 0.8;
const Y_MAX = 0.9;
const SCALE = 520;
const LEFT = 40;
const TOP = 10;
const BOTTOM = 30;
const RIGHT = 10;

const CHART_W = Math.round(LEFT + X_MAX * SCALE + RIGHT);
const CHART_H = Math.round(TOP + Y_MAX * SCALE + BOTTOM);

type PickTarget = 'A' | 'B';
type WhiteKey = 'D65' | 'E';

interface MixState {
  a: Point;
  b: Point;
  ya: number;
  yb: number;
  target: PickTarget;
  white: WhiteKey;
}

interface ProbeState {
  point: Point | null;
  white: WhiteKey;
}

const toPx = ([x, y]: Point): Point => [LEFT + x * SCALE, TOP + (Y_MAX - y) * SCALE];
const pxToXy = (px: number, py: number): Point => [(px - LEFT) / SCALE, Y_MAX - (py - TOP) / SCALE];
const whiteOf = (key: WhiteKey): Point => (key === 'E' ? E_WHITE : D65);

const locus = spectralLocus(380, 700, 1);
let background: HTMLCanvasElement | null = null;

const buildBackground = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = CHART_W;
  canvas.height = CHART_H;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const image = ctx.createImageData(CHART_W, CHART_H);
  const {data} = image;
  for (let py = 0; py < CHART_H; py++) {
    const y = pxToXy(0, py + 0.5)[1];
    if (y <= 0 || y > Y_MAX) {
      continue;
    }
    const xs: number[] = [];
    for (let i = 0, j = locus.length - 1; i < locus.length; j = i++) {
      const [xi, yi] = locus[i];
      const [xj, yj] = locus[j];
      if ((yi > y) !== (yj > y)) {
        xs.push((xj - xi) * (y - yi) / (yj - yi) + xi);
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(0, Math.ceil(toPx([xs[k], y])[0] - 0.5));
      const to = Math.min(CHART_W - 1, Math.floor(toPx([xs[k + 1], y])[0] - 0.5));
      for (let px = from; px <= to; px++) {
        const rgb = xyzToDisplayRgb(xyToXyz(pxToXy(px + 0.5, 0)[0], y));
        const o = (py * CHART_W + px) * 4;
        data[o] = rgb[0];
        data[o + 1] = rgb[1];
        data[o + 2] = rgb[2];
        data[o + 3] = 255;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
};

const label = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: CanvasTextAlign = 'left',
  baseline: CanvasTextBaseline = 'middle',
  color = '#222'
): void => {
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
};

const dot = (ctx: CanvasRenderingContext2D, p: Point, r: number, fill: string, stroke = '#222'): void => {
  const [x, y] = toPx(p);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = stroke;
  ctx.stroke();
};

const line = (
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  color: string,
  width = 1.5,
  dash: number[] = []
): void => {
  const [x1, y1] = toPx(a);
  const [x2, y2] = toPx(b);
  ctx.beginPath();
  ctx.setLineDash(dash);
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.setLineDash([]);
};

const drawBase = (ctx: CanvasRenderingContext2D, white: Point, whiteName: string): void => {
  if (!background) {
    background = buildBackground();
  }
  ctx.drawImage(background, 0, 0);
  ctx.font = '12px sans-serif';
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
  for (let i = 0; i <= 8; i++) {
    const [px, bottom] = toPx([i / 10, 0]);
    const top = toPx([i / 10, Y_MAX])[1];
    ctx.beginPath();
    ctx.moveTo(Math.round(px) + 0.5, top);
    ctx.lineTo(Math.round(px) + 0.5, bottom);
    ctx.stroke();
    label(ctx, (i / 10).toFixed(1), px, bottom + 13, 'center');
  }
  for (let j = 0; j <= 9; j++) {
    const [left, py] = toPx([0, j / 10]);
    const right = toPx([X_MAX, j / 10])[0];
    ctx.beginPath();
    ctx.moveTo(left, Math.round(py) + 0.5);
    ctx.lineTo(right, Math.round(py) + 0.5);
    ctx.stroke();
    label(ctx, (j / 10).toFixed(1), left - 5, py, 'right');
  }
  ctx.beginPath();
  locus.forEach((p, i) => {
    const [x, y] = toPx(p);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.closePath();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#333';
  ctx.stroke();
  [450, 500, 550, 600, 650].forEach(l => {
    const p = locusXy(l);
    dot(ctx, p, 2.5, '#333');
    const [px, py] = toPx(p);
    const right = p[0] > 0.3;
    label(ctx, `${l}`, px + (right ? 6 : -6), py + (right ? -6 : 0), right ? 'left' : 'right', 'middle', '#333');
  });
  dot(ctx, white, 4, '#fff');
  label(ctx, whiteName, toPx(white)[0] + 7, toPx(white)[1] + 12, 'left');
  GAMUTS.slice(0, 1).forEach(g => {
    ctx.beginPath();
    g.points.forEach((p, i) => {
      const [x, y] = toPx(p);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.stroke();
    ctx.setLineDash([]);
  });
};

const hexOfXyY = (xy: Point, Y = 1): string => {
  const v = xyToXyz(xy[0], xy[1]);
  return toHex(xyzToDisplayRgb([v[0] * Y, Y, v[2] * Y]));
};

const drawMix = (ctx: CanvasRenderingContext2D, s: MixState): void => {
  const white = whiteOf(s.white);
  drawBase(ctx, white, s.white === 'E' ? 'E' : 'D65');
  const lights = [{xy: s.a, Y: s.ya}, {xy: s.b, Y: s.yb}];
  const mixed = centroid(lights);
  line(ctx, s.a, s.b, '#000', 1.5, [5, 3]);
  dot(ctx, s.a, 6, hexOfXyY(s.a), '#000');
  dot(ctx, s.b, 6, hexOfXyY(s.b), '#000');
  dot(ctx, mixed, 6, hexOfXyY(mixed), '#d6336c');
  label(ctx, 'A', toPx(s.a)[0] + 9, toPx(s.a)[1] - 8, 'left', 'middle', '#000');
  label(ctx, 'B', toPx(s.b)[0] + 9, toPx(s.b)[1] - 8, 'left', 'middle', '#000');
  label(ctx, 'A+B', toPx(mixed)[0] + 9, toPx(mixed)[1] + 10, 'left', 'middle', '#d6336c');
};

const drawProbe = (ctx: CanvasRenderingContext2D, s: ProbeState): void => {
  const white = whiteOf(s.white);
  drawBase(ctx, white, s.white === 'E' ? 'E' : 'D65');
  if (!s.point) {
    return;
  }
  const info = dominantWavelength(s.point, white);
  if (info.opposite) {
    line(ctx, info.opposite, info.hit, '#000', 1.2, [5, 3]);
  } else {
    line(ctx, white, info.hit, '#000', 1.2, [5, 3]);
  }
  dot(ctx, info.hit, 4, '#fff', '#000');
  if (info.opposite) {
    dot(ctx, info.opposite, 4, '#fff', '#000');
  }
  dot(ctx, s.point, 6, hexOfXyY(s.point), '#000');
};

const pickXy = (px: number, py: number): Point => {
  const [x, y] = pxToXy(px, py);
  return [Math.min(Math.max(x, 0.001), X_MAX), Math.min(Math.max(y, 0.001), Y_MAX)];
};

interface MixReadout {
  mixed: Point;
  mixedByXyz: Point;
  Y: number;
  hexA: string;
  hexB: string;
  hexMix: string;
  additivityError: number;
  domA: Dominant;
  domB: Dominant;
  domMix: Dominant;
}

const describeMix = (s: MixState): MixReadout => {
  const lights = [{xy: s.a, Y: s.ya}, {xy: s.b, Y: s.yb}];
  const byXyz = mixLights(lights);
  const mixed = centroid(lights);
  const white = whiteOf(s.white);
  return {
    mixed,
    mixedByXyz: byXyz.xy,
    Y: byXyz.Y,
    hexA: hexOfXyY(s.a),
    hexB: hexOfXyY(s.b),
    hexMix: hexOfXyY(mixed),
    additivityError: Math.hypot(mixed[0] - byXyz.xy[0], mixed[1] - byXyz.xy[1]),
    domA: dominantWavelength(s.a, white),
    domB: dominantWavelength(s.b, white),
    domMix: dominantWavelength(mixed, white)
  };
};

const formatDominant = (d: Dominant): string => {
  if (d.wavelength === null) {
    return '无（接近白点）';
  }
  const nm = d.wavelength.toFixed(1);
  return d.complementary ? `${nm}c nm（补色波长，主波长不存在）` : `${nm} nm`;
};

export {
  CHART_W,
  CHART_H,
  MixState,
  ProbeState,
  MixReadout,
  PickTarget,
  WhiteKey,
  drawMix,
  drawProbe,
  pickXy,
  describeMix,
  formatDominant,
  whiteOf,
  hexOfXyY,
  drawBase,
  toPx,
  dot,
  label,
  line
};
