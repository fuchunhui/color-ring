import {Vec3, rgbToLinear} from '../utils/space';
import {cmf, xyzToDisplayRgb} from '../utils/cie';
import {mulberry32, lin, encodeCode} from '../utils/scene';
import {
  DrawFn,
  Area,
  WAVELENGTHS,
  rgbCss,
  wlX,
  text,
  drawSpectrumBand,
  drawAxis
} from '../utils/spectral';
import {SUN, airMass, rayleighTau} from '../utils/physics';
import {
  PROFILE_STEP,
  AURORA_LINES,
  SUN_RADIUS,
  iceIndex,
  haloAngle,
  haloProfile,
  sundog,
  sundogProfile,
  refraction,
  apparentAltitude,
  discImage,
  auroraProfile
} from '../utils/atmosphere';

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

const putLinear = (data: Uint8ClampedArray, i: number, c: Vec3): void => {
  data[i] = encodeCode(c[0]);
  data[i + 1] = encodeCode(c[1]);
  data[i + 2] = encodeCode(c[2]);
  data[i + 3] = 255;
};

// ---------- 晕与幻日 ----------

const HALO_W = 640;
const HALO_H = 380;
const HALO_S = 7;

interface HaloOptions {
  elevation: number;
  ring46: boolean;
  dogs: boolean;
}

const haloCache = new Map<number, Float32Array>();
const cachedHalo = (w46: number): Float32Array => {
  let table = haloCache.get(w46);
  if (!table) {
    table = haloProfile(w46);
    haloCache.set(w46, table);
  }
  return table;
};

const SKY_ZENITH = lin(38, 92, 188);
const SKY_HORIZON = lin(150, 195, 240);
const GROUND = lin(14, 22, 16);

const drawHaloScene = (get: () => HaloOptions): DrawFn => (ctx, w, h) => {
  const {elevation, ring46, dogs} = get();
  const halo = cachedHalo(ring46 ? 0.16 : 0);
  const dog = sundogProfile(elevation);
  const inner = haloAngle(60, 650);
  const cx = w / 2;
  const cy = h / 2;
  const image = ctx.createImageData(w, h);
  const last = halo.length / 3 - 1;

  for (let y = 0; y < h; y++) {
    const dyDeg = (y - cy) / HALO_S;
    const alt = elevation - dyDeg;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dxDeg = (x - cx) / HALO_S;
      if (alt < 0) {
        const bump = 0.6 + 0.4 * Math.sin(x * 0.045) * Math.sin(x * 0.013 + 1);
        const g = GROUND.map(v => v * bump) as Vec3;
        putLinear(image.data, i, g);
        continue;
      }
      const ang = Math.hypot(dxDeg, dyDeg);
      const t = clamp01(alt / 60);
      const sky = SKY_HORIZON.map((v, c) => v + (SKY_ZENITH[c] - v) * t) as Vec3;
      const shade = ang < inner ? 0.9 : 1;
      const glow = 2.5 * Math.exp(-ang / 1.1) + 0.2 * Math.exp(-ang / 9);
      const hi = Math.min(last, Math.round(ang / PROFILE_STEP));
      const di = Math.min(last, Math.round(Math.abs(dxDeg) / PROFILE_STEP));
      const dogGain = dogs ? Math.exp(-0.5 * (dyDeg / 1.2) ** 2) : 0;
      const color: Vec3 = [0, 0, 0];
      for (let c = 0; c < 3; c++) {
        color[c] = sky[c] * shade + glow + 0.5 * halo[hi * 3 + c] + 0.9 * dog[di * 3 + c] * dogGain;
      }
      if (ang < 0.3) {
        color[0] += 8;
        color[1] += 8;
        color[2] += 8;
      }
      putLinear(image.data, i, color);
    }
  }
  ctx.putImageData(image, 0, 0);

  text(ctx, `太阳高度 ${elevation}°`, 10, 14, 'left', '#fff', '12px sans-serif');
  const sunY = cy;
  text(ctx, '22° 晕', cx + inner * HALO_S * 0.72, sunY - inner * HALO_S * 0.72 - 6, 'left', 'rgba(255,255,255,0.85)');
  if (ring46) {
    const r = haloAngle(90, 600) * HALO_S;
    text(ctx, '46° 晕（局部）', cx + r * 0.72, sunY - r * 0.72 - 6, 'left', 'rgba(255,255,255,0.85)');
  }
};

