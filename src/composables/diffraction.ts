import {DrawFn, D65, text, rgbCss} from '../utils/spectral';
import {Vec3, xyzToLinear, linearToSrgb} from '../utils/space';
import {cmf, wavelengthToXyz, xyzToClipRgb} from '../utils/cie';
import {nSlit} from '../utils/optics';

const RAD = Math.PI / 180;

const lambdaColor = (l: number): Vec3 => xyzToClipRgb(wavelengthToXyz(l));

const whiteSpd = (l: number): number => {
  const pos = (l - 380) / 5;
  const i = Math.min(D65.length - 2, Math.max(0, Math.floor(pos)));
  return D65[i] * (1 - (pos - i)) + D65[i + 1] * (pos - i);
};

const toByte = (linear: number, gain: number): number => {
  return Math.round(Math.min(1, Math.max(0, linearToSrgb(1 - Math.exp(-Math.max(0, linear) * gain)))) * 255);
};

interface GratingState {
  lines: number;
  dist: number;
}

const SCREEN_W = 800;
const SCREEN_H = 170;
const HALF_WIDTH_CM = 60;
const SLIT_RATIO = 0.4;

const gratingPitch = (lines: number): number => 1e6 / lines;

/** 屏上位置 x（cm）处各级衍射光的 XYZ 之和（连续光谱，按波长-位置的色散密度加权） */
const columnXyz = (x: number, dist: number, d: number): Vec3 => {
  const sum: Vec3 = [0, 0, 0];
  const r = Math.hypot(x, dist);
  const sinT = x / r;
  const maxOrder = Math.floor(d / 380);
  for (let m = 1; m <= maxOrder; m++) {
    const l = d * sinT / m;
    if (l < 380 || l > 780) {
      continue;
    }
    const density = d * dist * dist / (m * r ** 3);
    const envelope = (Math.sin(Math.PI * m * SLIT_RATIO) / (Math.PI * m * SLIT_RATIO)) ** 2;
    const c = cmf(l);
    const w = whiteSpd(l) * density * envelope;
    for (let j = 0; j < 3; j++) {
      sum[j] += w * c[j];
    }
  }
  return sum;
};

const drawGratingScreen = (get: () => GratingState): DrawFn => (ctx, w, h) => {
  const {lines, dist} = get();
  const d = gratingPitch(lines);
  ctx.fillStyle = '#05070A';
  ctx.fillRect(0, 0, w, h);
  const cols: Vec3[] = [];
  let peak = 0;
  for (let px = 0; px < w; px++) {
    const x = Math.abs(px + 0.5 - w / 2) / (w / 2) * HALF_WIDTH_CM;
    const xyz = x < 0.4 ? [0, 0, 0] as Vec3 : columnXyz(x, dist, d);
    cols.push(xyz);
    peak = Math.max(peak, xyz[1]);
  }
  const scale = peak > 0 ? 1 / peak : 0;
  const top = 8;
  const height = h - 40;
  cols.forEach((xyz, px) => {
    const lin = xyzToLinear(xyz.map(v => v * scale) as Vec3);
    ctx.fillStyle = `rgb(${lin.map(v => toByte(v, 1.8)).join(',')})`;
    ctx.fillRect(px, top, 1, height);
  });
  const glow = ctx.createRadialGradient(w / 2, top + height / 2, 0, w / 2, top + height / 2, 60);
  glow.addColorStop(0, 'rgba(255, 252, 240, 1)');
  glow.addColorStop(0.2, 'rgba(255, 250, 235, 0.85)');
  glow.addColorStop(1, 'rgba(255, 250, 235, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(w / 2 - 60, top, 120, height);

  const pxOf = (cm: number) => w / 2 + cm / HALF_WIDTH_CM * (w / 2);
  for (let cm = -HALF_WIDTH_CM; cm <= HALF_WIDTH_CM; cm += 20) {
    ctx.fillStyle = '#6B7785';
    ctx.fillRect(Math.min(w - 1, pxOf(cm)), h - 28, 1, 6);
    if (cm !== 0) {
      const align: CanvasTextAlign = cm === -HALF_WIDTH_CM ? 'left' : cm === HALF_WIDTH_CM ? 'right' : 'center';
      text(ctx, `${cm} cm`, pxOf(cm), h - 14, align, '#9FB3C8', '11px sans-serif');
    }
  }
  text(ctx, '0 级（白）', w / 2, h - 14, 'center', '#C7D0DA', '11px sans-serif');
};

const ORDER_COLORS = ['#D9480F', '#2F9E44', '#1971C2', '#862E9C'];
const ORDERS_W = 420;
const ORDERS_H = 300;

const drawOrdersPlot = (get: () => GratingState): DrawFn => (ctx, w, h) => {
  const {lines, dist} = get();
  const d = gratingPitch(lines);
  const area = {x: 52, y: 22, w: w - 72, h: h - 62};
  const px = (l: number) => area.x + (l - 380) / 400 * area.w;
  const py = (cm: number) => area.y + (1 - cm / 100) * area.h;
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#E3E6EA';
  ctx.lineWidth = 1;
  for (let cm = 0; cm <= 100; cm += 25) {
    ctx.beginPath();
    ctx.moveTo(area.x, py(cm) + 0.5);
    ctx.lineTo(area.x + area.w, py(cm) + 0.5);
    ctx.stroke();
    text(ctx, `${cm}`, area.x - 6, py(cm), 'right', '#555', '11px sans-serif');
  }
  for (let l = 400; l <= 750; l += 50) {
    text(ctx, `${l}`, px(l), area.y + area.h + 14, 'center', '#555', '11px sans-serif');
  }
  text(ctx, '波长 nm', area.x + area.w / 2, h - 10, 'center', '#555', '11px sans-serif');
  text(ctx, '离中心距离 cm', 8, 10, 'left', '#555', '11px sans-serif');
  [1, 2, 3, 4].forEach((m, i) => {
    ctx.strokeStyle = ORDER_COLORS[i];
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let l = 380; l <= 780; l += 5) {
      const s = m * l / d;
      if (s >= 1) {
        break;
      }
      const y = py(dist * s / Math.sqrt(1 - s * s));
      if (!started) {
        ctx.moveTo(px(l), y);
        started = true;
      } else {
        ctx.lineTo(px(l), y);
      }
    }
    ctx.stroke();
    text(ctx, `m = ${m}`, area.x + 8 + i * 52, area.y + 8, 'left', ORDER_COLORS[i], '12px sans-serif');
  });
};

