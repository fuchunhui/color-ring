import {Vec3} from '../utils/space';
import {wavelengthToXyz, xyzToClipRgb} from '../utils/cie';
import {
  DrawFn,
  Area,
  WL_MIN,
  WL_MAX,
  wlX,
  rgbCss,
  rgbHex,
  text,
  drawSpectrumBand,
  drawAxis,
  drawCurve
} from '../utils/spectral';
import {
  PRESETS,
  SPHERES,
  MEDIA,
  buildStack,
  stackSpectrum,
  reflectanceAt,
  bandCenter,
  reflectColor,
  colorGain,
  opalPeak,
  opalColor,
  hash01
} from '../utils/photonic';

interface StackState {
  preset: string;
  periods: number;
  center: number;
  theta: number;
  jitter: number;
}

interface OpalState {
  diameter: number;
  sphere: string;
  medium: string;
  theta: number;
}

const stackOf = (s: StackState) => buildStack(s.preset, s.periods, s.center);

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

const grid = (ctx: CanvasRenderingContext2D, area: Area, ticks: number[], format: (t: number) => string): void => {
  ctx.strokeStyle = '#DDD';
  ctx.lineWidth = 1;
  ticks.forEach(t => {
    const y = Math.round(area.y + area.h * (1 - t)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(area.x, y);
    ctx.lineTo(area.x + area.w, y);
    ctx.stroke();
    text(ctx, format(t), area.x - 6, y, 'right', '#555', '11px sans-serif');
  });
};

const centerLabel = (spec: number[]): string => {
  const c = bandCenter(spec);
  return c === null ? '没有明显的反射带' : `${c.toFixed(0)} nm`;
};

// ---------- 反射光谱 ----------

const SPECTRUM_W = 700;
const SPECTRUM_H = 250;

const drawStackSpectrum = (get: () => StackState): DrawFn => (ctx, w, h) => {
  const state = get();
  const {layers, ns} = stackOf(state);
  const area: Area = {x: 52, y: 30, w: 520, h: 164};
  const sSpec = stackSpectrum(layers, ns, state.theta, 's', state.jitter);
  const pSpec = stackSpectrum(layers, ns, state.theta, 'p', state.jitter);
  const avg = sSpec.map((v, i) => (v + pSpec[i]) / 2);
  const normal = stackSpectrum(layers, ns, 0, 'avg', state.jitter);
  const gain = colorGain(layers, ns, state.jitter);

  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  drawSpectrumBand(ctx, area, 0.3);
  grid(ctx, area, [0, 0.5, 1], t => `${(t * 100).toFixed(0)}%`);
  ctx.save();
  ctx.setLineDash([5, 4]);
  drawCurve(ctx, area, normal, '#888', 1.5);
  ctx.restore();
  drawCurve(ctx, area, sSpec, '#2E4BD6', 1.5);
  drawCurve(ctx, area, pSpec, '#D6452E', 1.5);
  drawCurve(ctx, area, avg, '#1A1A1A', 2.5);
  drawAxis(ctx, area);
  text(ctx, '反射率', area.x, 11, 'left', '#555', '11px sans-serif');

  [['#1A1A1A', 's、p 平均'], ['#2E4BD6', 's 光'], ['#D6452E', 'p 光'], ['#888', '0° 时（平均）']].forEach(([color, label], i) => {
    const x = area.x + 56 + i * 116;
    ctx.fillStyle = color;
    ctx.fillRect(x, 10, 14, 3);
    text(ctx, label, x + 18, 11, 'left', '#333', '11px sans-serif');
  });

  const rgb = reflectColor(avg, gain);
  const bx = area.x + area.w + 30;
  ctx.fillStyle = rgbCss(rgb);
  ctx.fillRect(bx, area.y, 70, 70);
  ctx.strokeStyle = '#CCC';
  ctx.strokeRect(bx + 0.5, area.y + 0.5, 69, 69);
  text(ctx, '看到的颜色', bx + 35, area.y + 84, 'center', '#333', '12px sans-serif');
  text(ctx, rgbHex(rgb), bx + 35, area.y + 100, 'center', '#555', '12px monospace');
  text(ctx, '反射带重心', bx + 35, area.y + 124, 'center', '#333', '12px sans-serif');
  text(ctx, centerLabel(avg), bx + 35, area.y + 140, 'center', '#555', '12px sans-serif');
};

// ---------- 角度 → 颜色 ----------

const ANGLE_W = 750;
const ANGLE_H = 104;
const ANGLE_MAX = 70;
const ANGLE_STEP = 2;

const drawAngleStrip = (get: () => StackState): DrawFn => (ctx, w, h) => {
  const state = get();
  const {layers, ns} = stackOf(state);
  const gain = colorGain(layers, ns, state.jitter);
  const colors: Vec3[] = [];
  for (let t = 0; t <= ANGLE_MAX; t += ANGLE_STEP) {
    colors.push(reflectColor(stackSpectrum(layers, ns, t, 'avg', state.jitter), gain));
  }
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const x0 = 24;
  const bw = w - 48;
  const barY = 18;
  const barH = 52;
  for (let x = 0; x < bw; x++) {
    const pos = x / bw * ANGLE_MAX / ANGLE_STEP;
    const i0 = Math.min(colors.length - 2, Math.floor(pos));
    const f = pos - i0;
    const c = colors[i0].map((v, k) => v * (1 - f) + colors[i0 + 1][k] * f) as Vec3;
    ctx.fillStyle = rgbCss(c.map(Math.round) as Vec3);
    ctx.fillRect(x0 + x, barY, 1, barH);
  }
  ctx.strokeStyle = '#888';
  ctx.beginPath();
  for (let t = 0; t <= ANGLE_MAX; t += 10) {
    const x = x0 + t / ANGLE_MAX * (bw - 1) + 0.5;
    ctx.moveTo(x, barY + barH);
    ctx.lineTo(x, barY + barH + 5);
    text(ctx, `${t}°`, x, barY + barH + 16, 'center', '#555', '11px sans-serif');
  }
  ctx.stroke();
  const mx = x0 + Math.min(ANGLE_MAX, state.theta) / ANGLE_MAX * (bw - 1) + 0.5;
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.moveTo(mx - 6, 4);
  ctx.lineTo(mx + 6, 4);
  ctx.lineTo(mx, 15);
  ctx.closePath();
  ctx.fill();
};

// ---------- 周期数的影响 ----------

const PERIODS_W = 740;
const PERIODS_H = 250;
const PERIOD_COUNTS = [1, 2, 4, 8, 16];

const drawPeriods = (get: () => StackState): DrawFn => (ctx, w, h) => {
  const state = get();
  const area: Area = {x: 52, y: 18, w: 520, h: 170};
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  drawSpectrumBand(ctx, area, 0.3);
  grid(ctx, area, [0, 0.5, 1], t => `${(t * 100).toFixed(0)}%`);
  PERIOD_COUNTS.forEach((n, i) => {
    const {layers, ns} = buildStack(state.preset, n, state.center);
    const shade = Math.round(190 - i * 40);
    const color = i === PERIOD_COUNTS.length - 1 ? '#1A1A1A' : `rgb(${shade}, ${shade}, ${shade})`;
    let peak = 0;
    ctx.beginPath();
    for (let l = WL_MIN; l <= WL_MAX; l++) {
      const r = (reflectanceAt(layers, ns, l, state.theta, 's') + reflectanceAt(layers, ns, l, state.theta, 'p')) / 2;
      peak = Math.max(peak, r);
      const x = wlX(area, l);
      const y = area.y + area.h * (1 - Math.min(1.05, r));
      if (l === WL_MIN) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.lineJoin = 'round';
    ctx.stroke();
    const lx = area.x + area.w + 24;
    const ly = area.y + 10 + i * 22;
    ctx.fillStyle = color;
    ctx.fillRect(lx, ly - 1, 14, 3);
    text(ctx, `N = ${n}：峰值 ${(peak * 100).toFixed(0)}%`, lx + 20, ly, 'left', '#333', '11px sans-serif');
  });
  drawAxis(ctx, area);
  text(ctx, '反射率（s、p 平均，当前入射角，不含层厚起伏）', area.x, 8, 'left', '#555', '11px sans-serif');
};

// ---------- 蛋白石 ----------

const sphereIndex = (key: string): number => (SPHERES.find(s => s.key === key) || SPHERES[0]).n;
const mediumIndex = (key: string): number => (MEDIA.find(m => m.key === key) || MEDIA[0]).n;

const peakOf = (s: OpalState, theta = s.theta): number => opalPeak(s.diameter, sphereIndex(s.sphere), mediumIndex(s.medium), theta);

interface OpalReadout {
  normal: number;
  current: number;
  hex: string;
}

const opalReadout = (s: OpalState): OpalReadout => {
  const current = peakOf(s);
  return {normal: peakOf(s, 0), current, hex: rgbHex(opalColor(current))};
};

const OPAL_PLOT_W = 700;
const OPAL_PLOT_H = 260;
const OPAL_ANGLE_MAX = 80;
const Y_MIN = 300;
const Y_MAX = 850;

const drawOpalAngle = (get: () => OpalState): DrawFn => (ctx, w, h) => {
  const s = get();
  const area: Area = {x: 56, y: 16, w: 520, h: 200};
  const xOf = (t: number) => area.x + t / OPAL_ANGLE_MAX * area.w;
  const yOf = (l: number) => area.y + (Y_MAX - l) / (Y_MAX - Y_MIN) * area.h;

  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = 0.3;
  const top = Math.round(yOf(WL_MAX));
  const bottom = Math.round(yOf(WL_MIN));
  for (let y = top; y < bottom; y++) {
    const l = WL_MAX - (y - top) / (bottom - top) * (WL_MAX - WL_MIN);
    ctx.fillStyle = rgbCss(xyzToClipRgb(wavelengthToXyz(l)));
    ctx.fillRect(area.x, y, area.w, 1);
  }
  ctx.restore();

  ctx.strokeStyle = '#DDD';
  ctx.lineWidth = 1;
  [400, 500, 600, 700, 800].forEach(l => {
    const y = Math.round(yOf(l)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(area.x, y);
    ctx.lineTo(area.x + area.w, y);
    ctx.stroke();
    text(ctx, `${l}`, area.x - 6, y, 'right', '#555', '11px sans-serif');
  });
  text(ctx, '反射峰波长 nm', area.x, 6, 'left', '#555', '11px sans-serif');
  for (let t = 0; t <= OPAL_ANGLE_MAX; t += 10) {
    text(ctx, `${t}°`, xOf(t), area.y + area.h + 14, 'center', '#555', '11px sans-serif');
  }
  text(ctx, '入射角（空气中）', area.x + area.w / 2, area.y + area.h + 32, 'center', '#333', '11px sans-serif');

  const trace = (medium: string, color: string, dash: number[], width: number) => {
    ctx.save();
    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let t = 0; t <= OPAL_ANGLE_MAX; t += 2) {
      const l = opalPeak(s.diameter, sphereIndex(s.sphere), mediumIndex(medium), t);
      const x = xOf(t);
      const y = Math.min(area.y + area.h, Math.max(area.y, yOf(l)));
      if (t === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.restore();
  };
  const other = s.medium === 'air' ? 'water' : 'air';
  trace(other, '#888', [5, 4], 1.5);
  trace(s.medium, '#1A1A1A', [], 2.5);

  const lx = area.x + area.w + 24;
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(lx, area.y + 9, 14, 3);
  text(ctx, `孔隙里是${(MEDIA.find(m => m.key === s.medium) || MEDIA[0]).name.split('（')[0]}`, lx + 20, area.y + 10, 'left', '#333', '11px sans-serif');
  ctx.save();
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = '#888';
  ctx.beginPath();
  ctx.moveTo(lx, area.y + 31);
  ctx.lineTo(lx + 14, area.y + 31);
  ctx.stroke();
  ctx.restore();
  text(ctx, `换成${(MEDIA.find(m => m.key === other) || MEDIA[0]).name.split('（')[0]}`, lx + 20, area.y + 32, 'left', '#333', '11px sans-serif');

  const cur = peakOf(s);
  const mx = xOf(s.theta);
  const my = Math.min(area.y + area.h, Math.max(area.y, yOf(cur)));
  ctx.fillStyle = rgbCss(opalColor(cur, 1));
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(mx, my, 6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
};

const DIAMETER_MIN = 150;
const DIAMETER_MAX = 350;
const DIAMETER_W = 750;
const DIAMETER_H = 104;

const drawDiameterStrip = (get: () => OpalState): DrawFn => (ctx, w, h) => {
  const s = get();
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const x0 = 24;
  const bw = w - 48;
  const barY = 18;
  const barH = 52;
  const nS = sphereIndex(s.sphere);
  const nM = mediumIndex(s.medium);
  for (let x = 0; x < bw; x++) {
    const d = DIAMETER_MIN + x / (bw - 1) * (DIAMETER_MAX - DIAMETER_MIN);
    ctx.fillStyle = rgbCss(opalColor(opalPeak(d, nS, nM, s.theta)));
    ctx.fillRect(x0 + x, barY, 1, barH);
  }
  ctx.strokeStyle = '#888';
  ctx.beginPath();
  for (let d = DIAMETER_MIN; d <= DIAMETER_MAX; d += 50) {
    const x = x0 + (d - DIAMETER_MIN) / (DIAMETER_MAX - DIAMETER_MIN) * (bw - 1) + 0.5;
    ctx.moveTo(x, barY + barH);
    ctx.lineTo(x, barY + barH + 5);
    text(ctx, `${d} nm`, x, barY + barH + 16, 'center', '#555', '11px sans-serif');
  }
  ctx.stroke();
  const mx = x0 + (clamp01((s.diameter - DIAMETER_MIN) / (DIAMETER_MAX - DIAMETER_MIN))) * (bw - 1) + 0.5;
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.moveTo(mx - 6, 4);
  ctx.lineTo(mx + 6, 4);
  ctx.lineTo(mx, 15);
  ctx.closePath();
  ctx.fill();
};

// ---------- 蛋白石切面（示意） ----------

const CAB_W = 380;
const CAB_H = 290;
const CELL = 20;
const BODY: Vec3 = [22, 20, 30];

interface Domain {
  x: number;
  y: number;
  /** 这一小块晶粒相对整体的取向偏差，度 */
  delta: number;
  amp: number;
  tone: number;
}

const makeDomains = (w: number, h: number): {cols: number; rows: number; list: Domain[]} => {
  const cols = Math.ceil(w / CELL);
  const rows = Math.ceil(h / CELL);
  const list: Domain[] = [];
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const k = (gy * cols + gx) * 5 + 101;
      list.push({
        x: (gx + 0.5 + (hash01(k) - 0.5) * 0.8) * CELL,
        y: (gy + 0.5 + (hash01(k + 1) - 0.5) * 0.8) * CELL,
        delta: (hash01(k + 2) - 0.5) * 80,
        amp: 0.25 + 0.75 * hash01(k + 3),
        tone: 0.9 + 0.2 * hash01(k + 4)
      });
    }
  }
  return {cols, rows, list};
};

const drawCabochon = (get: () => OpalState): DrawFn => (ctx, w, h) => {
  const s = get();
  const nS = sphereIndex(s.sphere);
  const nM = mediumIndex(s.medium);
  const {cols, rows, list} = makeDomains(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2 - 12;
  const ry = h / 2 - 12;

  // 每块晶粒：整体入射角 + 晶粒自身取向偏差 + 球面造成的左右倾斜（边缘处约 ±35°）
  const colors = list.map(d => {
    const tilt = 35 * Math.max(-1, Math.min(1, (d.x - cx) / rx));
    const theta = Math.min(80, Math.abs(s.theta + d.delta + tilt));
    return opalColor(opalPeak(s.diameter, nS, nM, theta), d.amp * d.tone);
  });

  const img = ctx.createImageData(w, h);
  const light: Vec3 = [-0.4, -0.5, 0.77];
  const half = [light[0], light[1], light[2] + 1];
  const halfLen = Math.hypot(half[0], half[1], half[2]);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const nx = (px + 0.5 - cx) / rx;
      const ny = (py + 0.5 - cy) / ry;
      const r2 = nx * nx + ny * ny;
      const i = (py * w + px) * 4;
      const edge = (1 - Math.sqrt(r2)) * Math.min(rx, ry);
      if (edge <= 0) {
        continue;
      }
      const gx = Math.floor(px / CELL);
      const gy = Math.floor(py / CELL);
      let best = -1;
      let bestD = Infinity;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const x = gx + ox;
          const y = gy + oy;
          if (x < 0 || y < 0 || x >= cols || y >= rows) {
            continue;
          }
          const d = list[y * cols + x];
          const dist = (d.x - px) ** 2 + (d.y - py) ** 2;
          if (dist < bestD) {
            bestD = dist;
            best = y * cols + x;
          }
        }
      }
      const z = Math.sqrt(Math.max(0, 1 - r2));
      const diffuse = Math.max(0, nx * light[0] + ny * light[1] + z * light[2]);
      const spec = Math.max(0, (nx * half[0] + ny * half[1] + z * half[2]) / halfLen) ** 60 * 0.22;
      const shade = 0.5 + 0.6 * diffuse;
      const col = colors[best];
      for (let k = 0; k < 3; k++) {
        const v = BODY[k] * (0.6 + 0.4 * z) + col[k] * shade + 255 * spec;
        img.data[i + k] = Math.min(255, Math.round(v));
      }
      img.data[i + 3] = Math.round(Math.min(1, edge) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
};

export {
  StackState,
  OpalState,
  PRESETS,
  SPHERES,
  MEDIA,
  SPECTRUM_W,
  SPECTRUM_H,
  ANGLE_W,
  ANGLE_H,
  ANGLE_MAX,
  PERIODS_W,
  PERIODS_H,
  OPAL_PLOT_W,
  OPAL_PLOT_H,
  DIAMETER_MIN,
  DIAMETER_MAX,
  DIAMETER_W,
  DIAMETER_H,
  CAB_W,
  CAB_H,
  drawStackSpectrum,
  drawAngleStrip,
  drawPeriods,
  drawOpalAngle,
  drawDiameterStrip,
  drawCabochon,
  opalReadout
};
