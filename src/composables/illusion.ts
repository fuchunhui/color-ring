const GRAY = 128;
const GRAY_CSS = `rgb(${GRAY}, ${GRAY}, ${GRAY})`;

const SIM_BACKGROUNDS: [string, string][] = [
  ['#FFFFFF', '白'],
  ['#000000', '黑'],
  ['#E03131', '红'],
  ['#2F9E44', '绿'],
  ['#1971C2', '蓝']
];

const SIM_W = 480;
const SIM_H = 150;

const drawSimultaneous = (ctx: CanvasRenderingContext2D, bridge: boolean): void => {
  const cell = SIM_W / SIM_BACKGROUNDS.length;
  SIM_BACKGROUNDS.forEach(([color], i) => {
    ctx.fillStyle = color;
    ctx.fillRect(i * cell, 0, cell, 110);
  });
  const cy = 55;
  if (bridge) {
    ctx.fillStyle = GRAY_CSS;
    ctx.fillRect(cell / 2, cy - 7, SIM_W - cell, 14);
  }
  SIM_BACKGROUNDS.forEach((item, i) => {
    ctx.fillStyle = GRAY_CSS;
    ctx.fillRect(i * cell + cell / 2 - 20, cy - 20, 40, 40);
  });
  ctx.fillStyle = '#444';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  SIM_BACKGROUNDS.forEach(([, name], i) => {
    ctx.fillText(`${name}底`, i * cell + cell / 2, 128);
  });
};

const ALBERS_W = 480;
const ALBERS_H = 200;
const ALBERS_PATCH = '#B08A66';
const ALBERS_BG: [string, string] = ['#EBD6A8', '#5E5A8C'];

const drawAlbers = (ctx: CanvasRenderingContext2D, bridge: boolean): void => {
  const half = ALBERS_W / 2;
  ALBERS_BG.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(i * half, 0, half, ALBERS_H);
  });
  const cy = ALBERS_H / 2;
  if (bridge) {
    ctx.fillStyle = ALBERS_PATCH;
    ctx.fillRect(half / 2, cy - 7, half, 14);
  }
  ctx.fillStyle = ALBERS_PATCH;
  [half / 2, half + half / 2].forEach(x => {
    ctx.fillRect(x - 25, cy - 25, 50, 50);
  });
};

const ADELSON_W = 480;
const ADELSON_H = 280;
const CELL = 48;
const COLS = 8;
const ROWS = 5;
const BOARD_X = 48;
const BOARD_Y = 16;
const LIGHT_VALUE = 192;
const DARK_VALUE = 96;
const SHADOW = 0.5;
const SHADOW_P0 = [2.5 * CELL, 0.5 * CELL];
const SHADOW_P1 = [6.5 * CELL, 4.5 * CELL];
const SHADOW_R = 54;
const ADELSON_A = [1, 2];
const ADELSON_B = [4, 2];

const smoothstep = (t: number): number => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

const distanceToSegment = (px: number, py: number): number => {
  const [x0, y0] = SHADOW_P0;
  const [x1, y1] = SHADOW_P1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const t = Math.min(1, Math.max(0, ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
};

/** 棋盘上 (x, y) 处的灰度值，坐标相对棋盘左上角 */
const adelsonValue = (x: number, y: number): number => {
  const col = Math.floor(x / CELL);
  const row = Math.floor(y / CELL);
  const base = (col + row) % 2 === 0 ? LIGHT_VALUE : DARK_VALUE;
  const cover = 1 - smoothstep((distanceToSegment(x + 0.5, y + 0.5) - (SHADOW_R - 8)) / 16);
  return Math.round(base * (1 - SHADOW * cover));
};

const ADELSON_VALUE = DARK_VALUE;

const drawAdelson = (ctx: CanvasRenderingContext2D, bridge: boolean): void => {
  const w = COLS * CELL;
  const h = ROWS * CELL;
  const image = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = adelsonValue(x, y);
      const i = (y * w + x) * 4;
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, BOARD_X, BOARD_Y);

  const cx = BOARD_X + SHADOW_P0[0];
  const cy = BOARD_Y + SHADOW_P0[1];
  const gradient = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, 22);
  gradient.addColorStop(0, '#F1F3F5');
  gradient.addColorStop(1, '#6B7280');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
  ctx.fill();

  const centerOf = ([col, row]: number[]): [number, number] => [
    BOARD_X + (col + 0.5) * CELL,
    BOARD_Y + (row + 0.5) * CELL
  ];
  const [ax, ay] = centerOf(ADELSON_A);
  const [bx, by] = centerOf(ADELSON_B);
  if (bridge) {
    ctx.fillStyle = `rgb(${ADELSON_VALUE}, ${ADELSON_VALUE}, ${ADELSON_VALUE})`;
    ctx.fillRect(ax, ay - 7, bx - ax, 14);
  }
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFF';
  ctx.fillText('A', ax - CELL / 2 + 4, ay - CELL / 2 + 3);
  ctx.fillText('B', bx - CELL / 2 + 4, by - CELL / 2 + 3);
};

const MUNKER_W = 480;
const MUNKER_H = 250;
const MUNKER_GRAY = '#8C8C8C';
const MUNKER_COLORS: [string, string][] = [
  ['#E03131', '红色条纹'],
  ['#1971C2', '蓝色条纹']
];
const MUNKER_PATCHES = [24, 90, 156];

const drawMunker = (ctx: CanvasRenderingContext2D, solid: boolean): void => {
  const fieldW = 224;
  const fieldH = 210;
  const stripe = 4;
  MUNKER_COLORS.forEach(([color, name], f) => {
    const x0 = 8 + f * (fieldW + 16);
    const y0 = 8;
    for (let y = 0; y < fieldH; y += stripe) {
      ctx.fillStyle = (y / stripe) % 2 === 0 ? color : '#FFFFFF';
      ctx.fillRect(x0, y0 + y, fieldW, stripe);
    }
    MUNKER_PATCHES.forEach(py => {
      const px = x0 + (fieldW - 56) / 2;
      ctx.fillStyle = MUNKER_GRAY;
      if (solid) {
        ctx.fillRect(px, y0 + py, 56, 40);
        return;
      }
      for (let y = py; y < py + 40; y += stripe) {
        if ((y / stripe) % 2 === 1) {
          ctx.fillRect(px, y0 + y, 56, stripe);
        }
      }
    });
    ctx.fillStyle = '#444';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, x0 + fieldW / 2, y0 + fieldH + 16);
  });
};

const BEZOLD_W = 480;
const BEZOLD_H = 180;

const drawBezold = (ctx: CanvasRenderingContext2D, accent: string): void => {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, BEZOLD_W, BEZOLD_H);
  const bands = 6;
  const bandW = BEZOLD_W / bands;
  for (let b = 0; b < bands; b++) {
    ctx.fillStyle = b === 1 || b === 4 ? accent : '#000000';
    for (let x = b * bandW; x < (b + 1) * bandW; x += 10) {
      ctx.fillRect(x + 4, 0, 2, BEZOLD_H);
    }
  }
};

export {
  GRAY,
  SIM_W,
  SIM_H,
  ALBERS_W,
  ALBERS_H,
  ALBERS_PATCH,
  ADELSON_W,
  ADELSON_H,
  ADELSON_VALUE,
  MUNKER_W,
  MUNKER_H,
  MUNKER_GRAY,
  BEZOLD_W,
  BEZOLD_H,
  CELL,
  COLS,
  ROWS,
  ADELSON_A,
  ADELSON_B,
  adelsonValue,
  drawSimultaneous,
  drawAlbers,
  drawAdelson,
  drawMunker,
  drawBezold
};
