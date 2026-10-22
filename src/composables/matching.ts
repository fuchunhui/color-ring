import {Vec3} from '../utils/space';
import {wavelengthToXyz} from '../utils/cie';
import {Area, DrawFn, rgbCss, text, drawAxis, wlX, WL_MIN, WL_MAX} from '../utils/spectral';
import {
  CIE_PRIMARIES,
  cieRgbCmf,
  xyzToCieRgb,
  cieRgbToXyz,
  displayPair
} from '../utils/vision';

const PRIMARY_COLORS = ['#E03131', '#2F9E44', '#1971C2'];
const PRIMARY_NAMES = ['R 700nm', 'G 546.1nm', 'B 435.8nm'];

// 把单色光的匹配值缩放到最大分量的绝对值为 1，滑块的 ±1 范围才够用
const matchScale = (wl: number): number => {
  const m = xyzToCieRgb(wavelengthToXyz(wl)).map(Math.abs);
  return 1 / Math.max(...m, 1e-9);
};

/** 波长 wl 的最佳匹配：三个原色的用量（负数 = 要加到试验光一侧） */
const bestMatch = (wl: number): Vec3 => {
  const s = matchScale(wl);
  return xyzToCieRgb(wavelengthToXyz(wl)).map(v => Math.round(v * s * 1000) / 1000) as Vec3;
};

const PRIMARY_XYZ: Vec3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(v => cieRgbToXyz(v as Vec3));

const addXyz = (a: Vec3, b: Vec3, k: number): Vec3 => a.map((v, i) => v + b[i] * k) as Vec3;

/** 左视场（试验光，外加用量为负的原色）与右视场（用量为正的原色）的 XYZ */
const fieldsXyz = (wl: number, amounts: Vec3): [Vec3, Vec3] => {
  const s = matchScale(wl);
  let left = wavelengthToXyz(wl).map(v => v * s) as Vec3;
  let right: Vec3 = [0, 0, 0];
  amounts.forEach((a, i) => {
    if (a < 0) {
      left = addXyz(left, PRIMARY_XYZ[i], -a);
    } else {
      right = addXyz(right, PRIMARY_XYZ[i], a);
    }
  });
  return [left, right];
};

const needsNegative = (wl: number): boolean => bestMatch(wl).some(v => v < -0.02);

// ---------- 匹配函数曲线 ----------

const CMF_W = 720;
const CMF_H = 300;
const CMF_AREA: Area = {x: 48, y: 24, w: 620, h: 220};
const CMF_MIN = -0.15;
const CMF_MAX = 0.4;

const cmfY = (a: Area, v: number): number => a.y + a.h * (1 - (v - CMF_MIN) / (CMF_MAX - CMF_MIN));

const xToWavelength = (x: number): number => {
  const l = WL_MIN + (x - CMF_AREA.x) / CMF_AREA.w * (WL_MAX - WL_MIN);
  return Math.round(Math.min(700, Math.max(400, l)));
};

const drawCmfPlot = (wl: () => number): DrawFn => ctx => {
  const a = CMF_AREA;
  ctx.strokeStyle = '#E5E5E5';
  ctx.lineWidth = 1;
  [-0.1, 0, 0.1, 0.2, 0.3, 0.4].forEach(v => {
    const y = Math.round(cmfY(a, v)) + 0.5;
    ctx.strokeStyle = v === 0 ? '#888' : '#E5E5E5';
    ctx.beginPath();
    ctx.moveTo(a.x, y);
    ctx.lineTo(a.x + a.w, y);
    ctx.stroke();
    text(ctx, v.toFixed(1), a.x - 8, y, 'right', '#555', '11px sans-serif');
  });

  const curves: [number, string][] = [[0, PRIMARY_COLORS[0]], [1, PRIMARY_COLORS[1]], [2, PRIMARY_COLORS[2]]];
  const zeroY = cmfY(a, 0);
  ctx.beginPath();
  let started = false;
  for (let l = 380; l <= 700; l += 2) {
    const v = cieRgbCmf(l)[0];
    if (v < 0) {
      const x = wlX(a, l);
      if (!started) {
        ctx.moveTo(x, zeroY);
        started = true;
      }
      ctx.lineTo(x, cmfY(a, v));
    }
  }
  ctx.lineTo(wlX(a, 546), zeroY);
  ctx.closePath();
  ctx.fillStyle = 'rgba(224, 49, 49, 0.18)';
  ctx.fill();

  curves.forEach(([i, color]) => {
    ctx.beginPath();
    for (let l = 380; l <= 700; l += 2) {
      const x = wlX(a, l);
      const y = cmfY(a, cieRgbCmf(l)[i]);
      if (l === 380) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = color;
    ctx.stroke();
  });

  CIE_PRIMARIES.forEach((p, i) => {
    const x = Math.round(wlX(a, p)) + 0.5;
    ctx.strokeStyle = PRIMARY_COLORS[i];
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, a.y);
    ctx.lineTo(x, a.y + a.h);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, PRIMARY_NAMES[i], x, a.y - 10, 'center', PRIMARY_COLORS[i], '11px sans-serif');
  });

  const lx = Math.round(wlX(a, wl())) + 0.5;
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(lx, a.y);
  ctx.lineTo(lx, a.y + a.h);
  ctx.stroke();

  drawAxis(ctx, {x: a.x, y: a.y, w: a.w, h: a.h});
  const legend = ['r̄(λ)', 'ḡ(λ)', 'b̄(λ)'];
  legend.forEach((name, i) => {
    ctx.fillStyle = PRIMARY_COLORS[i];
    ctx.fillRect(a.x + a.w - 90, a.y + 8 + i * 18, 14, 3);
    text(ctx, name, a.x + a.w - 70, a.y + 10 + i * 18, 'left', '#333', '12px sans-serif');
  });
  text(ctx, 'r̄ 在约 436–546nm 之间为负', wlX(a, 441), cmfY(a, -0.12), 'left', '#C92A2A', '12px sans-serif');
  text(ctx, '点击图表选择试验光波长', 8, CMF_H - 14, 'left', '#999', '11px sans-serif');
};

