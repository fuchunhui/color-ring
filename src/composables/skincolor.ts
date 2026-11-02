import type {Vec3} from '../utils/space';
import {WAVELENGTHS, rgbCss, rgbHex, text, drawSpectrumBand, drawAxis, drawCurve, wlX} from '../utils/spectral';
import type {DrawFn, Area, Spectrum} from '../utils/spectral';
import {
  MELANIN_STEPS,
  BLOOD_STEPS,
  LIGHTS,
  OXI_RED,
  OXI_IR,
  hbEpsilon,
  skinParts,
  skinReflectance,
  renderD65,
  renderUnder,
  lumaY,
  cbcr,
  skinGrid,
  colorDifference,
  oximeterRatio
} from '../utils/skincolor';
import type {SkinParams} from '../utils/skincolor';

// ---------- 光谱 ----------

const SPEC_W = 700;
const SPEC_H = 290;

const dashed = (ctx: CanvasRenderingContext2D, on: boolean): void => {
  ctx.setLineDash(on ? [5, 4] : []);
};

const drawSpectrum = (params: () => SkinParams): DrawFn => (ctx, w, h) => {
  const p = params();
  const parts = skinParts(p);
  const refl = skinReflectance(p);
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);

  const area: Area = {x: 48, y: 34, w: 480, h: 190};
  drawSpectrumBand(ctx, area, 0.22);
  text(ctx, '漫反射率 R(λ)', area.x, 10, 'left', '#555', '11px sans-serif');

  [[415, '415'], [542, '542'], [577, '577']].forEach(([l, label]) => {
    const x = wlX(area, l as number);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(x + 0.5, area.y);
    ctx.lineTo(x + 0.5, area.y + area.h);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, label as string, x, area.y - 8, 'center', '#888', '10px sans-serif');
  });

  dashed(ctx, true);
  drawCurve(ctx, area, parts.epidermis, '#7A7A7A', 1.6);
  drawCurve(ctx, area, parts.dermis, '#C0392B', 1.6);
  dashed(ctx, false);
  drawCurve(ctx, area, refl, '#6B3A22', 2.8);
  drawAxis(ctx, area);
  [0, 0.5, 1].forEach(t => {
    text(ctx, `${t}`, area.x - 8, area.y + area.h * (1 - t), 'right', '#555', '11px sans-serif');
  });

  const legend: [string, string, boolean][] = [
    ['#6B3A22', '皮肤整体', false],
    ['#C0392B', '只有真皮（无黑色素）', true],
    ['#7A7A7A', '表皮双程透过率 T²', true]
  ];
  legend.forEach(([color, label, dash], i) => {
    const x = area.x + i * 150;
    const y = 254;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    dashed(ctx, dash);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20, y);
    ctx.stroke();
    dashed(ctx, false);
    text(ctx, label, x + 26, y, 'left', '#333', '11px sans-serif');
  });
  text(ctx, '虚线竖线：血红蛋白吸收带（nm）。表面反射 4% 已计入整体曲线', area.x, 276, 'left', '#888', '11px sans-serif');

  const rgb = renderD65(refl);
  const sx = 556;
  ctx.fillStyle = rgbCss(rgb);
  ctx.fillRect(sx, 34, 120, 84);
  ctx.strokeStyle = '#CCC';
  ctx.lineWidth = 1;
  ctx.strokeRect(sx + 0.5, 34.5, 119, 83);
  text(ctx, 'D65 下', sx + 60, 134, 'center', '#555', '11px sans-serif');
  text(ctx, rgbHex(rgb), sx + 60, 152, 'center', '#333', '13px monospace');
  text(ctx, `rgb(${rgb.join(', ')})`, sx + 60, 170, 'center', '#555', '11px monospace');
  text(ctx, `亮度 Y = ${lumaY(refl).toFixed(3)}`, sx + 60, 190, 'center', '#555', '11px sans-serif');
  const at = (l: number) => refl[WAVELENGTHS.indexOf(l)];
  text(ctx, `R(450) ${at(450).toFixed(2)}`, sx + 60, 214, 'center', '#555', '11px sans-serif');
  text(ctx, `R(550) ${at(550).toFixed(2)}`, sx + 60, 230, 'center', '#555', '11px sans-serif');
  text(ctx, `R(650) ${at(650).toFixed(2)}`, sx + 60, 246, 'center', '#555', '11px sans-serif');
};

// ---------- 黑色素 × 血容量 网格 ----------