interface LaserLine {
  l: number;
  name: string;
}

const LASERS: LaserLine[] = [
  {l: 405, name: '405 nm 蓝紫'},
  {l: 532, name: '532 nm 绿'},
  {l: 650, name: '650 nm 红'}
];

const LASER_W = 800;
const LASER_H = 200;

const drawLaserDots = (get: () => GratingState): DrawFn => (ctx, w, h) => {
  const {lines, dist} = get();
  const d = gratingPitch(lines);
  ctx.fillStyle = '#05070A';
  ctx.fillRect(0, 0, w, h);
  const pxOf = (cm: number) => w / 2 + cm / HALF_WIDTH_CM * (w / 2);
  LASERS.forEach(({l, name}, row) => {
    const y = 34 + row * 48;
    const color = lambdaColor(l);
    text(ctx, name, 8, y - 16, 'left', rgbCss(color), '12px sans-serif');
    for (let m = -12; m <= 12; m++) {
      const s = m * l / d;
      if (Math.abs(s) >= 1) {
        continue;
      }
      const cm = dist * s / Math.sqrt(1 - s * s);
      if (Math.abs(cm) > HALF_WIDTH_CM) {
        continue;
      }
      const x = pxOf(cm);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 11);
      g.addColorStop(0, rgbCss(color));
      g.addColorStop(0.4, `rgba(${color.join(',')}, 0.6)`);
      g.addColorStop(1, `rgba(${color.join(',')}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - 11, y - 11, 22, 22);
      if (m !== 0) {
        text(ctx, `${m > 0 ? '+' : ''}${m}`, x, y + 17, 'center', '#9FB3C8', '10px sans-serif');
      }
    }
  });
};

interface DiscState {
  kind: string;
  lightAz: number;
  lightEl: number;
  viewEl: number;
}

const DISCS = [
  {key: 'cd', name: 'CD（刻槽间距 1.6 µm）', pitch: 1600},
  {key: 'dvd', name: 'DVD（刻槽间距 0.74 µm）', pitch: 740}
];

const DISC_SIZE = 420;
const ORDER_WEIGHTS = [1, 0.6, 0.3, 0.15];

const drawDisc = (get: () => DiscState): DrawFn => (ctx, w, h) => {
  const {kind, lightAz, lightEl, viewEl} = get();
  const pitch = (DISCS.find(item => item.key === kind) || DISCS[0]).pitch;
  const out = ctx.createImageData(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const outer = w / 2 - 14;
  const hole = 26;
  const lx = Math.cos(lightEl * RAD) * Math.cos(lightAz * RAD);
  const ly = Math.cos(lightEl * RAD) * Math.sin(lightAz * RAD);
  const vx = 0;
  const vy = -Math.cos(viewEl * RAD);
  const qx = lx + vx;
  const qy = ly + vy;
  const sigma = 0.18;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - cx;
      const dy = cy - (y + 0.5);
      const r = Math.hypot(dx, dy);
      const i = (y * w + x) * 4;
      if (r > outer || r < hole) {
        out.data[i + 3] = 0;
        continue;
      }
      const gx = dx / r;
      const gy = dy / r;
      const par = qx * gx + qy * gy;
      const perp = -qx * gy + qy * gx;
      const side = Math.exp(-perp * perp / (2 * sigma * sigma));
      const xyz: Vec3 = [0, 0, 0];
      for (let m = 1; m <= ORDER_WEIGHTS.length; m++) {
        const l = pitch * Math.abs(par) / m;
        if (l >= 380 && l <= 780) {
          const c = cmf(l);
          for (let j = 0; j < 3; j++) {
            xyz[j] += ORDER_WEIGHTS[m - 1] * side * c[j];
          }
        }
      }
      const lin = xyzToLinear(xyz);
      const shade = r > outer - 8 || r < 44 ? 0.08 : 0.24 + 0.03 * Math.sin(r * 0.8);
      for (let j = 0; j < 3; j++) {
        out.data[i + j] = toByte(shade + lin[j] * 0.8, 1.6);
      }
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, outer, 0, 2 * Math.PI);
  ctx.arc(cx, cy, hole, 0, 2 * Math.PI);
  ctx.stroke();
  text(ctx, '观察者在下方，光源方位见滑块', 10, h - 12, 'left', '#555', '12px sans-serif');
};

interface SlitState {
  n: number;
  ratio: number;
}

const SLIT_W = 600;
const SLIT_H = 280;

const drawSlitPlot = (get: () => SlitState): DrawFn => (ctx, w, h) => {
  const {n, ratio} = get();
  const lambda = 550;
  const d = 2000;
  const area = {x: 46, y: 24, w: w - 66, h: h - 64};
  const range = 0.6;
  const px = (s: number) => area.x + (s + range) / (2 * range) * area.w;
  const py = (v: number) => area.y + (1 - v) * area.h;
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#E3E6EA';
  ctx.lineWidth = 1;
  [0, 0.5, 1].forEach(v => {
    ctx.beginPath();
    ctx.moveTo(area.x, py(v) + 0.5);
    ctx.lineTo(area.x + area.w, py(v) + 0.5);
    ctx.stroke();
    text(ctx, `${v}`, area.x - 6, py(v), 'right', '#555', '11px sans-serif');
  });
  for (let s = -0.6; s <= 0.61; s += 0.2) {
    text(ctx, s.toFixed(1), px(s), area.y + area.h + 14, 'center', '#555', '11px sans-serif');
  }
  text(ctx, 'sinθ（λ = 550 nm，缝间距 d = 2 µm）', area.x + area.w / 2, h - 10, 'center', '#555', '11px sans-serif');
  const trace = (fn: (s: number) => number, color: string, width: number, dash: number[]) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    for (let i = 0; i <= 1200; i++) {
      const s = -range + 2 * range * i / 1200;
      const x = px(s);
      const y = py(Math.min(1, fn(s)));
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };
  const alphaOf = (s: number) => Math.PI * ratio * d * s / lambda;
  const betaOf = (s: number) => Math.PI * d * s / lambda;
  trace(s => nSlit(n, betaOf(s), alphaOf(s)), '#1971C2', 1.8, []);
  trace(s => nSlit(1, 0, alphaOf(s)), '#E8590C', 1.6, [5, 4]);
  text(ctx, `${n} 缝的总强度`, area.x + 10, area.y + 6, 'left', '#1971C2', '12px sans-serif');
  text(ctx, '单缝包络（缝宽决定）', area.x + 110, area.y + 6, 'left', '#E8590C', '12px sans-serif');
};

export {
  GratingState,
  DiscState,
  SlitState,
  DISCS,
  SCREEN_W,
  SCREEN_H,
  ORDERS_W,
  ORDERS_H,
  LASER_W,
  LASER_H,
  DISC_SIZE,
  SLIT_W,
  SLIT_H,
  gratingPitch,
  drawGratingScreen,
  drawOrdersPlot,
  drawLaserDots,
  drawDisc,
  drawSlitPlot
};