interface HaloRow {
  label: string;
  wavelength: number;
  n: number;
  d22: number;
  d46: number;
  color: string;
}

const haloRows = (): HaloRow[] => {
  return [
    {label: '红', wavelength: 650},
    {label: '黄绿', wavelength: 550},
    {label: '蓝', wavelength: 450}
  ].map(({label, wavelength}) => {
    const c = xyzToDisplayRgb(cmf(wavelength));
    return {
      label,
      wavelength,
      n: iceIndex(wavelength),
      d22: haloAngle(60, wavelength),
      d46: haloAngle(90, wavelength),
      color: rgbCss(c)
    };
  });
};

interface SundogRow {
  elevation: number;
  azimuth: number;
  distance: number;
}

const sundogRows = (): SundogRow[] => {
  return [0, 15, 30, 45, 60].map(elevation => {
    const s = sundog(elevation, iceIndex(550));
    return {elevation, azimuth: s ? s.azimuth : NaN, distance: s ? s.distance : NaN};
  });
};

// ---------- 绿闪 ----------

const FLASH_W = 560;
const FLASH_H = 320;
const FLASH_PX = 300;
const DISC_PX = (SUN_RADIUS / 60) * FLASH_PX;

interface FlashOptions {
  exaggeration: number;
  extinction: boolean;
  altitude: number;
}

const FLASH_SAMPLES = WAVELENGTHS.filter(l => l >= 400 && l <= 740);

const drawFlashScene = (get: () => FlashOptions): DrawFn => (ctx, w, h) => {
  const {exaggeration, extinction, altitude} = get();
  const hy = h * 0.74;
  const cx = w / 2;
  const mass = airMass(Math.max(0, altitude));
  const xyz = new Float32Array(w * h * 3);
  const ref = apparentAltitude(altitude, 575);
  const refSemi = discImage(altitude, 575).semiY;

  FLASH_SAMPLES.forEach(l => {
    const k = (l - 380) / 5;
    const tau = extinction ? rayleighTau(l) * mass : 0;
    const weight = SUN[k] * Math.exp(-tau);
    const img = discImage(altitude, l);
    const centerAlt = ref + (img.center - ref) * exaggeration;
    const semi = Math.max(0.02, refSemi + (img.semiY - refSemi) * exaggeration);
    const [cxm, cym, czm] = cmf(l);
    const cyPx = hy - centerAlt * FLASH_PX;
    const rx = DISC_PX;
    const ry = semi * FLASH_PX;
    const x0 = Math.max(0, Math.floor(cx - rx - 2));
    const x1 = Math.min(w - 1, Math.ceil(cx + rx + 2));
    const y0 = Math.max(0, Math.floor(cyPx - ry - 2));
    const y1 = Math.min(h - 1, Math.ceil(cyPx + ry + 2), Math.floor(hy) - 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cyPx) / ry;
        const d = Math.sqrt(nx * nx + ny * ny);
        const cov = Math.min(1, Math.max(0, (1 - d) * Math.min(rx, ry) * 0.5 + 0.5));
        if (cov > 0) {
          const o = (y * w + x) * 3;
          const v = weight * cov;
          xyz[o] += v * cxm;
          xyz[o + 1] += v * cym;
          xyz[o + 2] += v * czm;
        }
      }
    }
  });

  let maxY = 1e-9;
  for (let i = 0; i < w * h; i++) {
    maxY = Math.max(maxY, xyz[i * 3 + 1]);
  }
  const image = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const o = (y * w + x) * 3;
      if (y >= hy) {
        const wave = 0.5 + 0.5 * Math.sin(x * 0.08 + y * 0.5);
        putLinear(image.data, i, [0.002, 0.006 + 0.004 * wave, 0.016 + 0.006 * wave]);
        continue;
      }
      const t = clamp01(1 - y / hy);
      const bg: Vec3 = [0.05 + 0.1 * (1 - t), 0.04 + 0.03 * (1 - t), 0.06 + 0.1 * t];
      const X = xyz[o] / maxY;
      const Y = xyz[o + 1] / maxY;
      const Z = xyz[o + 2] / maxY;
      const rgb: Vec3 = [
        3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z,
        -0.969266 * X + 1.8760108 * Y + 0.041556 * Z,
        0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z
      ];
      putLinear(image.data, i, rgb.map((v, c) => Math.max(0, v) * 1.1 + bg[c]) as Vec3);
    }
  }
  ctx.putImageData(image, 0, 0);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(0, hy, w, 1);
  text(ctx, '海平面', 8, hy + 14, 'left', '#9ab', '11px sans-serif');
  text(ctx, `位移放大 ×${exaggeration}`, w - 8, 14, 'right', '#cde', '12px sans-serif');
};

