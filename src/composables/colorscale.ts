import {Vec3, rgbToOklch, oklchToRgb, rgbToLab, contrastRatio} from '../utils/space';
import {rgbToHsl, hslToRgb, toHex} from '../utils/csscolor';

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const LIGHTNESS = [0.975, 0.94, 0.89, 0.82, 0.73, 0.64, 0.55, 0.46, 0.38, 0.30, 0.22];

interface ScaleItem {
  step: number;
  rgb: Vec3;
  hex: string;
  lstar: number;
  white: number;
  black: number;
  text: string;
  isBase: boolean;
}

const bell = (l: number): number => 4 * l * (1 - l);

/** 保持 L、h 不变，用二分法把彩度压到 sRGB 能显示的最大值 */
const fitChroma = (l: number, c: number, h: number): Vec3 => {
  if (oklchToRgb([l, c, h]).inGamut) {
    return oklchToRgb([l, c, h]).rgb;
  }
  let lo = 0;
  let hi = c;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (oklchToRgb([l, mid, h]).inGamut) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return oklchToRgb([l, lo, h]).rgb;
};

/** 基准色放在亮度最接近的色阶上，其余色阶按固定亮度曲线和钟形彩度曲线生成 */
const oklchScale = (base: Vec3, hueShift: number): {rgbs: Vec3[]; baseIndex: number} => {
  const [bl, bc, bh] = rgbToOklch(base);
  let baseIndex = 0;
  LIGHTNESS.forEach((l, i) => {
    if (Math.abs(l - bl) < Math.abs(LIGHTNESS[baseIndex] - bl)) {
      baseIndex = i;
    }
  });
  const ref = Math.max(bell(bl), 0.05);
  const rgbs = LIGHTNESS.map((l, i) => {
    if (i === baseIndex) {
      return base;
    }
    const chroma = Math.min(bc * bell(l) / ref, bc * 1.6);
    return fitChroma(l, chroma, bh + hueShift * (i - baseIndex) / 10);
  });
  return {rgbs, baseIndex};
};

/** 对照组：固定 H、S，只让 HSL 的 L 从 97% 均匀降到 10% */
const hslScale = (base: Vec3): Vec3[] => {
  const [h, s] = rgbToHsl(base);
  return STEPS.map((_, i) => hslToRgb([h, s, 97 - i * 8.7]).map(Math.round) as Vec3);
};

const describe = (rgbs: Vec3[], baseIndex = -1): ScaleItem[] => {
  const white: Vec3 = [255, 255, 255];
  const black: Vec3 = [0, 0, 0];
  return rgbs.map((rgb, i) => {
    const w = contrastRatio(rgb, white);
    const k = contrastRatio(rgb, black);
    return {
      step: STEPS[i],
      rgb,
      hex: toHex(rgb),
      lstar: rgbToLab(rgb)[0],
      white: w,
      black: k,
      text: w >= k ? '#FFFFFF' : '#000000',
      isBase: i === baseIndex
    };
  });
};

const toCssVars = (items: ScaleItem[], name = 'color'): string => {
  return `:root {\n${items.map(i => `  --${name}-${i.step}: ${i.hex};`).join('\n')}\n}`;
};

const toJsonText = (items: ScaleItem[]): string => {
  return `{\n${items.map(i => `  "${i.step}": "${i.hex}"`).join(',\n')}\n}`;
};

const drawLstarChart = (ctx: CanvasRenderingContext2D, width: number, height: number, oklch: number[], hsl: number[]): void => {
  const left = 40;
  const right = 130;
  const top = 14;
  const bottom = 30;
  const w = width - left - right;
  const h = height - top - bottom;
  const px = (i: number) => left + i / (STEPS.length - 1) * w;
  const py = (l: number) => top + (1 - l / 100) * h;

  ctx.font = '12px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#E5E7EB';
  ctx.fillStyle = '#666';
  ctx.textAlign = 'right';
  [0, 25, 50, 75, 100].forEach(l => {
    ctx.beginPath();
    ctx.moveTo(left, py(l));
    ctx.lineTo(left + w, py(l));
    ctx.stroke();
    ctx.fillText(String(l), left - 6, py(l));
  });
  ctx.textAlign = 'center';
  STEPS.forEach((s, i) => ctx.fillText(String(s), px(i), height - 14));

  const line = (values: number[], color: string) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((v, i) => (i === 0 ? ctx.moveTo(px(i), py(v)) : ctx.lineTo(px(i), py(v))));
    ctx.stroke();
    values.forEach((v, i) => {
      ctx.beginPath();
      ctx.arc(px(i), py(v), 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  };
  line(oklch, '#1A73E8');
  line(hsl, '#E8710A');

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1A73E8';
  ctx.fillText('OKLCH 色阶', left + w + 14, top + 12);
  ctx.fillStyle = '#E8710A';
  ctx.fillText('HSL 色阶', left + w + 14, top + 32);
  ctx.fillStyle = '#666';
  ctx.fillText('纵轴：Lab L*', left + w + 14, top + 60);
};

export {
  STEPS,
  ScaleItem,
  oklchScale,
  hslScale,
  describe,
  toCssVars,
  toJsonText,
  drawLstarChart
};
