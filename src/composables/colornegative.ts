import {PATCHES} from '../utils/camera';
import {srgbToLinear} from '../utils/space';
import type {Vec3} from '../utils/space';
import {text} from '../utils/spectral';
import {
  X0,
  dyeDensity,
  measure,
  exposeFilm,
  negativeRgb,
  makePrinter
} from '../utils/colornegative';
import type {PrintMode} from '../utils/colornegative';

type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

const SCENE_W = 240;
const SCENE_H = 210;
const SKY_H = 46;
const MID_H = 48;
const RAMP_Y = SKY_H + MID_H;
const RAMP_H = 16;
const CHART_Y = RAMP_Y + RAMP_H + 4;
const CHART_COLS = 6;
const CHART_ROWS = 4;
const CELL_W = SCENE_W / CHART_COLS;
const CELL_H = (SCENE_H - CHART_Y) / CHART_ROWS;

const hash2 = (x: number, y: number): number => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const mix = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const SKY_TOP: Vec3 = [70, 120, 200];
const SKY_LOW: Vec3 = [180, 214, 246];
const LEAF_DARK: Vec3 = [48, 100, 42];
const LEAF_LIGHT: Vec3 = [140, 164, 56];
const WALL: Vec3 = [110, 108, 104];
const SKIN: Vec3 = [226, 172, 146];
const BOARD: Vec3 = [30, 30, 32];

/** 一张完全由程序生成的 sRGB 画面：天空、树叶、肤色、灰阶、24 色块 */
const makeScene = (): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(SCENE_W * SCENE_H * 4);
  for (let y = 0; y < SCENE_H; y++) {
    for (let x = 0; x < SCENE_W; x++) {
      let c: Vec3 = BOARD;
      if (y < SKY_H) {
        c = mix(SKY_TOP, SKY_LOW, y / SKY_H);
      } else if (y < RAMP_Y) {
        if (x < SCENE_W / 2) {
          c = mix(LEAF_DARK, LEAF_LIGHT, Math.min(1, hash2(x >> 2, y >> 2) * 0.7 + hash2(x, y) * 0.3));
        } else {
          c = WALL;
          const dx = (x - 180) / 38;
          const dy = (y - (SKY_H + MID_H / 2)) / 21;
          const d = dx * dx + dy * dy;
          if (d < 1) {
            const shade = 1 - 0.22 * Math.hypot(dx + 0.35, dy + 0.35) / 1.5;
            c = [SKIN[0] * shade, SKIN[1] * shade, SKIN[2] * shade];
          }
        }
      } else if (y < RAMP_Y + RAMP_H) {
        const v = 255 * x / (SCENE_W - 1);
        c = [v, v, v];
      } else if (y >= CHART_Y) {
        const col = Math.floor(x / CELL_W);
        const row = Math.floor((y - CHART_Y) / CELL_H);
        const inX = x - col * CELL_W;
        const inY = (y - CHART_Y) - row * CELL_H;
        if (inX >= 2 && inX < CELL_W - 2 && inY >= 2 && inY < CELL_H - 2) {
          c = PATCHES[row * CHART_COLS + col].srgb;
        }
      }
      const i = (y * SCENE_W + x) * 4;
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = 255;
    }
  }
  return out;
};

const SCENE_BYTES = makeScene();

const SCENE_LINEAR = ((): Float32Array => {
  const out = new Float32Array(SCENE_W * SCENE_H * 3);
  for (let p = 0; p < SCENE_W * SCENE_H; p++) {
    for (let k = 0; k < 3; k++) {
      out[p * 3 + k] = srgbToLinear(SCENE_BYTES[p * 4 + k] / 255);
    }
  }
  return out;
})();

const mapScene = (fn: (linear: Vec3) => Vec3): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(SCENE_W * SCENE_H * 4);
  for (let p = 0; p < SCENE_W * SCENE_H; p++) {
    const [r, g, b] = fn([SCENE_LINEAR[p * 3], SCENE_LINEAR[p * 3 + 1], SCENE_LINEAR[p * 3 + 2]]);
    out[p * 4] = r;
    out[p * 4 + 1] = g;
    out[p * 4 + 2] = b;
    out[p * 4 + 3] = 255;
  }
  return out;
};

/** 负片在灯箱上的样子 */
const negativeBytes = (mask: number): Uint8ClampedArray => mapScene(lin => negativeRgb(lin, mask));

