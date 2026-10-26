import {Vec3} from '../utils/space';
import {planck, wavelengthToXyz, xyzToClipRgb} from '../utils/cie';
import {DrawFn, rgbCss, text} from '../utils/spectral';
import {
  STARS,
  MAIN_SEQUENCE,
  SPECTRAL_CLASSES,
  bvToTemperature,
  starColor,
  starRadius,
  peakWavelength,
  dopplerWavelength
} from '../utils/stars';
import type {Star} from '../utils/stars';

// ---------- B−V 色指数条 ----------

const BV_W = 720;
const BV_H = 130;
const BV_MIN = -0.3;
const BV_MAX = 2.0;
const BV_LEFT = 30;
const BV_PLOT = 650;

const drawBvStrip: DrawFn = (ctx, w) => {
  for (let px = 0; px < BV_PLOT; px++) {
    const bv = BV_MIN + px / (BV_PLOT - 1) * (BV_MAX - BV_MIN);
    ctx.fillStyle = rgbCss(starColor(bvToTemperature(bv)));
    ctx.fillRect(BV_LEFT + px, 14, 1, 48);
  }
  for (let bv = 0; bv <= 2.0001; bv += 0.5) {
    const x = BV_LEFT + (bv - BV_MIN) / (BV_MAX - BV_MIN) * (BV_PLOT - 1);
    ctx.fillStyle = '#555';
    ctx.fillRect(Math.round(x), 62, 1, 5);
    text(ctx, `B−V ${bv.toFixed(1)}`, x, 78, 'center', '#333', '12px sans-serif');
    text(ctx, `${Math.round(bvToTemperature(bv) / 10) * 10} K`, x, 94, 'center', '#666', '11px sans-serif');
  }
  const xNeg = BV_LEFT;
  text(ctx, `${Math.round(bvToTemperature(BV_MIN) / 100) * 100} K`, xNeg, 108, 'left', '#999', '11px sans-serif');
  text(ctx, '蓝白 → 白 → 黄 → 橙 → 红', w / 2, 118, 'center', '#888', '11px sans-serif');
};

interface ClassRow {
  key: string;
  range: string;
  note: string;
  color: string;
}

const classRows = (): ClassRow[] => {
  return SPECTRAL_CLASSES.map(c => ({
    key: c.key,
    range: `${c.min} ~ ${c.max} K`,
    note: c.note,
    color: rgbCss(starColor(Math.sqrt(c.min * c.max)))
  }));
};

// ---------- 赫罗图 ----------

const HR_W = 720;
const HR_H = 500;
const HR = {left: 56, top: 16, width: 640, height: 430};
const LOGT_HOT = Math.log10(40000);
const LOGT_COOL = Math.log10(2400);
const LOGL_MIN = -4.5;
const LOGL_MAX = 6.3;

const hrX = (t: number): number => HR.left + (LOGT_HOT - Math.log10(t)) / (LOGT_HOT - LOGT_COOL) * HR.width;
const hrY = (l: number): number => HR.top + (LOGL_MAX - Math.log10(l)) / (LOGL_MAX - LOGL_MIN) * HR.height;
const hrXLog = (lt: number): number => HR.left + (LOGT_HOT - lt) / (LOGT_HOT - LOGT_COOL) * HR.width;
const hrYLog = (ll: number): number => HR.top + (LOGL_MAX - ll) / (LOGL_MAX - LOGL_MIN) * HR.height;

