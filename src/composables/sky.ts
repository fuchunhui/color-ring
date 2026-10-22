import {Vec3, xyzToLinear, linearToSrgb} from '../utils/space';
import {
  DrawFn,
  Area,
  Spectrum,
  WAVELENGTHS,
  spectrumXyz,
  xyzToSrgb,
  rgbCss,
  rgbHex,
  text,
  drawSpectrumBand,
  drawAxis,
  drawCurve,
  normalize
} from '../utils/spectral';
import {cmf} from '../utils/cie';
import {SUN, airMass, luminance, sunBeam, skyRadiance} from '../utils/physics';

const YBAR = WAVELENGTHS.map(l => cmf(l)[1]);
const RAYLEIGH = WAVELENGTHS.map(l => (550 / l) ** 4);

/** 光谱的颜色，亮度固定为 Y，方便比较色相 */
const hueColor = (spd: Spectrum, y = 0.5): Vec3 => {
  return xyzToSrgb(spectrumXyz(spd).map(v => v * y) as Vec3);
};

const DAY_REF = luminance(skyRadiance(60, 90, true));

const SPECTRA_W = 720;
const SPECTRA_H = 292;

interface SpectraOptions {
  eye: boolean;
  ozone: boolean;
}

const drawSkySpectra = (get: () => SpectraOptions): DrawFn => (ctx, w, h) => {
  const {eye, ozone} = get();
  const area: Area = {x: 40, y: 22, w: 520, h: 190};
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  drawSpectrumBand(ctx, area, 0.3);

  const sky = skyRadiance(60, 90, ozone);
  const curves: {label: string; color: string; values: Spectrum}[] = [
    {label: '太阳光谱（5778K 黑体）', color: '#E8710A', values: normalize(SUN)},
    {label: '瑞利散射权重 λ⁻⁴', color: '#7B2CBF', values: normalize(RAYLEIGH)},
    {label: '天空（天顶，太阳高 60°）', color: '#1A73E8', values: normalize(sky)}
  ];
  if (eye) {
    curves.push({label: '天空 × 人眼亮度响应 ȳ', color: '#188038', values: normalize(sky.map((v, i) => v * YBAR[i]))});
  }
  curves.forEach(({color, values}) => drawCurve(ctx, area, values, color, 2.4));
  drawAxis(ctx, area);
  text(ctx, '相对强度（各曲线分别归一化）', area.x, 10, 'left', '#555', '11px sans-serif');

  curves.forEach(({label, color}, i) => {
    const x = area.x + (i % 2) * 270;
    const y = area.y + area.h + 40 + Math.floor(i / 2) * 18;
    ctx.fillStyle = color;
    ctx.fillRect(x, y - 2, 18, 3);
    text(ctx, label, x + 24, y, 'left', '#333', '12px sans-serif');
  });

  const swatches: [string, Vec3][] = [
    ['太阳光', hueColor(SUN)],
    ['天空', hueColor(sky)]
  ];
  swatches.forEach(([label, rgb], i) => {
    const x = area.x + area.w + 30;
    const y = area.y + i * 92;
    ctx.fillStyle = rgbCss(rgb);
    ctx.fillRect(x, y, 70, 60);
    ctx.strokeStyle = '#CCC';
    ctx.strokeRect(x + 0.5, y + 0.5, 69, 59);
    text(ctx, label, x + 35, y + 72, 'center', '#333', '12px sans-serif');
    text(ctx, rgbHex(rgb), x + 35, y + 86, 'center', '#555', '11px monospace');
  });
};

const SCENE_W = 700;
const SCENE_H = 340;
const HORIZON = Math.round(SCENE_H * 0.78);
const ELEV_POW = 0.55;
const AZ_SPAN = 140;
const DEG = Math.PI / 180;

const rowElevation = (y: number): number => 90 * Math.max(0, 1 - y / HORIZON) ** (1 / ELEV_POW);
const elevationRow = (e: number): number => HORIZON * (1 - (e / 90) ** ELEV_POW);

const toLinear = (spd: Spectrum, scale: number): Vec3 => {
  const xyz = spectrumXyz(spd).map(v => v * luminance(spd) / DAY_REF * scale) as Vec3;
  return xyzToLinear(xyz);
};

const encode = (c: number): number => Math.round(Math.min(1, Math.max(0, linearToSrgb(Math.max(0, c)))) * 255);