// ---------- 视场 ----------

const FIELD_W = 460;
const FIELD_H = 230;

const drawFields = (wl: () => number, amounts: () => Vec3): DrawFn => ctx => {
  const [left, right] = fieldsXyz(wl(), amounts());
  const [lc, rc] = displayPair(left, right);
  ctx.fillStyle = rgbCss(lc);
  ctx.fillRect(10, 10, 200, 170);
  ctx.fillStyle = rgbCss(rc);
  ctx.fillRect(210, 10, 200, 170);
  ctx.strokeStyle = '#999';
  ctx.strokeRect(10.5, 10.5, 399, 169);
  text(ctx, `试验光 ${wl()}nm`, 110, 198, 'center', '#333', '12px sans-serif');
  text(ctx, '三个原色的混合', 310, 198, 'center', '#333', '12px sans-serif');
  text(ctx, '（屏幕只能近似显示单色光，色域外的颜色已去饱和）', 10, 218, 'left', '#999', '11px sans-serif');
};

// ---------- rg 色度图 ----------

const RG_W = 520;
const RG_H = 470;
const RG_X: [number, number] = [-1.6, 1.3];
const RG_Y: [number, number] = [-0.3, 2.1];
const RG_PAD = 36;

const rgPoint = (r: number, g: number): [number, number] => [
  RG_PAD + (r - RG_X[0]) / (RG_X[1] - RG_X[0]) * (RG_W - 2 * RG_PAD),
  RG_H - RG_PAD - (g - RG_Y[0]) / (RG_Y[1] - RG_Y[0]) * (RG_H - 2 * RG_PAD)
];

const locusRg = (l: number): [number, number] => {
  const [r, g, b] = cieRgbCmf(l);
  const sum = r + g + b;
  return [r / sum, g / sum];
};

const drawRgChart = (wl: () => number): DrawFn => ctx => {
  ctx.strokeStyle = '#E5E5E5';
  ctx.lineWidth = 1;
  for (let v = -1.5; v <= 1.01; v += 0.5) {
    const [x] = rgPoint(v, 0);
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, RG_PAD);
    ctx.lineTo(Math.round(x) + 0.5, RG_H - RG_PAD);
    ctx.stroke();
    text(ctx, v.toFixed(1), x, RG_H - RG_PAD + 12, 'center', '#777', '10px sans-serif');
  }
  for (let v = 0; v <= 2.01; v += 0.5) {
    const [, y] = rgPoint(0, v);
    ctx.beginPath();
    ctx.moveTo(RG_PAD, Math.round(y) + 0.5);
    ctx.lineTo(RG_W - RG_PAD, Math.round(y) + 0.5);
    ctx.stroke();
    text(ctx, v.toFixed(1), RG_PAD - 6, y, 'right', '#777', '10px sans-serif');
  }
  text(ctx, 'r = R/(R+G+B)', RG_W - RG_PAD, RG_H - 8, 'right', '#555', '11px sans-serif');
  text(ctx, 'g', 12, RG_PAD - 14, 'left', '#555', '11px sans-serif');

  const tri = [rgPoint(1, 0), rgPoint(0, 1), rgPoint(0, 0)];
  ctx.beginPath();
  tri.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = 'rgba(25, 113, 194, 0.10)';
  ctx.fill();
  ctx.strokeStyle = '#1971C2';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const names = ['R', 'G', 'B'];
  tri.forEach(([x, y], i) => {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = PRIMARY_COLORS[i];
    ctx.fill();
    text(ctx, names[i], x + (i === 0 ? 12 : -12), y + (i === 1 ? -10 : 0), 'center', PRIMARY_COLORS[i], 'bold 13px sans-serif');
  });

  ctx.beginPath();
  for (let l = 380; l <= 700; l += 2) {
    const [x, y] = rgPoint(...locusRg(l));
    if (l === 380) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.stroke();
  [450, 480, 500, 520, 550, 600, 650].forEach(l => {
    const [x, y] = rgPoint(...locusRg(l));
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#222';
    ctx.fill();
    text(ctx, `${l}`, x - 12, y - 6, 'right', '#333', '10px sans-serif');
  });

  const [ex, ey] = rgPoint(1 / 3, 1 / 3);
  ctx.beginPath();
  ctx.arc(ex, ey, 4, 0, 2 * Math.PI);
  ctx.fillStyle = '#FFF';
  ctx.fill();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, 'E 等能白', ex + 8, ey + 12, 'left', '#555', '11px sans-serif');

  const [cx, cy] = rgPoint(...locusRg(wl()));
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
  ctx.strokeStyle = '#C92A2A';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, '光谱轨迹在三角形之外：r < 0 的部分需要负的红', RG_PAD + 6, RG_PAD + 8, 'left', '#C92A2A', '12px sans-serif');
};

export {
  PRIMARY_COLORS,
  CMF_W,
  CMF_H,
  FIELD_W,
  FIELD_H,
  RG_W,
  RG_H,
  bestMatch,
  needsNegative,
  xToWavelength,
  drawCmfPlot,
  drawFields,
  drawRgChart
};
