import type {Vec3} from './space';
import {srgbToLinear, linearToSrgb} from './space';

/** Mannos–Sakrison 亮度对比敏感度，f 单位为周/度，峰值约 8 周/度 */
const lumaCsf = (f: number): number => {
  const x = 0.114 * f;
  return 2.6 * (0.0192 + x) * Math.exp(-(x ** 1.1));
};

const LUMA_PEAK = Math.max(...Array.from({length: 600}, (_, i) => lumaCsf(0.05 + i * 0.1)));

/** 归一化到峰值 = 1 的亮度 CSF */
const lumaCsfRel = (f: number): number => lumaCsf(f) / LUMA_PEAK;

/**
 * 色度 CSF 的示意模型：低通，没有低频下降。
 * 截止频率（敏感度降到约 1/e）红绿约 3 周/度，蓝黄约 1.5 周/度；这两个数是为演示而设的示意参数。
 */
const chromaCsfRel = (f: number, cutoff: number): number => Math.exp(-((f / cutoff) ** 1.5));

const RG_CUTOFF = 3;
const BY_CUTOFF = 1.5;

interface Chart {
  /** 横轴：f 从 fMin 到 fMax（对数），纵轴：对比度从 1 降到 cMin（对数） */
  fMin: number;
  fMax: number;
  cMin: number;
}

const CHART: Chart = {fMin: 0.2, fMax: 40, cMin: 0.003};

const chartFreq = (u: number): number => CHART.fMin * (CHART.fMax / CHART.fMin) ** u;
const chartContrast = (v: number): number => CHART.cMin ** v;

/** 对数扫频光栅的相位：保证局部空间频率恰好等于 chartFreq(u) */
const chirpPhase = (u: number): number => {
  const k = Math.log(CHART.fMax / CHART.fMin);
  return 2 * Math.PI * CHART.fMin * (Math.exp(k * u) - 1) / k;
};

type Axis = 'luma' | 'rg' | 'by';

/**
 * 等亮度的色度光栅方向（线性 sRGB 增量）。亮度权重 0.2126/0.7152/0.0722，
 * 红绿方向 (+0.7152, −0.2126, 0)·k 与蓝黄方向 (+0.0722·g, +0.0722·g, −(0.2126+0.7152)·g) 的亮度增量恒为 0。
 */
const rgDir: Vec3 = [0.7152, -0.2126, 0];
const byDir: Vec3 = [0.0722, 0.0722, -(0.2126 + 0.7152)];
const dirOf = (axis: Axis): Vec3 => (axis === 'rg' ? rgDir : axis === 'by' ? byDir : [1, 1, 1]);

const luminance = (c: Vec3): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/** 在 0.5 灰底上，以 amp 为调制幅度叠加方向 dir 的光栅，返回线性光 */
const gratingPixel = (axis: Axis, wave: number, amp: number): Vec3 => {
  const base = 0.2;
  const dir = dirOf(axis);
  const scale = axis === 'luma' ? base : base * (axis === 'rg' ? 1.2 : 0.8);
  return dir.map(d => Math.min(1, Math.max(0, base + d * scale * amp * wave))) as Vec3;
};

const encode = (v: number): number => Math.round(linearToSrgb(Math.min(1, Math.max(0, v))) * 255);

/** 渲染 Campbell–Robson 图 */
const renderChart = (ctx: CanvasRenderingContext2D, width: number, height: number, axis: Axis): void => {
  const img = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    const amp = chartContrast(y / (height - 1));
    for (let x = 0; x < width; x++) {
      const wave = Math.sin(chirpPhase(x / (width - 1)));
      const c = gratingPixel(axis, wave, amp);
      const i = (y * width + x) * 4;
      img.data[i] = encode(c[0]);
      img.data[i + 1] = encode(c[1]);
      img.data[i + 2] = encode(c[2]);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
};

/** 检验：等亮度方向的亮度增量是否为 0 */
const dirLuminance = (axis: Axis): number => luminance(dirOf(axis));

const rgbToLinear = (r: number, g: number, b: number): Vec3 => [srgbToLinear(r / 255), srgbToLinear(g / 255), srgbToLinear(b / 255)];

export {
  Axis,
  CHART,
  RG_CUTOFF,
  BY_CUTOFF,
  lumaCsf,
  lumaCsfRel,
  chromaCsfRel,
  chartFreq,
  chartContrast,
  chirpPhase,
  renderChart,
  dirLuminance,
  rgbToLinear,
  luminance,
  encode
};