interface RefractionRow {
  wavelength: number;
  arcmin: number;
  diff: number;
  color: string;
}

const refractionRows = (): RefractionRow[] => {
  const base = refraction(0, 575);
  return [400, 450, 500, 550, 600, 650, 700].map(wavelength => {
    const arcmin = refraction(0, wavelength);
    return {
      wavelength,
      arcmin,
      diff: (arcmin - base) * 60,
      color: rgbCss(xyzToDisplayRgb(cmf(wavelength)))
    };
  });
};

// ---------- 极光 ----------

const AURORA_W = 560;
const AURORA_H = 320;
const AURORA_PROFILE_W = 320;
const ALT_MIN = 70;
const ALT_MAX = 330;

const lineLinear = (l: number): Vec3 => rgbToLinear(xyzToDisplayRgb(cmf(l)));

const GREEN = lineLinear(557.7);
const RED = lineLinear(630);
const VIOLET_A = lineLinear(391.4);
const VIOLET_B = lineLinear(427.8);
const BLUE = VIOLET_A.map((v, c) => 0.5 * v + 0.5 * VIOLET_B[c]) as Vec3;

const auroraColor = (alt: number): Vec3 => {
  const p = auroraProfile(alt);
  return [0, 1, 2].map(c => p.green * GREEN[c] * 1.3 + p.red * RED[c] * 0.9 + p.blue * BLUE[c] * 1.1) as Vec3;
};

let stars: [number, number, number][] | null = null;
const getStars = (w: number, h: number): [number, number, number][] => {
  if (!stars) {
    const rand = mulberry32(7);
    stars = Array.from({length: 90}, () => [rand() * w, rand() * h * 0.7, 0.3 + rand() * 0.7]);
  }
  return stars;
};

const drawAuroraScene: DrawFn = (ctx, w, h) => {
  const image = ctx.createImageData(w, h);
  const top = 30;
  const kmPerPx = (ALT_MAX - 90) / (h * 0.72 - top);
  for (let x = 0; x < w; x++) {
    const baseY = h * 0.72 - 26 * Math.sin(x * 0.011 + 1) - 12 * Math.sin(x * 0.032 + 2);
    const bright = 0.35 + 0.65 * Math.max(0, Math.sin(x * 0.017 + 0.4) * 0.7 + Math.sin(x * 0.043) * 0.4 + 0.2);
    const rays = 0.55 + 0.45 * Math.sin(x * 0.52) * Math.sin(x * 0.19 + 1);
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      const t = y / h;
      const color: Vec3 = [0.002 + 0.004 * t, 0.004 + 0.012 * t, 0.012 + 0.03 * t];
      if (y < baseY + 14) {
        const alt = 90 + (baseY - y) * kmPerPx;
        const a = auroraColor(alt);
        const fadeLow = clamp01((baseY + 14 - y) / 14);
        const gain = bright * rays * fadeLow * 0.9;
        for (let c = 0; c < 3; c++) {
          color[c] += a[c] * gain;
        }
      }
      putLinear(image.data, i, color);
    }
  }
  ctx.putImageData(image, 0, 0);

  getStars(w, h).forEach(([sx, sy, b]) => {
    ctx.fillStyle = `rgba(255,255,255,${b * 0.8})`;
    ctx.fillRect(sx, sy, 1.4, 1.4);
  });

  const rand = mulberry32(3);
  ctx.fillStyle = '#04070a';
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 6) {
    const treeH = 10 + rand() * 18 + (Math.sin(x * 0.02) + 1) * 8;
    ctx.lineTo(x, h * 0.9 - treeH);
    ctx.lineTo(x + 3, h * 0.9 - treeH * 0.4);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  text(ctx, '示意：幕状极光，高度越高越偏红', 10, 14, 'left', 'rgba(255,255,255,0.7)');
};