const CELL_W = 60;
const CELL_H = 38;
const GRID_LEFT = 56;
const GRID_TOP = 24;
const GRID_W = GRID_LEFT + MELANIN_STEPS.length * CELL_W + 10;
const GRID_H = GRID_TOP + BLOOD_STEPS.length * CELL_H + 44;

const drawGrid = (sat: () => number): DrawFn => (ctx, w, h) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const cells = skinGrid(sat());
  const rows = BLOOD_STEPS.length;
  cells.forEach(cell => {
    const col = MELANIN_STEPS.indexOf(cell.melanin);
    const row = rows - 1 - BLOOD_STEPS.indexOf(cell.blood);
    ctx.fillStyle = rgbCss(cell.rgb);
    ctx.fillRect(GRID_LEFT + col * CELL_W, GRID_TOP + row * CELL_H, CELL_W - 2, CELL_H - 2);
  });
  text(ctx, '血容量', 4, 10, 'left', '#555', '11px sans-serif');
  BLOOD_STEPS.forEach((b, i) => {
    const row = rows - 1 - i;
    text(ctx, `${b}%`, GRID_LEFT - 8, GRID_TOP + row * CELL_H + CELL_H / 2 - 1, 'right', '#555', '11px sans-serif');
  });
  MELANIN_STEPS.forEach((m, i) => {
    text(ctx, `${m}%`, GRID_LEFT + i * CELL_W + CELL_W / 2 - 1, GRID_TOP + rows * CELL_H + 12, 'center', '#555', '11px sans-serif');
  });
  text(ctx, '表皮黑色素体体积分数 →', GRID_LEFT + (MELANIN_STEPS.length * CELL_W) / 2, GRID_TOP + rows * CELL_H + 30, 'center', '#333', '12px sans-serif');
};

// ---------- 矢量示波器（Cb–Cr 平面） ----------

const SCOPE_W = 330;
const SCOPE_H = 330;
const SCOPE_R = 0.2;
const SCOPE_PX = 140;
const SKIN_LINE = 123;

const drawScope = (sat: () => number, params: () => SkinParams): DrawFn => (ctx, w, h) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const toX = (cb: number) => cx + (cb / SCOPE_R) * SCOPE_PX;
  const toY = (cr: number) => cy - (cr / SCOPE_R) * SCOPE_PX;

  ctx.strokeStyle = '#E2E4EA';
  ctx.lineWidth = 1;
  [0.05, 0.1, 0.15, 0.2].forEach(r => {
    ctx.beginPath();
    ctx.arc(cx, cy, (r / SCOPE_R) * SCOPE_PX, 0, 2 * Math.PI);
    ctx.stroke();
    text(ctx, `${r}`, cx + (r / SCOPE_R) * SCOPE_PX - 2, cy + 10, 'right', '#999', '10px sans-serif');
  });
  ctx.beginPath();
  ctx.moveTo(cx - SCOPE_PX - 10, cy);
  ctx.lineTo(cx + SCOPE_PX + 10, cy);
  ctx.moveTo(cx, cy - SCOPE_PX - 10);
  ctx.lineTo(cx, cy + SCOPE_PX + 10);
  ctx.stroke();
  text(ctx, '+Cb', cx + SCOPE_PX + 6, cy - 10, 'right', '#888', '11px sans-serif');
  text(ctx, '+Cr', cx + 18, cy - SCOPE_PX - 6, 'left', '#888', '11px sans-serif');

  const rad = SKIN_LINE * Math.PI / 180;
  const ex = cx + Math.cos(rad) * SCOPE_PX;
  const ey = cy - Math.sin(rad) * SCOPE_PX;
  ctx.strokeStyle = '#E8820C';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, `${SKIN_LINE}° 肤色线`, ex + 4, ey - 6, 'left', '#E8820C', '11px sans-serif');

  skinGrid(sat()).forEach(cell => {
    ctx.fillStyle = rgbCss(cell.rgb);
    ctx.beginPath();
    ctx.arc(toX(cell.point.cb), toY(cell.point.cr), 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });

  const now = cbcr(renderD65(skinReflectance(params())));
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(toX(now.cb), toY(now.cr), 9, 0, 2 * Math.PI);
  ctx.stroke();
  text(ctx, '圆圈：上方滑块的当前值', 8, h - 10, 'left', '#555', '11px sans-serif');
};

// ---------- 不同光源下的同一块皮肤 ----------

