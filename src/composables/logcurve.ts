import {makeHdrScene} from '../utils/scene';
import type {LinearImage} from '../utils/scene';
import {
  CURVES,
  MIDDLE_GRAY,
  rec709Encode,
  slog3Encode,
  stopsToLinear,
  sCurve
} from '../utils/logcurves';
import {text} from '../utils/spectral';
import type {DrawFn} from '../utils/spectral';

const PLOT_W = 560;
const PLOT_H = 340;
const ZONE_W = 760;
const ZONE_H = 330;
const IMG_W = 240;
const IMG_H = 150;

const STOP_MIN = -10;
const STOP_MAX = 8;

let scene: LinearImage | null = null;
const getScene = (): LinearImage => {
  scene = scene || makeHdrScene(IMG_W, IMG_H);
  return scene;
};

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

const drawStopsPlot: DrawFn = (ctx, w, h) => {
  const a = {x: 46, y: 14, w: w - 190, h: h - 52};
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const px = (stops: number): number => a.x + (stops - STOP_MIN) / (STOP_MAX - STOP_MIN) * a.w;
  const py = (v: number): number => a.y + a.h - v * a.h;

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;
  for (let s = STOP_MIN; s <= STOP_MAX; s += 2) {
    ctx.beginPath();
    ctx.moveTo(Math.round(px(s)) + 0.5, a.y);
    ctx.lineTo(Math.round(px(s)) + 0.5, a.y + a.h);
    ctx.stroke();
    text(ctx, `${s > 0 ? '+' : ''}${s}`, px(s), a.y + a.h + 12, 'center', '#555', '11px sans-serif');
  }
  for (let v = 0; v <= 1; v += 0.25) {
    ctx.beginPath();
    ctx.moveTo(a.x, py(v) + 0.5);
    ctx.lineTo(a.x + a.w, py(v) + 0.5);
    ctx.stroke();
    text(ctx, v.toFixed(2), a.x - 6, py(v), 'right', '#555', '11px sans-serif');
  }
  text(ctx, '相对 18% 灰的档数（stops）', a.x + a.w / 2, h - 8, 'center', '#333', '12px sans-serif');
  text(ctx, '编码值', 22, a.y + 6, 'center', '#333', '12px sans-serif');

  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.moveTo(px(0), a.y);
  ctx.lineTo(px(0), a.y + a.h);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, '18% 灰', px(0) + 4, a.y + 8, 'left', '#777', '11px sans-serif');

  CURVES.forEach((c, i) => {
    ctx.beginPath();
    for (let k = 0; k <= 180; k++) {
      const stops = STOP_MIN + (STOP_MAX - STOP_MIN) * k / 180;
      const v = clamp01(c.encode(stopsToLinear(stops)));
      if (k === 0) {
        ctx.moveTo(px(stops), py(v));
      } else {
        ctx.lineTo(px(stops), py(v));
      }
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = c.color;
    ctx.stroke();
    const ly = a.y + 16 + i * 20;
    ctx.beginPath();
    ctx.moveTo(a.x + a.w + 14, ly);
    ctx.lineTo(a.x + a.w + 34, ly);
    ctx.stroke();
    text(ctx, c.label.replace(/（.*?）/, ''), a.x + a.w + 40, ly, 'left', '#222', '12px sans-serif');
  });
};

const ZONES = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const drawZones: DrawFn = (ctx, w, h) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const left = 128;
  const cell = (w - left - 8) / ZONES.length;
  text(ctx, 'Zone', 12, 22, 'left', '#333', '12px sans-serif');
  ZONES.forEach((z, i) => {
    text(ctx, z, left + cell * (i + 0.5), 22, 'center', '#333', '12px sans-serif');
    const stops = i - 5;
    text(ctx, `${stops > 0 ? '+' : ''}${stops}`, left + cell * (i + 0.5), 38, 'center', '#777', '11px sans-serif');
  });
  text(ctx, '相对 18% 灰', 12, 38, 'left', '#777', '11px sans-serif');

  const rows = CURVES.filter(c => c.key !== 'pq');
  rows.forEach((c, r) => {
    const y = 52 + r * 62;
    text(ctx, c.label, 12, y + 20, 'left', '#222', '12px sans-serif');
    ZONES.forEach((_, i) => {
      const x = stopsToLinear(i - 5);
      const raw = c.encode(x);
      const v = clamp01(raw);
      const gray = c.key === 'srgb' || c.key === 'rec709' ? v : v;
      const code = Math.round(gray * 255);
      ctx.fillStyle = `rgb(${code}, ${code}, ${code})`;
      ctx.fillRect(left + cell * i + 1, y, cell - 2, 40);
      const clipped = raw > 1;
      text(ctx, raw.toFixed(3), left + cell * (i + 0.5), y + 52, 'center', clipped ? '#C92A2A' : '#555', '11px sans-serif');
      if (clipped) {
        text(ctx, '截断', left + cell * (i + 0.5), y + 20, 'center', '#C92A2A', '11px sans-serif');
      }
    });
  });
  text(ctx, '色块灰度 = 该编码值直接当作屏幕灰度显示；红字 = 线性光超过 1.0，被截断', left, h - 10, 'left', '#777', '11px sans-serif');
};

type Mapper = (c: number) => number;

const renderTile = (ctx: CanvasRenderingContext2D, x0: number, y0: number, ev: number, map: Mapper): void => {
  const img = getScene();
  const out = ctx.createImageData(img.width, img.height);
  const gain = 2 ** ev;
  const n = img.width * img.height;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) {
      out.data[i * 4 + c] = Math.round(clamp01(map(img.data[i * 3 + c] * gain)) * 255);
    }
    out.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(out, x0, y0);
};

const LOG_LO = slog3Encode(0.0003);
const LOG_HI = slog3Encode(16);

/** S-Log3 码值 → 显示：把能用的码值范围拉开，S 曲线压住高光和暗部 */
const slogToDisplay = (x: number): number => {
  const y = slog3Encode(x);
  const t = (y - LOG_LO) / (LOG_HI - LOG_LO);
  return sCurve(t, 1.7) ** 1.0;
};

const makeCaptureDraw = (ev: () => number): DrawFn => (ctx, w, h) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const e = ev();
  const gap = 12;
  const labels = ['Rec.709 直出（高光截断）', 'S-Log3 原始记录（又平又灰）', 'S-Log3 → 显示（S 曲线还原）'];
  const maps: Mapper[] = [rec709Encode, slog3Encode, slogToDisplay];
  maps.forEach((m, i) => {
    const x0 = i * (IMG_W + gap);
    renderTile(ctx, x0, 20, e, m);
    text(ctx, labels[i], x0, 10, 'left', '#333', '12px sans-serif');
  });
  void w;
  void h;
};

const CAPTURE_W = IMG_W * 3 + 24;
const CAPTURE_H = IMG_H + 24;

export {
  PLOT_W,
  PLOT_H,
  ZONE_W,
  ZONE_H,
  CAPTURE_W,
  CAPTURE_H,
  MIDDLE_GRAY,
  drawStopsPlot,
  drawZones,
  makeCaptureDraw
};
