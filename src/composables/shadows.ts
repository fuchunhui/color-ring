import type {Vec3} from '../utils/space';
import {srgbToLinear} from '../utils/space';
import {encodeCode} from '../utils/scene';
import type {DrawFn} from '../utils/spectral';
import {text, rgbCss} from '../utils/spectral';

const WALL_W = 480;
const WALL_H = 280;
const POLE_X = 240;
const POLE_W = 16;
const SHIFT = 78;
const PENUMBRA = 9;
const ALBEDO = 0.8;

const hexToLinear = (hex: string): Vec3 => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => srgbToLinear(parseInt(h.slice(i, i + 2), 16) / 255)) as Vec3;
};

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 位置 x 处被偏移 shift 的杆影遮住的程度 0~1，边缘有半影 */
const shadowAt = (x: number, shift: number): number => {
  const c = POLE_X + shift;
  const d = Math.abs(x - c);
  return 1 - smooth(POLE_W / 2 - PENUMBRA / 2, POLE_W / 2 + PENUMBRA, d);
};

interface Lights {
  white: Vec3;
  color: Vec3;
}

const lights = (hex: string, power: number): Lights => {
  const c = hexToLinear(hex);
  const norm = Math.max(c[0], c[1], c[2], 1e-6);
  return {white: [1, 1, 1], color: c.map(v => (v / norm) * power) as Vec3};
};

/** 两灯都照到的墙面光线 */
const bothLit = (l: Lights): Vec3 => [l.white[0] + l.color[0], l.white[1] + l.color[1], l.white[2] + l.color[2]];

const luma = (c: Vec3): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/**
 * mode = 'physical'：照实输出墙面反射的光（线性光，曝光归一化，两灯全照处约 0.72）。
 * mode = 'perceived'：按 adapt 比例把整体照明的颜色除掉（von Kries），模拟大脑对光源色的适应。
 */
const drawWall = (hex: () => string, power: () => number, mode: 'physical' | 'perceived', adapt: () => number): DrawFn => ctx => {
  const l = lights(hex(), power());
  const mean = bothLit(l);
  const exposure = ALBEDO * 0.9 / Math.max(luma(mean), 1e-6);
  const meanNorm = mean.map(v => v / Math.max(luma(mean), 1e-6)) as Vec3;
  const gains = meanNorm.map(v => (1 / v) ** (mode === 'perceived' ? adapt() : 0)) as Vec3;

  const img = ctx.createImageData(WALL_W, WALL_H);
  for (let y = 0; y < WALL_H; y++) {
    const shade = 1 - 0.1 * (y / WALL_H);
    for (let x = 0; x < WALL_W; x++) {
      const vw = 1 - shadowAt(x, SHIFT);
      const vc = 1 - shadowAt(x, -SHIFT);
      const i = (y * WALL_W + x) * 4;
      const onPole = Math.abs(x - POLE_X) < POLE_W / 2;
      for (let k = 0; k < 3; k++) {
        let v: number;
        if (onPole) {
          const t = (x - POLE_X) / (POLE_W / 2);
          v = (0.25 + 0.15 * (1 - t * t)) * (l.white[k] * 0.6 + l.color[k] * 0.6) * exposure / ALBEDO;
        } else {
          v = (l.white[k] * vw + l.color[k] * vc) * shade * exposure * gains[k];
        }
        img.data[i + k] = encodeCode(v);
      }
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const label = (str: string, px: number, py: number) => text(ctx, str, px, py, 'center', '#FFFFFF', 'bold 12px sans-serif');
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 3;
  label('只有彩灯照到', POLE_X + SHIFT, 20);
  label('只有白灯照到', POLE_X - SHIFT, 20);
  ctx.restore();
};

// ---------- 光照歧义 ----------

const STRIPE_A: Vec3 = [118, 130, 175];
const STRIPE_B: Vec3 = [152, 126, 96];
const SWATCH_W = 150;
const SWATCH_H = 120;

const illuminantOf = (t: number): Vec3 => {
  const cool: Vec3 = [0.68, 0.88, 1.12];
  const warm: Vec3 = [1.18, 0.95, 0.62];
  const target = t < 0 ? cool : warm;
  const a = Math.abs(t);
  return [0, 1, 2].map(i => 1 + (target[i] - 1) * a) as Vec3;
};

const inferred = (rgb: Vec3, t: number): Vec3 => {
  const e = illuminantOf(t);
  const toLin = (c: Vec3): Vec3 => c.map(v => srgbToLinear(v / 255)) as Vec3;
  const relit = (c: Vec3): Vec3 => toLin(c).map((v, i) => v / e[i]) as Vec3;
  const refLum = luma(toLin(STRIPE_A)) + luma(toLin(STRIPE_B));
  const newLum = luma(relit(STRIPE_A)) + luma(relit(STRIPE_B));
  const k = refLum / Math.max(newLum, 1e-6);
  return relit(rgb).map(v => encodeCode(v * k)) as Vec3;
};

const drawStripes = (t: () => number | null): DrawFn => ctx => {
  const level = t();
  const [a, b] = level === null ? [STRIPE_A, STRIPE_B] : [inferred(STRIPE_A, level), inferred(STRIPE_B, level)];
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = rgbCss(i % 2 === 0 ? a : b);
    ctx.fillRect(i * (SWATCH_W / 6), 0, SWATCH_W / 6 + 1, SWATCH_H);
  }
  ctx.strokeStyle = '#CCC';
  ctx.strokeRect(0.5, 0.5, SWATCH_W - 1, SWATCH_H - 1);
};

export {
  WALL_W,
  WALL_H,
  SWATCH_W,
  SWATCH_H,
  STRIPE_A,
  STRIPE_B,
  hexToLinear,
  drawWall,
  drawStripes,
  illuminantOf
};
