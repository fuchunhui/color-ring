import {DrawFn, Area, D65, WAVELENGTHS, spectrumXyz, xyzToSrgb, rgbCss, rgbHex, text, drawSpectrumBand, drawAxis, drawCurve} from '../utils/spectral';
import {Vec3} from '../utils/space';
import {retarderTransmission} from '../utils/optics';

const RAD = Math.PI / 180;
const TABLE_STEP = 4;
const TABLE_MAX = 3200;

const WHITE: Vec3 = spectrumXyz(D65);

const gXyzDirect = (retard: number): Vec3 => {
  return spectrumXyz(D65, WAVELENGTHS.map(l => Math.sin(Math.PI * retard / l) ** 2));
};

let gTable: Vec3[] | null = null;

/** 起偏方向与光轴夹 45°、两偏振片正交时，延迟量 retard（nm）对应的 XYZ（对 D65 背光白归一化） */
const gXyz = (retard: number): Vec3 => {
  if (!gTable) {
    gTable = [];
    for (let r = 0; r <= TABLE_MAX; r += TABLE_STEP) {
      gTable.push(gXyzDirect(r));
    }
  }
  if (retard > TABLE_MAX) {
    return gXyzDirect(retard);
  }
  return gTable[Math.round(retard / TABLE_STEP)];
};

/** f = sin²(2θ)；正交偏振片下 XYZ = f·g，平行偏振片下 XYZ = 白 − f·g */
const retardColor = (retard: number, f: number, crossed: boolean): Vec3 => {
  const g = gXyz(retard);
  const xyz = crossed ? g.map(v => v * f) : WHITE.map((v, i) => v - g[i] * f);
  return xyzToSrgb(xyz as Vec3);
};

interface RetarderState {
  dn: number;
  thickness: number;
  theta: number;
}

const retardOf = (s: RetarderState): number => s.dn * s.thickness * 1000;

const SPEC_W = 760;
const SPEC_H = 260;

const drawTransmission = (get: () => RetarderState): DrawFn => (ctx, w, h) => {
  const state = get();
  const retard = retardOf(state);
  const f = Math.sin(2 * state.theta * RAD) ** 2;
  const area: Area = {x: 52, y: 22, w: 520, h: 180};
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  drawSpectrumBand(ctx, area, 0.25);
  ctx.strokeStyle = '#DDD';
  ctx.lineWidth = 1;
  [0, 0.5, 1].forEach(t => {
    const y = Math.round(area.y + area.h * (1 - t)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(area.x, y);
    ctx.lineTo(area.x + area.w, y);
    ctx.stroke();
    text(ctx, `${t * 100}%`, area.x - 6, y, 'right', '#555', '11px sans-serif');
  });
  const crossed = WAVELENGTHS.map(l => retarderTransmission(retard, state.theta * RAD, l, true));
  const parallel = WAVELENGTHS.map(l => retarderTransmission(retard, state.theta * RAD, l, false));
  drawCurve(ctx, area, parallel, '#1971C2', 2.4);
  drawCurve(ctx, area, crossed, '#C92A2A', 2.4);
  drawAxis(ctx, area);
  text(ctx, `延迟量 ${retard.toFixed(0)} nm，光轴夹角 ${state.theta}°`, area.x, 10, 'left', '#333', '12px sans-serif');
  text(ctx, '红线：正交偏振片', area.x + 340, 10, 'left', '#C92A2A', '12px sans-serif');
  text(ctx, '蓝线：平行偏振片', area.x + 450, 10, 'left', '#1971C2', '12px sans-serif');

  const swatch = (label: string, rgb: Vec3, y: number) => {
    ctx.fillStyle = rgbCss(rgb);
    ctx.fillRect(area.x + area.w + 36, y, 72, 72);
    ctx.strokeStyle = '#CCC';
    ctx.strokeRect(area.x + area.w + 36.5, y + 0.5, 71, 71);
    text(ctx, `${label} ${rgbHex(rgb)}`, area.x + area.w + 72, y + 84, 'center', '#333', '11px sans-serif');
  };
  swatch('正交', retardColor(retard, f, true), area.y);
  swatch('平行', retardColor(retard, f, false), area.y + 104);
};

const STRIP_W = 800;
const STRIP_H = 120;
const STRIP_MAX = 3000;

const drawRetardStrip = (): DrawFn => (ctx, w, h) => {
  const left = 20;
  const width = w - 40;
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  for (let px = 0; px < width; px++) {
    ctx.fillStyle = rgbCss(retardColor(px / width * STRIP_MAX, 1, true));
    ctx.fillRect(left + px, 26, 1, 48);
  }
  ctx.strokeStyle = '#999';
  ctx.strokeRect(left + 0.5, 26.5, width, 48);
  for (let r = 0; r <= STRIP_MAX; r += 500) {
    const x = left + r / STRIP_MAX * width;
    ctx.fillStyle = '#888';
    ctx.fillRect(x, 74, 1, 5);
    text(ctx, `${r}`, x, 90, 'center', '#555', '11px sans-serif');
  }
  text(ctx, '延迟量 nm（正交，光轴成 45°）', left, 108, 'left', '#555', '11px sans-serif');
  const red = left + 551 / STRIP_MAX * width;
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.moveTo(red, 22);
  ctx.lineTo(red - 5, 14);
  ctx.lineTo(red + 5, 14);
  ctx.fill();
  text(ctx, '一级红（≈ 551 nm，“灵敏色”）', red + 10, 12, 'left', '#333', '11px sans-serif');
  text(ctx, '继续增大后颜色越来越淡，最后接近白色', left + width, 108, 'right', '#777', '11px sans-serif');
};

interface FanState {
  layers: number;
  perLayer: number;
}

const FAN_SIZE = 320;

const drawFan = (get: () => FanState, crossed: boolean): DrawFn => (ctx, w, h) => {
  const {layers, perLayer} = get();
  const retard = layers * perLayer;
  const out = ctx.createImageData(w, h);
  const radius = w / 2 - 22;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - w / 2;
      const dy = h / 2 - (y + 0.5);
      const i = (y * w + x) * 4;
      if (dx * dx + dy * dy > radius * radius) {
        out.data[i + 3] = 0;
        continue;
      }
      const f = Math.sin(2 * Math.atan2(dy, dx)) ** 2;
      const rgb = retardColor(retard, f, crossed);
      out.data[i] = rgb[0];
      out.data[i + 1] = rgb[1];
      out.data[i + 2] = rgb[2];
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, radius, 0, 2 * Math.PI);
  ctx.stroke();
  text(ctx, `${layers} 层，延迟量 ${retard} nm`, w / 2, h - 8, 'center', '#333', '11px sans-serif');
};