/** 太阳高度 h（度）下的天空：横向是方位角偏移，纵向是高度角 */
const drawSkyScene = (getHeight: () => number, getOzone: () => boolean): DrawFn => (ctx, w, h) => {
  const sunH = getHeight();
  const ozone = getOzone();
  const rows: Vec3[] = [];
  let mean = 0;
  for (let y = 0; y < HORIZON; y++) {
    const spd = skyRadiance(sunH, Math.max(0.3, rowElevation(y)), ozone);
    const lin = toLinear(spd, 1);
    rows.push(lin);
    mean += luminance(spd) / DAY_REF / HORIZON;
  }
  const dusk = sunH < 0 ? Math.exp(sunH / 3) : 1;
  const expo = 0.62 / Math.max(1e-4, mean) ** 0.85 * dusk;
  const beam = sunBeam(sunH, ozone);
  const beamLin = sunH >= 0 ? xyzToLinear(spectrumXyz(beam).map(v => v * 1.2) as Vec3) : ([0, 0, 0] as Vec3);

  const img = ctx.createImageData(w, h);
  const ground = (x: number): number => {
    return HORIZON + 5 - 7 * Math.sin(x / 41 + 0.7) - 4 * Math.sin(x / 15 + 2) - 5 * Math.sin(x / 97);
  };
  for (let y = 0; y < h; y++) {
    const e = rowElevation(y);
    const row = rows[Math.min(y, HORIZON - 1)];
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      let r = 12;
      let g = 15;
      let b = 20;
      if (y < ground(x)) {
        const daz = (x / w - 0.5) * AZ_SPAN * DEG;
        const cosT = Math.sin(e * DEG) * Math.sin(sunH * DEG) + Math.cos(e * DEG) * Math.cos(sunH * DEG) * Math.cos(daz);
        const phase = 0.75 + 0.25 * (1 + cosT * cosT);
        const theta = Math.acos(Math.min(1, Math.max(-1, cosT))) / DEG;
        const glow = sunH >= 0 ? 0.55 * Math.exp(-((theta / 7) ** 2)) + 0.22 * Math.exp(-((theta / 24) ** 2)) : 0;
        const lin = row.map((c, i) => c * phase * expo + beamLin[i] * glow * 0.6);
        r = encode(1 - Math.exp(-lin[0] * 1.6));
        g = encode(1 - Math.exp(-lin[1] * 1.6));
        b = encode(1 - Math.exp(-lin[2] * 1.6));
      }
      img.data[k] = r;
      img.data[k + 1] = g;
      img.data[k + 2] = b;
      img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  if (sunH >= 0) {
    const sy = elevationRow(sunH);
    const sx = w / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, HORIZON + 12);
    ctx.clip();
    const sunRgb = xyzToSrgb(spectrumXyz(beam).map(v => v * 0.95) as Vec3);
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 22);
    grad.addColorStop(0, rgbCss(sunRgb));
    grad.addColorStop(0.45, rgbCss(sunRgb));
    grad.addColorStop(1, `rgba(${sunRgb[0]}, ${sunRgb[1]}, ${sunRgb[2]}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, 22, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
    // 再把山丘挡在太阳前面
    for (let x = 0; x < w; x++) {
      const gy = ground(x);
      ctx.fillStyle = 'rgb(12, 15, 20)';
      ctx.fillRect(x, Math.max(0, gy), 1, h - gy);
    }
  }
  text(ctx, `太阳高度 ${sunH}°`, 10, 14, 'left', 'rgba(255,255,255,0.85)', '12px sans-serif');
};

interface SunRow {
  h: number;
  mass: string;
  hex: string;
  relative: string;
}

const SUN_ROWS = [90, 30, 10, 3, 0];

const sunTable = (ozone: boolean): SunRow[] => {
  const ref = luminance(sunBeam(90, ozone));
  return SUN_ROWS.map(h => {
    const beam = sunBeam(h, ozone);
    return {
      h,
      mass: airMass(h).toFixed(1),
      hex: rgbHex(hueColor(beam)),
      relative: (luminance(beam) / ref * 100).toFixed(1)
    };
  });
};

export {
  SPECTRA_W,
  SPECTRA_H,
  SCENE_W,
  SCENE_H,
  SpectraOptions,
  SunRow,
  drawSkySpectra,
  drawSkyScene,
  sunTable
};
