import {Vec3, srgbToLinear, linearToSrgb} from '../utils/space';

type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

const clampCode = (n: number): number => Math.min(255, Math.max(0, Math.round(n)));

const css = (rgb: Vec3): string => `rgb(${rgb.join(',')})`;

const hex = (rgb: Vec3): string => {
  return `#${rgb.map(v => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
};

const gray = (code: number): Vec3 => [clampCode(code), clampCode(code), clampCode(code)];

const decode = (code: number): number => srgbToLinear(code / 255);

const encode = (linear: number): number => clampCode(linearToSrgb(linear) * 255);

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const mixSrgb = (a: Vec3, b: Vec3, t = 0.5): Vec3 => {
  return a.map((v, i) => clampCode(lerp(v, b[i], t))) as Vec3;
};

const mixLinear = (a: Vec3, b: Vec3, t = 0.5): Vec3 => {
  return a.map((v, i) => encode(lerp(decode(v), decode(b[i]), t))) as Vec3;
};

const MIX_PAIRS: {name: string; a: Vec3; b: Vec3}[] = [
  {name: '红 + 绿', a: [255, 0, 0], b: [0, 255, 0]},
  {name: '黑 + 白', a: [0, 0, 0], b: [255, 255, 255]},
  {name: '蓝 + 黄', a: [0, 0, 255], b: [255, 255, 0]}
];

const drawCurve: DrawFn = (ctx, w, h) => {
  const left = 44;
  const top = 16;
  const pw = w - left - 16;
  const ph = h - top - 36;
  const px = (x: number) => left + x * pw;
  const py = (y: number) => top + (1 - y) * ph;

  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#666';
  ctx.strokeStyle = '#E5E5E5';
  ctx.lineWidth = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    ctx.beginPath();
    ctx.moveTo(px(t), py(0));
    ctx.lineTo(px(t), py(1));
    ctx.moveTo(px(0), py(t));
    ctx.lineTo(px(1), py(t));
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillText(String(t), px(t), py(0) + 14);
    ctx.textAlign = 'right';
    ctx.fillText(String(t), px(0) - 6, py(t) + 4);
  });
  ctx.textAlign = 'center';
  ctx.fillText('线性光强度', px(0.5), py(0) + 30);
  ctx.textAlign = 'left';
  ctx.fillText('编码值', 4, top + 4);

  const plot = (f: (x: number) => number, color: string, dash: number[]) => {
    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i <= 200; i++) {
      const x = i / 200;
      const y = Math.min(1, f(x));
      if (i === 0) {
        ctx.moveTo(px(x), py(y));
      } else {
        ctx.lineTo(px(x), py(y));
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };
  plot(x => x, '#999', [5, 5]);
  plot(x => x ** (1 / 2.2), '#E8710A', []);
  plot(linearToSrgb, '#1A73E8', []);

  ctx.fillStyle = '#1A73E8';
  ctx.beginPath();
  ctx.arc(px(0.5), py(linearToSrgb(0.5)), 4, 0, 2 * Math.PI);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.fillText(`线性50% → 编码 ${linearToSrgb(0.5).toFixed(3)} (≈${encode(0.5)})`, px(0.5) + 8, py(linearToSrgb(0.5)) + 16);

  const legend: [string, string][] = [['#999', 'y = x（无编码）'], ['#E8710A', '纯 2.2 gamma'], ['#1A73E8', 'sRGB 分段曲线']];
  legend.forEach(([color, text], i) => {
    ctx.fillStyle = color;
    ctx.fillRect(px(0.55), py(0.3) + i * 18, 14, 3);
    ctx.fillStyle = '#333';
    ctx.fillText(text, px(0.55) + 20, py(0.3) + i * 18 + 5);
  });
};

const drawMixing: DrawFn = ctx => {
  const rowH = 100;
  ctx.textBaseline = 'middle';
  MIX_PAIRS.forEach(({name, a, b}, row) => {
    const y = row * rowH + 8;
    const results: [string, Vec3][] = [['sRGB 数值平均', mixSrgb(a, b)], ['线性光平均', mixLinear(a, b)]];
    ctx.fillStyle = '#333';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(name, 4, y + 40);
    [a, b].forEach((c, i) => {
      ctx.fillStyle = css(c);
      ctx.fillRect(80 + i * 76, y + 16, 48, 48);
      ctx.strokeStyle = '#CCC';
      ctx.strokeRect(80 + i * 76 + 0.5, y + 16.5, 47, 47);
    });
    ctx.fillStyle = '#666';
    ctx.fillText('+', 134, y + 40);
    ctx.fillText('→', 214, y + 40);
    results.forEach(([label, rgb], i) => {
      const x = 236 + i * 170;
      ctx.fillStyle = css(rgb);
      ctx.fillRect(x, y, 64, 64);
      ctx.fillStyle = '#333';
      ctx.font = '12px sans-serif';
      ctx.fillText(label, x + 70, y + 24);
      ctx.fillText(hex(rgb), x + 70, y + 44);
    });
  });
  ctx.fillStyle = '#999';
  ctx.fillText('（50% : 50% 混合）', 4, 290);
};

const drawGradientCompare: DrawFn = (ctx, w) => {
  const labelW = 92;
  const barW = w - labelW;
  ctx.textBaseline = 'middle';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  MIX_PAIRS.forEach(({name, a, b}, row) => {
    const y = row * 76 + 4;
    ctx.fillStyle = '#333';
    ctx.fillText(name, 4, y + 34);
    const methods: [string, typeof mixSrgb][] = [['sRGB 插值', mixSrgb], ['线性光插值', mixLinear]];
    methods.forEach(([label, fn], i) => {
      ctx.fillStyle = '#666';
      ctx.fillText(label, 4, y + 16 + i * 32 + (i ? 4 : -2));
      for (let x = 0; x < barW; x++) {
        ctx.fillStyle = css(fn(a, b, x / (barW - 1)));
        ctx.fillRect(labelW + x, y + i * 32, 1, 28);
      }
    });
  });
};

const STRIPE_W = 160;
const STRIPE_H = 120;

const drawStripes: DrawFn = (ctx, w, h) => {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#FFF';
  for (let x = 1; x < w; x += 2) {
    ctx.fillRect(x, 0, 1, h);
  }
};

const grayPatch = (code: number): DrawFn => (ctx, w, h) => {
  ctx.fillStyle = css(gray(code));
  ctx.fillRect(0, 0, w, h);
};

/** 把 1px 黑白条纹按 n 像素分块求平均：linear=true 在线性光中平均，否则直接平均编码值 */
const drawBlocks = (ctx: CanvasRenderingContext2D, w: number, h: number, n: number, linear: boolean): void => {
  for (let x0 = 0; x0 < w; x0 += n) {
    const end = Math.min(x0 + n, w);
    let sum = 0;
    for (let x = x0; x < end; x++) {
      const code = x % 2 ? 255 : 0;
      sum += linear ? decode(code) : code;
    }
    const avg = sum / (end - x0);
    ctx.fillStyle = css(gray(linear ? encode(avg) : avg));
    ctx.fillRect(x0, 0, end - x0, h);
  }
};

const RAMP_STEPS = 16;

const drawRamp: DrawFn = (ctx, w) => {
  const bw = w / RAMP_STEPS;
  const rows: [string, (k: number) => number][] = [
    ['编码值均匀递增（每格 +1/15 的 sRGB 数值）', k => Math.round(k / (RAMP_STEPS - 1) * 255)],
    ['线性光均匀递增（每格 +1/15 的光强，再编码）', k => encode(k / (RAMP_STEPS - 1))]
  ];
  ctx.textBaseline = 'middle';
  rows.forEach(([title, code], row) => {
    const y = row * 96;
    ctx.fillStyle = '#333';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, 4, y + 10);
    for (let k = 0; k < RAMP_STEPS; k++) {
      const c = code(k);
      ctx.fillStyle = css(gray(c));
      ctx.fillRect(k * bw, y + 24, bw, 44);
      ctx.fillStyle = '#666';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(c), k * bw + bw / 2, y + 80);
    }
  });
};

export {
  DrawFn,
  css,
  hex,
  gray,
  encode,
  decode,
  mixSrgb,
  mixLinear,
  drawCurve,
  drawMixing,
  drawGradientCompare,
  drawStripes,
  grayPatch,
  drawBlocks,
  drawRamp,
  STRIPE_W,
  STRIPE_H
};