const LAYER_W = 640;
const LAYER_H = 120;

const drawLayerStrip = (get: () => FanState): DrawFn => (ctx, w, h) => {
  const {perLayer} = get();
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  for (let n = 1; n <= 6; n++) {
    const x = 70 + (n - 1) * 92;
    ctx.fillStyle = rgbCss(retardColor(n * perLayer, 1, true));
    ctx.fillRect(x, 8, 82, 38);
    ctx.fillStyle = rgbCss(retardColor(n * perLayer, 1, false));
    ctx.fillRect(x, 50, 82, 38);
    text(ctx, `${n} 层 · ${n * perLayer} nm`, x + 41, 104, 'center', '#333', '11px sans-serif');
  }
  text(ctx, '正交', 6, 27, 'left', '#333', '11px sans-serif');
  text(ctx, '平行', 6, 69, 'left', '#333', '11px sans-serif');
};

interface RulerState {
  load: number;
  crossed: boolean;
}

const RULER_W = 660;
const RULER_H = 210;

const drawRuler = (get: () => RulerState): DrawFn => (ctx, w, h) => {
  const {load, crossed} = get();
  const out = ctx.createImageData(w, h);
  const left = 60;
  const right = w - 60;
  const top = 70;
  const bottom = 150;
  const length = right - left;
  const half = (bottom - top) / 2;
  const rMax = load / 100 * 2200;
  const back = crossed ? [5, 7, 10] : [250, 250, 250];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      out.data[i + 3] = 255;
      if (x < left || x > right || y < top || y > bottom) {
        out.data[i] = back[0];
        out.data[i + 1] = back[1];
        out.data[i + 2] = back[2];
        continue;
      }
      const u = (x - left) / length;
      const yn = (y - (top + bottom) / 2) / half;
      const bending = (1 - Math.abs(2 * u - 1)) * Math.abs(yn);
      const contact = 0.3 * Math.exp(-(((u - 0.5) / 0.035) ** 2)) * Math.exp(-(((yn + 1) / 0.3) ** 2));
      const rgb = retardColor(rMax * (bending + contact), 1, crossed);
      out.data[i] = rgb[0];
      out.data[i + 1] = rgb[1];
      out.data[i + 2] = rgb[2];
    }
  }
  ctx.putImageData(out, 0, 0);
  const ink = crossed ? '#C7D0DA' : '#333';
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 2;
  const mid = (left + right) / 2;
  ctx.beginPath();
  ctx.moveTo(mid, 12);
  ctx.lineTo(mid, top - 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(mid, top - 2);
  ctx.lineTo(mid - 6, top - 12);
  ctx.lineTo(mid + 6, top - 12);
  ctx.fill();
  text(ctx, '载荷', mid + 12, 20, 'left', ink, '12px sans-serif');
  [left + 24, right - 24].forEach(x => {
    ctx.beginPath();
    ctx.moveTo(x, bottom + 2);
    ctx.lineTo(x - 8, bottom + 16);
    ctx.lineTo(x + 8, bottom + 16);
    ctx.closePath();
    ctx.fill();
  });
  text(ctx, '支点', left + 24, bottom + 30, 'center', ink, '12px sans-serif');
  text(ctx, '支点', right - 24, bottom + 30, 'center', ink, '12px sans-serif');
  text(ctx, '中性层（受力为 0）处是黑线；离中性层越远，应力越大，条纹越密', mid, h - 8, 'center', ink, '11px sans-serif');
};

export {
  RetarderState,
  FanState,
  RulerState,
  SPEC_W,
  SPEC_H,
  STRIP_W,
  STRIP_H,
  FAN_SIZE,
  LAYER_W,
  LAYER_H,
  RULER_W,
  RULER_H,
  retardOf,
  drawTransmission,
  drawRetardStrip,
  drawFan,
  drawLayerStrip,
  drawRuler
};