type AuroraProfile = ReturnType<typeof auroraProfile>;

const drawAuroraProfile: DrawFn = (ctx, w, h) => {
  const a: Area = {x: 52, y: 18, w: w - 74, h: h - 62};
  ctx.fillStyle = '#0a1018';
  ctx.fillRect(0, 0, w, h);
  const yOf = (alt: number) => a.y + a.h - (alt - ALT_MIN) / (ALT_MAX - ALT_MIN) * a.h;
  ctx.strokeStyle = '#334';
  ctx.lineWidth = 1;
  for (let alt = 100; alt <= 300; alt += 50) {
    const y = Math.round(yOf(alt)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(a.x, y);
    ctx.lineTo(a.x + a.w, y);
    ctx.stroke();
    text(ctx, `${alt} km`, a.x - 6, y, 'right', '#9ab', '11px sans-serif');
  }
  const curves: [string, string, (p: AuroraProfile) => number][] = [
    [rgbCss(xyzToDisplayRgb(cmf(557.7))), '氧 557.7 绿', p => p.green],
    [rgbCss(xyzToDisplayRgb(cmf(630))), '氧 630.0 红', p => p.red],
    ['#8b6cff', '氮 N₂⁺ 蓝紫', p => p.blue]
  ];
  curves.forEach(([color, label, pick], k) => {
    ctx.beginPath();
    for (let alt = ALT_MIN; alt <= ALT_MAX; alt += 2) {
      const x = a.x + clamp01(pick(auroraProfile(alt)) / 1.35) * a.w;
      if (alt === ALT_MIN) {
        ctx.moveTo(x, yOf(alt));
      } else {
        ctx.lineTo(x, yOf(alt));
      }
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(a.x + k * 88, h - 20, 10, 3);
    text(ctx, label, a.x + 14 + k * 88, h - 18, 'left', '#cde', '10px sans-serif');
  });
  text(ctx, '相对发光强度（示意）', a.x + a.w / 2, h - 36, 'center', '#789', '11px sans-serif');
};

const AURORA_LINE_COLORS = AURORA_LINES.map(line => ({
  ...line,
  color: rgbCss(xyzToDisplayRgb(cmf(line.wavelength)))
}));

const LINES_W = 560;
const LINES_H = 120;

const drawAuroraLines: DrawFn = (ctx, w, h) => {
  const a: Area = {x: 20, y: 28, w: w - 60, h: 46};
  ctx.fillStyle = '#05070c';
  ctx.fillRect(0, 0, w, h);
  drawSpectrumBand(ctx, a, 0.25);
  drawAxis(ctx, a);
  AURORA_LINE_COLORS.forEach((line, i) => {
    const x = wlX(a, line.wavelength);
    ctx.fillStyle = line.color;
    ctx.fillRect(Math.round(x) - 1, a.y - 4, 2, a.h + 4);
    text(ctx, line.label, x, i % 2 ? a.y - 18 : a.y - 8, 'center', '#cde', '11px sans-serif');
  });
};

export {
  HALO_W,
  HALO_H,
  FLASH_W,
  FLASH_H,
  AURORA_W,
  AURORA_H,
  AURORA_PROFILE_W,
  AURORA_LINE_COLORS,
  LINES_W,
  LINES_H,
  drawHaloScene,
  haloRows,
  sundogRows,
  drawFlashScene,
  refractionRows,
  drawAuroraScene,
  drawAuroraProfile,
  drawAuroraLines
};
