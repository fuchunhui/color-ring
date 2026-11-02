import {PATCHES} from '../utils/camera';
import {clamp01} from '../utils/colorgrade';
import type {Rgb, WheelState} from '../utils/colorgrade';

type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

const SCENE_W = 300;
const SCENE_H = 250;

const hash2 = (x: number, y: number): number => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const SKY_TOP: Rgb = [58, 110, 190];
const SKY_HORIZON: Rgb = [172, 210, 245];
const CLOUD: Rgb = [245, 246, 250];
const LEAF_DARK: Rgb = [48, 100, 42];
const LEAF_LIGHT: Rgb = [132, 160, 54];
const WALL: Rgb = [95, 100, 110];
const SKIN: Rgb = [226, 172, 146];
const BOARD: Rgb = [24, 24, 26];

const SKY_H = 60;
const MID_Y = 60;
const MID_H = 60;
const RAMP_Y = 120;
const RAMP_H = 20;
const CHART_Y = 144;
const CHART_COLS = 6;
const CHART_ROWS = 4;
const CHART_CELL_W = SCENE_W / CHART_COLS;
const CHART_CELL_H = 26;

/** 一张完全由程序生成的 sRGB 测试画面：天空、树叶、肤色、灰阶、24 色块 */
const makeSceneBytes = (): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(SCENE_W * SCENE_H * 4);
  const put = (x: number, y: number, c: Rgb) => {
    const i = (y * SCENE_W + x) * 4;
    out[i] = c[0];
    out[i + 1] = c[1];
    out[i + 2] = c[2];
    out[i + 3] = 255;
  };

  for (let y = 0; y < SCENE_H; y++) {
    for (let x = 0; x < SCENE_W; x++) {
      let c: Rgb = BOARD;
      if (y < SKY_H) {
        c = mix(SKY_TOP, SKY_HORIZON, y / SKY_H);
        const d = ((x - 210) / 55) ** 2 + ((y - 24) / 13) ** 2;
        c = mix(c, CLOUD, clamp01(1 - d) ** 0.8 * 0.9);
      } else if (y < MID_Y + MID_H) {
        if (x < SCENE_W / 2) {
          const coarse = hash2(x >> 2, y >> 2);
          const fine = hash2(x, y);
          c = mix(LEAF_DARK, LEAF_LIGHT, clamp01(coarse * 0.7 + fine * 0.3));
        } else {
          c = WALL;
          const dx = (x - 225) / 44;
          const dy = (y - 90) / 27;
          const d = dx * dx + dy * dy;
          if (d < 1) {
            const shade = 1 - 0.22 * Math.hypot(dx + 0.35, dy + 0.35) / 1.5;
            c = [SKIN[0] * shade, SKIN[1] * shade, SKIN[2] * shade];
          }
        }
      } else if (y >= RAMP_Y && y < RAMP_Y + RAMP_H) {
        const v = 255 * x / (SCENE_W - 1);
        c = [v, v, v];
      } else if (y >= CHART_Y && y < CHART_Y + CHART_ROWS * CHART_CELL_H) {
        const col = Math.floor(x / CHART_CELL_W);
        const row = Math.floor((y - CHART_Y) / CHART_CELL_H);
        const inX = x - col * CHART_CELL_W;
        const inY = (y - CHART_Y) - row * CHART_CELL_H;
        if (inX >= 2 && inX < CHART_CELL_W - 2 && inY >= 2 && inY < CHART_CELL_H - 2) {
          c = PATCHES[row * CHART_COLS + col].srgb;
        }
      }
      put(x, y, c);
    }
  }
  return out;
};

const SCENE_BYTES = makeSceneBytes();

const toByte = (v: number): number => Math.round(clamp01(v) * 255);

/** 对每个像素调用 fn（输入输出都是 0~1 的 sRGB 编码值） */
const gradeBytes = (bytes: Uint8ClampedArray, fn: (rgb: Rgb) => Rgb): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(bytes.length);
  for (let i = 0; i < bytes.length; i += 4) {
    const [r, g, b] = fn([bytes[i] / 255, bytes[i + 1] / 255, bytes[i + 2] / 255]);
    out[i] = toByte(r);
    out[i + 1] = toByte(g);
    out[i + 2] = toByte(b);
    out[i + 3] = 255;
  }
  return out;
};

