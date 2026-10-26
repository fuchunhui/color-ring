import {DrawFn, text, rgbCss} from '../utils/spectral';
import {Vec3, xyzToLinear, linearToSrgb} from '../utils/space';
import {wavelengthToXyz, xyzToClipRgb} from '../utils/cie';
import {
  BOW_STEP,
  BOW_COUNT,
  waterIndex,
  bk7Index,
  flintIndex,
  prismRefract,
  minDeviation,
  dropDeviation,
  bowAngle,
  dropPath,
  rainbowTables
} from '../utils/optics';

const RAD = Math.PI / 180;

const lambdaColor = (l: number): Vec3 => xyzToClipRgb(wavelengthToXyz(l));

interface Glass {
  key: string;
  name: string;
  index: (l: number) => number;
}

const GLASSES: Glass[] = [
  {key: 'bk7', name: 'BK7 冕牌玻璃', index: bk7Index},
  {key: 'flint', name: '火石玻璃（色散更大）', index: flintIndex}
];

const findGlass = (key: string): Glass => GLASSES.find(item => item.key === key) || GLASSES[0];

interface PrismState {
  apex: number;
  inc: number;
  glass: string;
}

const PRISM_W = 720;
const PRISM_H = 340;

const drawPrism = (get: () => PrismState): DrawFn => (ctx, w, h) => {
  const {apex, inc, glass} = get();
  const index = findGlass(glass).index;
  ctx.fillStyle = '#10161C';
  ctx.fillRect(0, 0, w, h);

  const half = apex * RAD / 2;
  const side = 150;
  const ox = 250;
  const oy = 70;
  const toCanvas = (x: number, y: number): [number, number] => [ox + x, oy - y];
  const left: [number, number] = [-side * Math.sin(half), -side * Math.cos(half)];
  const right: [number, number] = [side * Math.sin(half), -side * Math.cos(half)];

  ctx.beginPath();
  [[0, 0], left, right].forEach(([x, y], i) => {
    const [cx, cy] = toCanvas(x, y);
    if (i === 0) {
      ctx.moveTo(cx, cy);
    } else {
      ctx.lineTo(cx, cy);
    }
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(170, 205, 255, 0.16)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(200, 225, 255, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const p1: [number, number] = [left[0] * 0.5, left[1] * 0.5];
  const phiIn = -half + inc * RAD;
  const [sx, sy] = toCanvas(p1[0] - 260 * Math.cos(phiIn), p1[1] - 260 * Math.sin(phiIn));
  const [ex, ey] = toCanvas(p1[0], p1[1]);
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  const screenX = 660;
  ctx.fillStyle = '#2A333C';
  ctx.fillRect(screenX, 8, 22, h - 16);

  const e: [number, number] = [Math.sin(half), -Math.cos(half)];
  const blocked: number[] = [];
  for (let l = 400; l <= 700; l += 5) {
    const result = prismRefract(apex, inc, index(l));
    if (!result) {
      blocked.push(l);
      continue;
    }
    const psi = -half + result.r1 * RAD;
    const d: [number, number] = [Math.cos(psi), Math.sin(psi)];
    const det = -d[0] * e[1] + e[0] * d[1];
    const t = (p1[0] * e[1] - e[0] * p1[1]) / det;
    const p2: [number, number] = [p1[0] + t * d[0], p1[1] + t * d[1]];
    const out = half - result.i2 * RAD;
    const color = rgbCss(lambdaColor(l));
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55;
    const [ix, iy] = toCanvas(p1[0], p1[1]);
    const [jx, jy] = toCanvas(p2[0], p2[1]);
    ctx.beginPath();
    ctx.moveTo(ix, iy);
    ctx.lineTo(jx, jy);
    ctx.stroke();
    const reach = (screenX - ox - p2[0]) / Math.cos(out);
    const [tx, ty] = toCanvas(p2[0] + reach * Math.cos(out), p2[1] + reach * Math.sin(out));
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(jx, jy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.fillRect(screenX, ty - 1.5, 22, 3);
  }

  const lines = [400, 550, 700].map(l => {
    const r = prismRefract(apex, inc, index(l));
    return `${l} nm：${r ? r.deviation.toFixed(1) + '°' : '全反射'}`;
  });
  text(ctx, '总偏向角', 14, 18, 'left', '#FFF', '13px sans-serif');
  lines.forEach((line, i) => text(ctx, line, 14, 38 + i * 18, 'left', '#CDD6DE', '12px sans-serif'));
  const min = minDeviation(apex, index(550));
  if (min) {
    const near = Math.abs(inc - min.incidence) < 1.5;
    text(ctx, `550 nm 最小偏向角 ${min.angle.toFixed(1)}°（入射角 ${min.incidence.toFixed(1)}°）`, 14, h - 36, 'left', '#9FB3C8', '12px sans-serif');
    text(ctx, near ? '现在接近最小偏向角：光在棱镜里几乎平行于底边' : '调节入射角，找到偏向角最小的位置', 14, h - 16, 'left', near ? '#FFD479' : '#9FB3C8', '12px sans-serif');
  }
  if (blocked.length) {
    text(ctx, `${blocked[0]}–${blocked[blocked.length - 1]} nm 的光在第二个面发生全反射`, screenX - 12, 18, 'right', '#FF9F7A', '12px sans-serif');
  }
};

const PLOT_W = 380;
const PLOT_H = 270;

const drawPrismCurve = (get: () => PrismState): DrawFn => (ctx, w, h) => {
  const {apex, inc, glass} = get();
  const index = findGlass(glass).index;
  const area = {x: 48, y: 20, w: w - 70, h: h - 56};
  const series = [400, 550, 700].map(l => {
    const pts: [number, number][] = [];
    for (let i = 10; i <= 88; i += 0.5) {
      const r = prismRefract(apex, i, index(l));
      if (r) {
        pts.push([i, r.deviation]);
      }
    }
    return {l, pts};
  });
  const all = series.flatMap(s => s.pts.map(p => p[1]));
  const lo = Math.floor(Math.min(...all) / 5) * 5 - 5;
  const hi = Math.ceil(Math.max(...all) / 5) * 5 + 5;
  const px = (v: number) => area.x + (v - 10) / 78 * area.w;
  const py = (v: number) => area.y + (1 - (v - lo) / (hi - lo)) * area.h;

  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#E3E6EA';
  ctx.lineWidth = 1;
  for (let v = lo; v <= hi; v += 10) {
    ctx.beginPath();
    ctx.moveTo(area.x, py(v) + 0.5);
    ctx.lineTo(area.x + area.w, py(v) + 0.5);
    ctx.stroke();
    text(ctx, `${v}°`, area.x - 6, py(v), 'right', '#555', '11px sans-serif');
  }
  for (let v = 10; v <= 85; v += 15) {
    text(ctx, `${v}°`, px(v), area.y + area.h + 14, 'center', '#555', '11px sans-serif');
  }
  text(ctx, '入射角', area.x + area.w / 2, h - 10, 'center', '#555', '11px sans-serif');
  text(ctx, '偏向角', 8, 10, 'left', '#555', '11px sans-serif');

  series.forEach(({l, pts}) => {
    ctx.strokeStyle = rgbCss(lambdaColor(l));
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      if (i === 0) {
        ctx.moveTo(px(x), py(y));
      } else {
        ctx.lineTo(px(x), py(y));
      }
    });
    ctx.stroke();
    const m = minDeviation(apex, index(l));
    if (m) {
      ctx.fillStyle = rgbCss(lambdaColor(l));
      ctx.beginPath();
      ctx.arc(px(m.incidence), py(m.angle), 3.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
  ctx.strokeStyle = '#333';
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(px(inc), area.y);
  ctx.lineTo(px(inc), area.y + area.h);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, '圆点＝各色最小偏向角，虚线＝当前入射角', area.x + 14, 10, 'left', '#555', '11px sans-serif');
};

interface DropState {
  k: number;
}

const tiMin = (n: number, k: number): number => Math.acos(Math.sqrt((n * n - 1) / (k * (k + 2))));

const DROP_W = 360;
const DROP_H = 340;

const drawDropDiagram = (get: () => DropState): DrawFn => (ctx, w, h) => {
  const {k} = get();
  const cx = 190;
  const cy = 178;
  const radius = 118;
  const toCanvas = (p: [number, number]): [number, number] => [cx + p[0] * radius, cy - p[1] * radius];
  const trace = (path: [number, number][], color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    path.forEach((p, i) => {
      const [x, y] = toCanvas(p);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  };

  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(120, 180, 240, 0.22)';
  ctx.fill();
  ctx.strokeStyle = '#5B8DB8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const n550 = waterIndex(550);
  [14, 28, 44, 72].forEach(deg => trace(dropPath(deg * RAD, n550, k), 'rgba(225, 165, 0, 0.55)', 1.3));
  [700, 550, 400].forEach(l => {
    const n = waterIndex(l);
    trace(dropPath(tiMin(n, k), n, k), rgbCss(lambdaColor(l)), 2.6);
  });

  text(ctx, k === 1 ? '主虹：一次内反射，红光在外圈' : '副虹：两次内反射，颜色顺序反过来', cx, 16, 'center', '#333', '13px sans-serif');
  text(ctx, '阳光 →', 8, cy - radius - 6, 'left', '#B07D00', '12px sans-serif');
  const lo = bowAngle(waterIndex(400), k);
  const hi = bowAngle(waterIndex(700), k);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(0, h - 50, w, 50);
  text(ctx, `彩虹角（从反日点量起）：紫 ${lo.toFixed(1)}° — 红 ${hi.toFixed(1)}°`, cx, h - 34, 'center', '#333', '12px sans-serif');
  text(ctx, '粗线：各色最小偏向角的光线；浅黄：550 nm 的其他光线', cx, h - 14, 'center', '#777', '11px sans-serif');
};

const CURVE_W = 420;
const CURVE_H = 340;

const drawDropCurve = (get: () => DropState): DrawFn => (ctx, w, h) => {
  const {k} = get();
  const area = {x: 52, y: 28, w: w - 74, h: h - 70};
  const series = [400, 550, 700].map(l => {
    const n = waterIndex(l);
    const pts: [number, number][] = [];
    for (let deg = 0.5; deg <= 89.5; deg += 0.5) {
      pts.push([deg, dropDeviation(deg * RAD, n, k)]);
    }
    return {l, n, pts};
  });
  const all = series.flatMap(s => s.pts.map(p => p[1]));
  const lo = Math.floor(Math.min(...all) / 10) * 10 - 5;
  const hi = Math.ceil(Math.max(...all) / 10) * 10 + 5;
  const px = (v: number) => area.x + v / 90 * area.w;
  const py = (v: number) => area.y + (1 - (v - lo) / (hi - lo)) * area.h;

  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#E3E6EA';
  ctx.lineWidth = 1;
  for (let v = Math.ceil(lo / 10) * 10; v <= hi; v += 10) {
    ctx.beginPath();
    ctx.moveTo(area.x, py(v) + 0.5);
    ctx.lineTo(area.x + area.w, py(v) + 0.5);
    ctx.stroke();
    text(ctx, `${v}°`, area.x - 6, py(v), 'right', '#555', '11px sans-serif');
  }
  for (let v = 0; v <= 90; v += 15) {
    text(ctx, `${v}°`, px(v), area.y + area.h + 14, 'center', '#555', '11px sans-serif');
  }
  text(ctx, '入射角 θi', area.x + area.w / 2, h - 10, 'center', '#555', '11px sans-serif');
  text(ctx, `偏向角 D（${k} 次内反射）`, 8, 12, 'left', '#333', '12px sans-serif');

  series.forEach(({l, n, pts}) => {
    const color = rgbCss(lambdaColor(l));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      if (i === 0) {
        ctx.moveTo(px(x), py(y));
      } else {
        ctx.lineTo(px(x), py(y));
      }
    });
    ctx.stroke();
    const ti = tiMin(n, k);
    const d = dropDeviation(ti, n, k);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px(ti / RAD), py(d), 4, 0, 2 * Math.PI);
    ctx.fill();
    text(ctx, `${l} nm：D 最小 ${d.toFixed(1)}°`, area.x + area.w - 4, area.y + 14 + [700, 550, 400].indexOf(l) * 16, 'right', '#333', '11px sans-serif');
  });
};

interface BowRow {
  l: number;
  n: number;
  incidence: number;
  dmin: number;
  alpha: number;
}

const bowRows = (k: number): BowRow[] => [400, 550, 700].map(l => {
  const n = waterIndex(l);
  const ti = tiMin(n, k);
  return {l, n, incidence: ti / RAD, dmin: dropDeviation(ti, n, k), alpha: bowAngle(n, k)};
});

const SKY_W = 720;
const SKY_H = 420;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

const drawRainbowSky = (get: () => {sun: number}): DrawFn => (ctx, w, h) => {
  const {sun} = get();
  const tables = rainbowTables();
  const out = ctx.createImageData(w, h);
  const ppd = 7;
  const centerEl = 20;
  const ax = Math.cos(-sun * RAD);
  const az = Math.sin(-sun * RAD);
  const cosAz: number[] = [];
  const sinAz: number[] = [];
  for (let x = 0; x < w; x++) {
    const a = (x - w / 2) / ppd * RAD;
    cosAz.push(Math.cos(a));
    sinAz.push(Math.sin(a));
  }
  for (let y = 0; y < h; y++) {
    const elDeg = centerEl - (y - h / 2) / ppd;
    const cosEl = Math.cos(elDeg * RAD);
    const sinEl = Math.sin(elDeg * RAD);
    const t = clamp01(elDeg / 60);
    const base = [0.12 - 0.08 * t, 0.15 - 0.08 * t, 0.2 - 0.06 * t];
    for (let x = 0; x < w; x++) {
      const ridge = -1.2 + 1.6 * Math.sin((x - w / 2) / ppd * 0.07 + 1) + 1.0 * Math.sin((x - w / 2) / ppd * 0.19 + 2);
      const i = (y * w + x) * 4;
      if (elDeg < ridge) {
        const g = 8 + clamp01((ridge - elDeg) / 12) * 4;
        out.data[i] = g;
        out.data[i + 1] = g + 6;
        out.data[i + 2] = g + 3;
        out.data[i + 3] = 255;
        continue;
      }
      const dot = cosEl * cosAz[x] * ax + sinEl * az;
      const alpha = Math.acos(Math.min(1, Math.max(-1, dot))) / RAD;
      const idx = Math.floor(alpha / BOW_STEP);
      let lin = base;
      if (idx < BOW_COUNT) {
        const xyz: Vec3 = [
          tables.primary[idx * 3] + tables.secondary[idx * 3],
          tables.primary[idx * 3 + 1] + tables.secondary[idx * 3 + 1],
          tables.primary[idx * 3 + 2] + tables.secondary[idx * 3 + 2]
        ];
        const rgb = xyzToLinear(xyz);
        lin = base.map((v, j) => v + Math.max(0, rgb[j]) * 0.9);
      }
      for (let j = 0; j < 3; j++) {
        out.data[i + j] = Math.round(clamp01(linearToSrgb(1 - Math.exp(-lin[j] * 1.4))) * 255);
      }
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);

  const rowOf = (alpha: number) => h / 2 + (centerEl - (alpha - sun)) * ppd;
  const label = (str: string, alpha: number) => {
    const y = rowOf(alpha);
    if (y > 12 && y < h - 40) {
      text(ctx, str, w / 2, y, 'center', 'rgba(255, 255, 255, 0.9)', '12px sans-serif');
    }
  };
  label('主虹（红在外）', 43.2);
  label('亚历山大暗带', 47.5);
  label('副虹（红在内）', 56);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, h - 26, 330, 26);
  text(ctx, '几何光学模型，没有计入干涉形成的过剩虹', 8, h - 13, 'left', '#E6EDF3', '12px sans-serif');
};

export {
  GLASSES,
  PRISM_W,
  PRISM_H,
  PLOT_W,
  PLOT_H,
  DROP_W,
  DROP_H,
  CURVE_W,
  CURVE_H,
  SKY_W,
  SKY_H,
  BowRow,
  bowRows,
  drawPrism,
  drawPrismCurve,
  drawDropDiagram,
  drawDropCurve,
  drawRainbowSky
};
