import {
  GAMUTS,
  D65,
  Point,
  spectralLocus,
  locusXy,
  pointInPolygon,
  xyToXyz,
  xyzToXy,
  xyzToDisplayRgb,
  blackbodyXyz,
  toHex
} from '../utils/cie';

const X_MAX = 0.8;
const Y_MAX = 0.9;
const SCALE = 650;
const LEFT = 44;
const TOP = 12;
const BOTTOM = 34;
const RIGHT = 12;

const CIE_WIDTH = Math.round(LEFT + X_MAX * SCALE + RIGHT);
const CIE_HEIGHT = Math.round(TOP + Y_MAX * SCALE + BOTTOM);

interface CieState {
  gamuts: Record<string, boolean>;
  planckian: boolean;
  selected: Point | null;
}

interface PointInfo {
  x: number;
  y: number;
  hex: string;
  visible: boolean;
  gamuts: {label: string; inside: boolean}[];
}

const toPx = ([x, y]: Point): Point => [LEFT + x * SCALE, TOP + (Y_MAX - y) * SCALE];
const pxToXy = (px: number, py: number): Point => [(px - LEFT) / SCALE, Y_MAX - (py - TOP) / SCALE];

const locus = spectralLocus(380, 700, 1);

let background: HTMLCanvasElement | null = null;

/** 马蹄形内部逐像素着色，只算一次，之后复用 */
const buildBackground = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = CIE_WIDTH;
  canvas.height = CIE_HEIGHT;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const image = ctx.createImageData(CIE_WIDTH, CIE_HEIGHT);
  const {data} = image;

  for (let py = 0; py < CIE_HEIGHT; py++) {
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
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(0, Math.ceil(toPx([xs[k], y])[0] - 0.5));
      const to = Math.min(CIE_WIDTH - 1, Math.floor(toPx([xs[k + 1], y])[0] - 0.5));
      for (let px = from; px <= to; px++) {
        const x = pxToXy(px + 0.5, 0)[0];
        const rgb = xyzToDisplayRgb(xyToXyz(x, y));
        const o = (py * CIE_WIDTH + px) * 4;
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
) => {
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
};

const dot = (ctx: CanvasRenderingContext2D, [x, y]: Point, r: number, fill: string, stroke = '#222') => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = stroke;
  ctx.stroke();
};

const drawGrid = (ctx: CanvasRenderingContext2D) => {
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
    label(ctx, (i / 10).toFixed(1), px, bottom + 14, 'center');
  }
  for (let j = 0; j <= 9; j++) {
    const [left, py] = toPx([0, j / 10]);
    const right = toPx([X_MAX, j / 10])[0];
    ctx.beginPath();
    ctx.moveTo(left, Math.round(py) + 0.5);
    ctx.lineTo(right, Math.round(py) + 0.5);
    ctx.stroke();
    label(ctx, (j / 10).toFixed(1), left - 6, py, 'right');
  }
  label(ctx, 'x', toPx([X_MAX / 2, 0])[0], CIE_HEIGHT - 6, 'center');
  label(ctx, 'y', 12, TOP + 8, 'center');
};

const drawLocus = (ctx: CanvasRenderingContext2D) => {
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

  const center = toPx([0.33, 0.33]);
  [450, 500, 550, 600, 650].forEach(l => {
    const p = toPx(locusXy(l));
    const dx = p[0] - center[0];
    const dy = p[1] - center[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    dot(ctx, p, 2.5, '#333');
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(p[0] + nx * 8, p[1] + ny * 8);
    ctx.stroke();
    const shift = l === 450 ? 14 : 0;
    label(
      ctx,
      `${l}nm`,
      p[0] + nx * 11 + shift,
      p[1] + ny * 11,
      shift || nx > 0.3 ? 'left' : nx < -0.3 ? 'right' : 'center',
      ny > 0.3 ? 'top' : ny < -0.3 ? 'bottom' : 'middle'
    );
  });
};

const PLANCKIAN_COLOR = '#C92A2A';

const drawPlanckian = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  for (let t = 1000; t <= 20000; t += 250) {
    const [x, y] = toPx(xyzToXy(blackbodyXyz(t)));
    if (t === 1000) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = PLANCKIAN_COLOR;
  ctx.stroke();

  [2000, 3000, 4000, 6500, 10000].forEach(t => {
    const p = toPx(xyzToXy(blackbodyXyz(t)));
    dot(ctx, p, 3, '#FFF', PLANCKIAN_COLOR);
    label(ctx, `${t}K`, p[0] + 7, p[1] - 8, 'left', 'middle', PLANCKIAN_COLOR);
  });
};

const drawGamuts = (ctx: CanvasRenderingContext2D, state: CieState) => {
  GAMUTS.filter(g => state.gamuts[g.key]).forEach(g => {
    const pts = g.points.map(toPx);
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = g.color;
    ctx.stroke();
    pts.forEach(p => dot(ctx, p, 3, g.color, g.color));
  });
};

const drawLegend = (ctx: CanvasRenderingContext2D, state: CieState) => {
  const items = GAMUTS.filter(g => state.gamuts[g.key]).map(g => ({text: g.label, color: g.color}));
  if (state.planckian) {
    items.push({text: '黑体轨迹', color: PLANCKIAN_COLOR});
  }
  const x = toPx([0.52, 0])[0];
  items.forEach(({text, color}, i) => {
    const y = TOP + 14 + i * 20;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 22, y);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = color;
    ctx.stroke();
    label(ctx, text, x + 30, y);
  });
};

const drawCie = (ctx: CanvasRenderingContext2D, state: CieState): void => {
  background = background || buildBackground();
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, CIE_WIDTH, CIE_HEIGHT);
  ctx.drawImage(background, 0, 0);
  drawGrid(ctx);
  drawLocus(ctx);
  if (state.planckian) {
    drawPlanckian(ctx);
  }
  drawGamuts(ctx, state);

  const white = toPx(D65);
  dot(ctx, white, 4.5, '#FFF');
  label(ctx, 'D65', white[0] - 8, white[1] + 12, 'right');

  if (state.selected) {
    const [x, y] = toPx(state.selected);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFF';
    ctx.strokeRect(x - 5, y - 5, 10, 10);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(x - 5, y - 5, 10, 10);
  }
  drawLegend(ctx, state);
};

const describePoint = (px: number, py: number): PointInfo => {
  const [x, y] = pxToXy(px, py);
  return {
    x,
    y,
    hex: y > 0.005 ? toHex(xyzToDisplayRgb(xyToXyz(x, y))) : '#000000',
    visible: pointInPolygon([x, y], locus),
    gamuts: GAMUTS.map(g => ({label: g.label, inside: pointInPolygon([x, y], g.points)}))
  };
};

export {
  CieState,
  PointInfo,
  CIE_WIDTH,
  CIE_HEIGHT,
  drawCie,
  describePoint
};