const PRESET_MELANIN = [4, 14, 30];

const LIGHT_LABEL_W = 150;
const LIGHT_COL_W = 130;
const LIGHT_ROW_H = 62;
const LIGHT_TOP = 30;
const LIGHT_W = LIGHT_LABEL_W + PRESET_MELANIN.length * LIGHT_COL_W + 10;
const LIGHT_H = LIGHT_TOP + LIGHTS.length * LIGHT_ROW_H + 8;

const drawLights = (params: () => SkinParams, adapt: () => boolean): DrawFn => (ctx, w, h) => {
  const p = params();
  const useAdapt = adapt();
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  PRESET_MELANIN.forEach((m, c) => {
    text(ctx, `黑色素 ${m}%`, LIGHT_LABEL_W + c * LIGHT_COL_W + 52, 14, 'center', '#555', '11px sans-serif');
  });
  const refls: Spectrum[] = PRESET_MELANIN.map(m => skinReflectance({...p, melanin: m / 100}));
  LIGHTS.forEach((light, r) => {
    const y = LIGHT_TOP + r * LIGHT_ROW_H;
    text(ctx, light.name, 6, y + 14, 'left', '#333', '13px sans-serif');
    text(ctx, light.note, 6, y + 32, 'left', '#888', '10px sans-serif');
    refls.forEach((refl, c) => {
      const x = LIGHT_LABEL_W + c * LIGHT_COL_W;
      ctx.fillStyle = rgbCss(renderUnder(refl, light.spd, useAdapt));
      ctx.fillRect(x, y, 104, 40);
      ctx.strokeStyle = '#CCC';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, 103, 39);
      if (r === 0) {
        text(ctx, '参照', x + 52, y + 52, 'center', '#999', '11px sans-serif');
      } else {
        const de = colorDifference(refl, light.spd, useAdapt);
        text(ctx, `ΔE2000 ${de.toFixed(1)}`, x + 52, y + 52, 'center', de >= 3 ? '#D9480F' : '#2B8A3E', '11px sans-serif');
      }
    });
  });
};

const SPD_W = 560;
const SPD_H = 210;
const LIGHT_COLORS = ['#555', '#E8820C', '#2E4BD6', '#C0392B'];

const drawLightSpd: DrawFn = (ctx, w, h) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const area: Area = {x: 48, y: 22, w: 480, h: 130};
  drawSpectrumBand(ctx, area, 0.22);
  text(ctx, '光源的相对光谱（各自除以最大值）', area.x, 8, 'left', '#555', '11px sans-serif');
  LIGHTS.forEach((light, i) => {
    const max = Math.max(...light.spd) || 1;
    drawCurve(ctx, area, light.spd.map(v => v / max), LIGHT_COLORS[i], 2);
  });
  drawAxis(ctx, area);
  LIGHTS.forEach((light, i) => {
    const x = area.x + i * 118;
    ctx.fillStyle = LIGHT_COLORS[i];
    ctx.fillRect(x, 184, 16, 3);
    text(ctx, light.name, x + 20, 186, 'left', '#333', '11px sans-serif');
  });
};

// ---------- 脉搏血氧仪 ----------

const OXI_W = 700;
const OXI_H = 290;