const putBytes = (ctx: CanvasRenderingContext2D, bytes: Uint8ClampedArray, width: number, height: number): void => {
  const tmp = document.createElement('canvas');
  tmp.width = width;
  tmp.height = height;
  (tmp.getContext('2d') as CanvasRenderingContext2D).putImageData(new ImageData(bytes, width, height), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0);
};

const drawScene = (bytes: () => Uint8ClampedArray): DrawFn => ctx => {
  putBytes(ctx, bytes(), SCENE_W, SCENE_H);
};

// ---------- 色轮 ----------

const WHEEL_SIZE = 140;
const WHEEL_R = 62;
const WHEEL_C = WHEEL_SIZE / 2;

const hsvToBytes = (h: number, s: number, v: number): Rgb => {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  };
  return [f(5), f(3), f(1)];
};

const makeWheelBytes = (): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(WHEEL_SIZE * WHEEL_SIZE * 4);
  for (let y = 0; y < WHEEL_SIZE; y++) {
    for (let x = 0; x < WHEEL_SIZE; x++) {
      const dx = x + 0.5 - WHEEL_C;
      const dy = y + 0.5 - WHEEL_C;
      const r = Math.hypot(dx, dy);
      if (r > WHEEL_R) {
        continue;
      }
      const hue = (Math.atan2(-dy, dx) * 180 / Math.PI + 360) % 360;
      const [cr, cg, cb] = hsvToBytes(hue, r / WHEEL_R, 0.92);
      const i = (y * WHEEL_SIZE + x) * 4;
      out[i] = cr;
      out[i + 1] = cg;
      out[i + 2] = cb;
      out[i + 3] = 255;
    }
  }
  return out;
};

const WHEEL_BYTES = makeWheelBytes();