const band = (ctx: CanvasRenderingContext2D, pts: [number, number][], width: number, fill: string): void => {
  ctx.beginPath();
  pts.forEach(([lt, ll], i) => {
    const x = hrXLog(lt);
    const y = hrYLog(ll + width);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  for (let i = pts.length - 1; i >= 0; i--) {
    ctx.lineTo(hrXLog(pts[i][0]), hrYLog(pts[i][1] - width));
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
};

const blob = (ctx: CanvasRenderingContext2D, lt: number, ll: number, rx: number, ry: number, fill: string): void => {
  ctx.beginPath();
  ctx.ellipse(hrXLog(lt), hrYLog(ll), rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
};

const radiusPx = (s: Star): number => 3 + Math.min(7, Math.log10(1 + starRadius(s)) * 2.4);

const LABEL_OFFSET: Record<string, [number, number]> = {
  太阳: [8, 10],
  '南门二 A': [8, -8],
  '南门二 B': [-8, 10],
  天仓五: [-8, 12],
  天苑四: [-8, 3],
  巴纳德星: [8, 8],
  比邻星: [8, 10],
  '狼 359': [-8, 10],
  北河三: [8, 4],
  '五车二 Aa': [8, -4],
  毕宿五: [-8, 4],
  大角星: [8, 8],
  '南河三 A': [8, 0]
};

const drawHr = (get: () => number): DrawFn => ctx => {
  const selected = get();
  ctx.fillStyle = '#0b0f1a';
  ctx.fillRect(HR.left, HR.top, HR.width, HR.height);

  band(ctx, MAIN_SEQUENCE, 0.4, 'rgba(120,160,255,0.16)');
  blob(ctx, 3.62, 2.2, 52, 34, 'rgba(255,160,90,0.16)');
  band(ctx, [[4.6, 5.0], [4.2, 5.0], [3.8, 5.0], [3.5, 5.0]], 0.9, 'rgba(255,120,120,0.14)');
  band(ctx, [[4.6, -2.2], [4.3, -2.5], [4.0, -2.9], [3.8, -3.2]], 0.5, 'rgba(180,200,255,0.18)');
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(160,190,255,0.75)';
  ctx.fillText('主序带', hrXLog(4.35) + 6, hrYLog(3.0));
  ctx.fillStyle = 'rgba(255,190,130,0.8)';
  ctx.fillText('巨星', hrXLog(3.62) - 14, hrYLog(2.2) - 40);
  ctx.fillStyle = 'rgba(255,160,160,0.8)';
  ctx.fillText('超巨星', hrXLog(4.45), hrYLog(5.0) - 30);
  ctx.fillStyle = 'rgba(200,215,255,0.85)';
  ctx.fillText('白矮星', hrXLog(4.15), hrYLog(-2.9) + 24);

  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  [3000, 4000, 5000, 7000, 10000, 20000, 40000].forEach(t => {
    const x = Math.round(hrX(t)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, HR.top);
    ctx.lineTo(x, HR.top + HR.height);
    ctx.stroke();
  });
  for (let l = -4; l <= 6; l += 2) {
    const y = Math.round(hrYLog(l)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(HR.left, y);
    ctx.lineTo(HR.left + HR.width, y);
    ctx.stroke();
  }

  STARS.forEach((s, i) => {
    const x = hrX(s.temperature);
    const y = hrY(s.luminosity);
    const r = radiusPx(s);
    const rgb = starColor(s.temperature);
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.25)`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rgbCss(rgb);
    ctx.fill();
    if (i === selected) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const [dx, dy] = LABEL_OFFSET[s.name] || [r + 4, -2];
    const left = dx < 0;
    text(ctx, s.name, x + dx + (left ? 0 : 0), y + dy, left ? 'right' : 'left', '#cfd8f0', '10px sans-serif');
  });

  ctx.strokeStyle = '#666';
  ctx.strokeRect(HR.left + 0.5, HR.top + 0.5, HR.width, HR.height);
  [3000, 4000, 5000, 7000, 10000, 20000, 40000].forEach(t => {
    text(ctx, `${t}`, hrX(t), HR.top + HR.height + 12, 'center', '#555', '11px sans-serif');
  });
  text(ctx, '有效温度 K（对数，左热右冷）', HR.left + HR.width / 2, HR.top + HR.height + 30, 'center', '#444', '12px sans-serif');
  for (let l = -4; l <= 6; l += 2) {
    text(ctx, l === 0 ? '1' : `10${l < 0 ? '⁻' : ''}${'⁰¹²³⁴⁵⁶⁷⁸⁹'[Math.abs(l)]}`, HR.left - 6, hrYLog(l), 'right', '#555', '11px sans-serif');
  }
  text(ctx, '光度（太阳 = 1）', 4, HR.top + HR.height / 2 - 8, 'left', '#444', '11px sans-serif');
};

const nearestStar = (x: number, y: number): number => {
  let best = -1;
  let dist = 18;
  STARS.forEach((s, i) => {
    const d = Math.hypot(hrX(s.temperature) - x, hrY(s.luminosity) - y);
    if (d < dist) {
      dist = d;
      best = i;
    }
  });
  return best;
};

// ---------- 普朗克谱 ----------

const PL_W = 720;
const PL_H = 270;
const PL = {x: 50, y: 14, w: 640, h: 200};
const PL_MIN = 200;
const PL_MAX = 1600;

const plX = (l: number): number => PL.x + (l - PL_MIN) / (PL_MAX - PL_MIN) * PL.w;

const drawPlanckChart = (get: () => number): DrawFn => (ctx, w, h) => {
  const t = get();
  const base = PL.y + PL.h;
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  for (let l = 380; l <= 780; l++) {
    const x = plX(l);
    ctx.fillStyle = rgbCss(xyzToClipRgb(wavelengthToXyz(l)));
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x, PL.y, plX(l + 1) - x + 0.5, PL.h);
  }
  ctx.globalAlpha = 1;
  const values: number[] = [];
  let max = 0;
  for (let l = PL_MIN; l <= PL_MAX; l += 4) {
    const v = planck(l, t);
    values.push(v);
    max = Math.max(max, v);
  }
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = plX(PL_MIN + i * 4);
    const y = base - v / max * (PL.h - 8);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#222';
  ctx.stroke();
  const peak = peakWavelength(t);
  if (peak >= PL_MIN && peak <= PL_MAX) {
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#e0592a';
    ctx.beginPath();
    ctx.moveTo(plX(peak), PL.y);
    ctx.lineTo(plX(peak), base);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, `峰值 ${peak.toFixed(0)} nm`, plX(peak) + 6, PL.y + 10, 'left', '#e0592a', '12px sans-serif');
  } else {
    text(ctx, `峰值 ${peak.toFixed(0)} nm（在图外）`, PL.x + PL.w - 4, PL.y + 10, 'right', '#e0592a', '12px sans-serif');
  }
  ctx.strokeStyle = '#888';
  ctx.beginPath();
  ctx.moveTo(PL.x, base + 0.5);
  ctx.lineTo(PL.x + PL.w, base + 0.5);
  ctx.stroke();
  for (let l = 200; l <= 1600; l += 200) {
    text(ctx, `${l}`, plX(l), base + 12, 'center', '#555', '11px sans-serif');
  }
  text(ctx, '波长 nm（彩色区域为可见光 380~780 nm）', PL.x + PL.w / 2, base + 30, 'center', '#444', '12px sans-serif');
  text(ctx, '紫外', plX(290), PL.y + PL.h - 10, 'center', '#889', '11px sans-serif');
  text(ctx, '红外', plX(1100), PL.y + PL.h - 10, 'center', '#889', '11px sans-serif');
};

// ---------- 多普勒 ----------

const DOP_W = 720;
const DOP_H = 150;
const REST = 656.28;
const DOP_MIN = 654.5;
const DOP_MAX = 658.1;

interface DopplerOptions {
  velocity: number;
}

const drawDoppler = (get: () => DopplerOptions): DrawFn => (ctx, w) => {
  const {velocity} = get();
  const x0 = 30;
  const pw = w - 60;
  const xOf = (l: number) => x0 + (l - DOP_MIN) / (DOP_MAX - DOP_MIN) * pw;
  for (let px = 0; px < pw; px++) {
    const l = DOP_MIN + px / pw * (DOP_MAX - DOP_MIN);
    ctx.fillStyle = rgbCss(xyzToClipRgb(wavelengthToXyz(l)));
    ctx.fillRect(x0 + px, 24, 1, 46);
  }
  const shifted = dopplerWavelength(REST, velocity);
  const drawLine = (l: number, color: string, dash: boolean, label: string, row: number) => {
    const x = xOf(l);
    ctx.fillStyle = color;
    if (dash) {
      for (let y = 24; y < 70; y += 6) {
        ctx.fillRect(Math.round(x) - 1, y, 2, 3);
      }
    } else {
      ctx.fillRect(Math.round(x) - 1, 24, 3, 46);
    }
    text(ctx, label, x, 84 + row * 16, 'center', color, '12px sans-serif');
  };
  drawLine(REST, 'rgba(0,0,0,0.55)', true, `静止 ${REST} nm`, 0);
  drawLine(shifted, '#000', false, `观测 ${shifted.toFixed(3)} nm`, 1);
  text(ctx, '放大 1000 倍的波长窗口：650~660 nm 之间只有 3.6 nm', w / 2, 128, 'center', '#777', '11px sans-serif');
  text(ctx, `${DOP_MIN} nm`, x0, 14, 'left', '#999', '11px sans-serif');
  text(ctx, `${DOP_MAX} nm`, x0 + pw, 14, 'right', '#999', '11px sans-serif');
};

interface DopplerRow {
  label: string;
  velocity: number;
  observed: number;
  shift: number;
  restColor: string;
  color: string;
}

const dopplerRows = (): DopplerRow[] => {
  const cases: [string, number][] = [
    ['普通恒星（30 km/s）', 30],
    ['巴纳德星（−110 km/s）', -110],
    ['快速恒星（1000 km/s）', 1000],
    ['0.1c（星系/类星体）', 29979.2458],
    ['−0.1c', -29979.2458],
    ['0.3c', 89937.7374]
  ];
  return cases.map(([label, velocity]) => {
    const observed = dopplerWavelength(REST, velocity);
    return {
      label,
      velocity,
      observed,
      shift: observed - REST,
      restColor: rgbCss(xyzToClipRgb(wavelengthToXyz(REST))),
      color: observed >= 380 && observed <= 780 ? rgbCss(xyzToClipRgb(wavelengthToXyz(observed))) : '#222'
    };
  });
};

const starInfo = (s: Star): {hex: string; radius: string} => {
  const rgb: Vec3 = starColor(s.temperature);
  return {
    hex: '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase(),
    radius: starRadius(s) >= 10 ? starRadius(s).toFixed(0) : starRadius(s).toFixed(2)
  };
};

export {
  BV_W,
  BV_H,
  HR_W,
  HR_H,
  PL_W,
  PL_H,
  DOP_W,
  DOP_H,
  REST,
  drawBvStrip,
  classRows,
  drawHr,
  nearestStar,
  drawPlanckChart,
  drawDoppler,
  dopplerRows,
  starInfo
};