const drawOximeter = (sat: () => number): DrawFn => (ctx, w, h) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);

  const a: Area = {x: 56, y: 30, w: 300, h: 190};
  const lo = 2.2;
  const hi = 4.3;
  const lmin = 600;
  const lmax = 1000;
  const px = (l: number) => a.x + (l - lmin) / (lmax - lmin) * a.w;
  const py = (e: number) => a.y + a.h * (1 - (Math.log10(e) - lo) / (hi - lo));

  text(ctx, '摩尔消光系数 ε（对数坐标）', a.x, 12, 'left', '#555', '11px sans-serif');
  ctx.strokeStyle = '#E2E4EA';
  ctx.lineWidth = 1;
  [2.5, 3, 3.5, 4].forEach(e => {
    const y = py(10 ** e);
    ctx.beginPath();
    ctx.moveTo(a.x, y);
    ctx.lineTo(a.x + a.w, y);
    ctx.stroke();
    text(ctx, `${Math.round(10 ** e)}`, a.x - 6, y, 'right', '#555', '10px sans-serif');
  });
  [600, 700, 800, 900, 1000].forEach(l => {
    text(ctx, `${l}`, px(l), a.y + a.h + 14, 'center', '#555', '11px sans-serif');
  });
  text(ctx, 'nm', a.x + a.w + 4, a.y + a.h + 14, 'left', '#555', '11px sans-serif');

  const series: [string, 'hbo2' | 'hb', string][] = [['#C0392B', 'hbo2', '氧合 HbO₂'], ['#2E4BD6', 'hb', '还原 Hb']];
  series.forEach(([color, key]) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let l = lmin; l <= lmax; l += 5) {
      const x = px(l);
      const y = py(hbEpsilon(l)[key]);
      if (started) {
        ctx.lineTo(x, y);
      } else {
        ctx.moveTo(x, y);
        started = true;
      }
    }
    ctx.stroke();
  });
  series.forEach(([color, , label], i) => {
    ctx.fillStyle = color;
    ctx.fillRect(a.x + 8 + i * 110, a.y + 8, 16, 3);
    text(ctx, label, a.x + 30 + i * 110, a.y + 9, 'left', '#333', '11px sans-serif');
  });
  [OXI_RED, OXI_IR].forEach(l => {
    const e = hbEpsilon(l);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(px(l) + 0.5, a.y);
    ctx.lineTo(px(l) + 0.5, a.y + a.h);
    ctx.stroke();
    ctx.setLineDash([]);
    [[e.hbo2, '#C0392B'], [e.hb, '#2E4BD6']].forEach(([v, color]) => {
      ctx.fillStyle = color as string;
      ctx.beginPath();
      ctx.arc(px(l), py(v as number), 4, 0, 2 * Math.PI);
      ctx.fill();
    });
    text(ctx, `${l} nm`, px(l), a.y + a.h + 30, 'center', '#333', '11px sans-serif');
  });

  const b: Area = {x: 440, y: 30, w: 220, h: 190};
  const rMax = 5;
  const bx = (s: number) => b.x + s * b.w;
  const by = (r: number) => b.y + b.h * (1 - r / rMax);
  text(ctx, `吸光度比 A(${OXI_RED}) / A(${OXI_IR})`, b.x, 12, 'left', '#555', '11px sans-serif');
  ctx.strokeStyle = '#E2E4EA';
  ctx.lineWidth = 1;
  [0, 1, 2, 3, 4, 5].forEach(r => {
    ctx.beginPath();
    ctx.moveTo(b.x, by(r));
    ctx.lineTo(b.x + b.w, by(r));
    ctx.stroke();
    text(ctx, `${r}`, b.x - 6, by(r), 'right', '#555', '10px sans-serif');
  });
  [0, 0.25, 0.5, 0.75, 1].forEach(s => {
    text(ctx, `${Math.round(s * 100)}%`, bx(s), b.y + b.h + 14, 'center', '#555', '10px sans-serif');
  });
  text(ctx, '血氧饱和度 →', b.x + b.w / 2, b.y + b.h + 30, 'center', '#333', '11px sans-serif');
  ctx.strokeStyle = '#6B3A22';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 50; i++) {
    const s = i / 50;
    const x = bx(s);
    const y = by(oximeterRatio(s));
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  const s = sat();
  const ratio = oximeterRatio(s);
  ctx.fillStyle = '#E8820C';
  ctx.beginPath();
  ctx.arc(bx(s), by(ratio), 5, 0, 2 * Math.PI);
  ctx.fill();
  text(ctx, `${Math.round(s * 100)}% → ${ratio.toFixed(2)}`, Math.min(bx(s) + 8, b.x + b.w - 70), Math.max(by(ratio) - 12, b.y + 8), 'left', '#E8820C', '12px sans-serif');
};

const MELANIN_PRESETS = [1.5, 4, 8, 14, 24, 38];

const swatchOf = (melanin: number, blood: number, sat: number): Vec3 => {
  return renderD65(skinReflectance({melanin: melanin / 100, blood: blood / 100, sat}));
};

export {
  SPEC_W,
  SPEC_H,
  GRID_W,
  GRID_H,
  SCOPE_W,
  SCOPE_H,
  SKIN_LINE,
  LIGHT_W,
  LIGHT_H,
  SPD_W,
  SPD_H,
  OXI_W,
  OXI_H,
  OXI_RED,
  OXI_IR,
  MELANIN_PRESETS,
  PRESET_MELANIN,
  drawSpectrum,
  drawGrid,
  drawScope,
  drawLights,
  drawLightSpd,
  drawOximeter,
  swatchOf
};