const drawWheel = (state: () => WheelState): DrawFn => ctx => {
  const s = state();
  const tmp = document.createElement('canvas');
  tmp.width = WHEEL_SIZE;
  tmp.height = WHEEL_SIZE;
  (tmp.getContext('2d') as CanvasRenderingContext2D).putImageData(new ImageData(WHEEL_BYTES.slice(), WHEEL_SIZE, WHEEL_SIZE), 0, 0);
  ctx.drawImage(tmp, 0, 0);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(WHEEL_C, WHEEL_C, WHEEL_R, 0, Math.PI * 2);
  ctx.moveTo(WHEEL_C - 5, WHEEL_C);
  ctx.lineTo(WHEEL_C + 5, WHEEL_C);
  ctx.moveTo(WHEEL_C, WHEEL_C - 5);
  ctx.lineTo(WHEEL_C, WHEEL_C + 5);
  ctx.stroke();

  const rad = s.hue * Math.PI / 180;
  const px = WHEEL_C + Math.cos(rad) * s.amount * WHEEL_R;
  const py = WHEEL_C - Math.sin(rad) * s.amount * WHEEL_R;
  ctx.beginPath();
  ctx.arc(px, py, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#FFF';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#222';
  ctx.stroke();
};

// ---------- 灰阶曲线 ----------

const CURVE_W = 280;
const CURVE_H = 280;

const text = (ctx: CanvasRenderingContext2D, str: string, x: number, y: number, align: CanvasTextAlign = 'center', color = '#555'): void => {
  ctx.fillStyle = color;
  ctx.font = '11px sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
};

/** 灰色输入 (v, v, v) 经过调色后，R、G、B 三条输出曲线 */
const drawCurves = (fn: () => (rgb: Rgb) => Rgb): DrawFn => ctx => {
  const f = fn();
  const size = 212;
  const x0 = 56;
  const y0 = 14;
  const px = (v: number) => x0 + v * size;
  const py = (v: number) => y0 + (1 - v) * size;

  ctx.strokeStyle = '#E2E4EA';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(px(i / 4), py(0));
    ctx.lineTo(px(i / 4), py(1));
    ctx.moveTo(px(0), py(i / 4));
    ctx.lineTo(px(1), py(i / 4));
    ctx.stroke();
    text(ctx, (i / 4).toFixed(2), px(i / 4), py(0) + 14);
    text(ctx, (i / 4).toFixed(2), x0 - 6, py(i / 4), 'right');
  }
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#AAA';
  ctx.beginPath();
  ctx.moveTo(px(0), py(0));
  ctx.lineTo(px(1), py(1));
  ctx.stroke();
  ctx.setLineDash([]);

  const colors = ['#E5483B', '#2EA043', '#3B6FE5'];
  const steps = 128;
  const samples = Array.from({length: steps + 1}, (_, i) => f([i / steps, i / steps, i / steps]));
  colors.forEach((color, k) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    samples.forEach((s, i) => {
      const x = px(i / steps);
      const y = py(s[k]);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  });
  text(ctx, '输入（灰阶 0~1）', px(0.5), py(0) + 32);
  text(ctx, '输出', 12, py(0.5));
};

// ---------- RGB parade ----------

const PANEL_W = 110;
const PANEL_H = 128;
const PANEL_GAP = 10;
const PARADE_W = PANEL_W * 3 + PANEL_GAP * 2;
const PARADE_H = PANEL_H + 20;

/** 横轴是画面的横向位置，纵轴是该通道的值，亮度表示这一列里有多少像素落在这个值上 */
const drawParade = (bytes: () => Uint8ClampedArray): DrawFn => ctx => {
  const data = bytes();
  const grids = [0, 1, 2].map(() => new Float32Array(PANEL_W * PANEL_H));
  for (let y = 0; y < SCENE_H; y++) {
    for (let x = 0; x < SCENE_W; x++) {
      const bin = Math.min(PANEL_W - 1, Math.floor(x * PANEL_W / SCENE_W));
      const i = (y * SCENE_W + x) * 4;
      for (let k = 0; k < 3; k++) {
        const level = Math.round(data[i + k] / 255 * (PANEL_H - 1));
        grids[k][(PANEL_H - 1 - level) * PANEL_W + bin] += 1;
      }
    }
  }
  const peak = Math.max(1, ...grids.map(g => g.reduce((a, b) => Math.max(a, b), 0)));
  const tints: Rgb[] = [[255, 70, 60], [60, 220, 90], [80, 130, 255]];

  const img = new ImageData(PARADE_W, PANEL_H);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = 14;
    img.data[i + 1] = 14;
    img.data[i + 2] = 18;
    img.data[i + 3] = 255;
  }
  grids.forEach((grid, k) => {
    const left = k * (PANEL_W + PANEL_GAP);
    for (let y = 0; y < PANEL_H; y++) {
      for (let x = 0; x < PANEL_W; x++) {
        const a = Math.sqrt(grid[y * PANEL_W + x] / peak);
        if (a === 0) {
          continue;
        }
        const i = (y * PARADE_W + left + x) * 4;
        const boost = Math.min(1, a * 1.8 + 0.15);
        img.data[i] = Math.round(14 + (tints[k][0] - 14) * boost);
        img.data[i + 1] = Math.round(14 + (tints[k][1] - 14) * boost);
        img.data[i + 2] = Math.round(18 + (tints[k][2] - 18) * boost);
      }
    }
  });
  ctx.putImageData(img, 0, 0);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i <= 4; i++) {
      const y = Math.min(PANEL_H - 1, Math.round((1 - i / 4) * (PANEL_H - 1)));
      ctx.fillRect(k * (PANEL_W + PANEL_GAP), y, PANEL_W, 1);
    }
  }
  ['R', 'G', 'B'].forEach((label, k) => {
    text(ctx, label, k * (PANEL_W + PANEL_GAP) + PANEL_W / 2, PANEL_H + 10);
  });
};

export {
  DrawFn,
  SCENE_W,
  SCENE_H,
  SCENE_BYTES,
  WHEEL_SIZE,
  WHEEL_R,
  WHEEL_C,
  CURVE_W,
  CURVE_H,
  PARADE_W,
  PARADE_H,
  gradeBytes,
  drawScene,
  drawWheel,
  drawCurves,
  drawParade
};