/** 扫描、反相之后的正像。mask 是胶片真实的橙罩，assumedMask 是扫描时假设的橙罩 */
const printBytes = (mask: number, mode: PrintMode, assumedMask: number): Uint8ClampedArray => {
  const print = makePrinter(mode, assumedMask);
  return mapScene(lin => print(exposeFilm(lin, mask)));
};

const putBytes = (ctx: CanvasRenderingContext2D, bytes: Uint8ClampedArray): void => {
  const tmp = document.createElement('canvas');
  tmp.width = SCENE_W;
  tmp.height = SCENE_H;
  (tmp.getContext('2d') as CanvasRenderingContext2D).putImageData(new ImageData(bytes, SCENE_W, SCENE_H), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0);
};

const drawScene = (bytes: () => Uint8ClampedArray): DrawFn => ctx => {
  putBytes(ctx, bytes());
};

// ---------- 特性曲线 ----------

const CURVE_W = 480;
const CURVE_H = 300;
const PLOT = {x: 52, y: 14, w: 400, h: 230};
const X_MIN = -3;
const X_MAX = 1;
const Y_MAX = 3;

/** 中性灰（三层曝光相同）在 R、G、B 三个测量通道上的密度曲线，虚线是单层成色密度 */
const drawCurves = (mask: () => number): DrawFn => ctx => {
  const s = mask();
  const px = (x: number) => PLOT.x + (x - X_MIN) / (X_MAX - X_MIN) * PLOT.w;
  const py = (d: number) => PLOT.y + (1 - d / Y_MAX) * PLOT.h;

  ctx.strokeStyle = '#E2E4EA';
  ctx.lineWidth = 1;
  for (let x = X_MIN; x <= X_MAX; x++) {
    ctx.beginPath();
    ctx.moveTo(px(x), py(0));
    ctx.lineTo(px(x), py(Y_MAX));
    ctx.stroke();
    text(ctx, `${x}`, px(x), py(0) + 14);
  }
  for (let d = 0; d <= Y_MAX; d++) {
    ctx.beginPath();
    ctx.moveTo(px(X_MIN), py(d));
    ctx.lineTo(px(X_MAX), py(d));
    ctx.stroke();
    text(ctx, `${d}`, PLOT.x - 8, py(d), 'right');
  }

  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#BBB';
  ctx.beginPath();
  ctx.moveTo(px(X0), py(0));
  ctx.lineTo(px(X0), py(Y_MAX));
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, '18% 灰', px(X0), py(Y_MAX) + 8, 'center', '#888', '11px sans-serif');

  const steps = 160;
  const colors = ['#E5483B', '#2EA043', '#3B6FE5'];
  const curves = Array.from({length: steps + 1}, (_, i) => {
    const x = X_MIN + (X_MAX - X_MIN) * i / steps;
    const d = dyeDensity(x);
    return {x, dye: d, meas: measure([d, d, d], s)};
  });

  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  curves.forEach(({x, dye}, i) => (i ? ctx.lineTo(px(x), py(dye)) : ctx.moveTo(px(x), py(dye))));
  ctx.stroke();
  ctx.setLineDash([]);

  colors.forEach((color, k) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    curves.forEach(({x, meas}, i) => (i ? ctx.lineTo(px(x), py(meas[k])) : ctx.moveTo(px(x), py(meas[k]))));
    ctx.stroke();
  });

  text(ctx, '曝光量 log10（0 = 100% 反射的白）', PLOT.x + PLOT.w / 2, py(0) + 32, 'center', '#555');
  ctx.save();
  ctx.translate(14, PLOT.y + PLOT.h / 2);
  ctx.rotate(-Math.PI / 2);
  text(ctx, '测量密度', 0, 0, 'center', '#555');
  ctx.restore();

  ctx.fillStyle = '#FFF';
  ctx.fillRect(PLOT.x + 1, PLOT.y + 1, PLOT.w - 2, 18);
  [['R 通道', colors[0]], ['G 通道', colors[1]], ['B 通道', colors[2]], ['单层成色密度', '#999']].forEach(([label, color], i) => {
    ctx.fillStyle = color;
    ctx.fillRect(PLOT.x + 12 + i * 92, PLOT.y + 8, 14, 3);
    text(ctx, label, PLOT.x + 30 + i * 92, PLOT.y + 9, 'left', '#333', '11px sans-serif');
  });
};

export {
  SCENE_W,
  SCENE_H,
  SCENE_BYTES,
  CURVE_W,
  CURVE_H,
  negativeBytes,
  printBytes,
  drawScene,
  drawCurves
};
