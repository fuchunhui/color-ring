import {ref, Ref, onBeforeUnmount} from 'vue';
import {Vec3, oklchToRgb} from '../utils/space';
import {wavelengthToXyz, xyzToClipRgb} from '../utils/cie';
import {Area, DrawFn, rgbCss, text, drawAxis, wlX, WL_MIN, WL_MAX} from '../utils/spectral';
import {rgbToOpponent, afterimageRgb} from '../utils/vision';

type Phase = 'idle' | 'staring' | 'after';

const STARE_SECONDS = 30;

interface Stare {
  phase: Ref<Phase>;
  left: Ref<number>;
  start: () => void;
  reset: () => void;
}

/** 盯视倒计时：idle → staring（倒计时）→ after（切换到中性背景），卸载时清除计时器 */
const useStare = (seconds = STARE_SECONDS): Stare => {
  const phase = ref<Phase>('idle');
  const left = ref(seconds);
  let timer: number | undefined;

  const stop = () => {
    if (timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };

  const start = () => {
    stop();
    phase.value = 'staring';
    left.value = seconds;
    timer = window.setInterval(() => {
      left.value -= 1;
      if (left.value <= 0) {
        stop();
        phase.value = 'after';
      }
    }, 1000);
  };

  const reset = () => {
    stop();
    phase.value = 'idle';
    left.value = seconds;
  };

  onBeforeUnmount(stop);

  return {phase, left, start, reset};
};

// ---------- 对立色通道 ----------

const BARS_W = 460;
const BARS_H = 170;

interface Channel {
  name: string;
  value: number;
  signed: boolean;
  negative: string;
  positive: string;
  hint: string;
}

const drawOpponentBars = (color: () => Vec3): DrawFn => ctx => {
  const rgb = color();
  const {a, rg, by} = rgbToOpponent(rgb);
  ctx.fillStyle = rgbCss(rgb);
  ctx.fillRect(10, 10, 70, 150);
  ctx.strokeStyle = '#CCC';
  ctx.strokeRect(10.5, 10.5, 69, 149);

  const channels: Channel[] = [
    {name: '明暗 A', value: a, signed: false, negative: '#666', positive: '#666', hint: '(L+M)/2'},
    {name: '红—绿', value: rg, signed: true, negative: '#2F9E44', positive: '#E03131', hint: 'L−M'},
    {name: '蓝—黄', value: by, signed: true, negative: '#F2B600', positive: '#1971C2', hint: 'S−A'}
  ];
  const left = 190;
  const half = 100;
  channels.forEach((c, i) => {
    const y = 20 + i * 48;
    text(ctx, c.name, 92, y + 8, 'left', '#333', '13px sans-serif');
    text(ctx, c.hint, 92, y + 24, 'left', '#999', '11px sans-serif');
    ctx.fillStyle = '#EEE';
    ctx.fillRect(left, y, half * 2, 24);
    const clamped = Math.max(-1, Math.min(1, c.value));
    ctx.fillStyle = c.value < 0 ? c.negative : c.positive;
    if (c.signed) {
      const w = Math.abs(clamped) * half;
      ctx.fillRect(c.value < 0 ? left + half - w : left + half, y, w, 24);
      ctx.strokeStyle = '#555';
      ctx.beginPath();
      ctx.moveTo(left + half + 0.5, y - 3);
      ctx.lineTo(left + half + 0.5, y + 27);
      ctx.stroke();
    } else {
      ctx.fillRect(left, y, Math.max(0, clamped) * half * 2, 24);
    }
    text(ctx, c.value.toFixed(3), left + half * 2 + 10, y + 12, 'left', '#222', '12px Consolas, monospace');
  });
};

// ---------- 对立色平面 ----------

const PLANE_W = 400;
const PLANE_H = 400;
const PLANE_RANGE = 0.5;
const RG_STRETCH = 4;
const HUE_STEPS = Array.from({length: 12}, (_, i) => i * 30);

const drawOpponentPlane: DrawFn = ctx => {
  const cx = PLANE_W / 2;
  const cy = PLANE_H / 2;
  const k = (PLANE_W / 2 - 50) / PLANE_RANGE;
  ctx.strokeStyle = '#CCC';
  ctx.lineWidth = 1;
  [-0.1, -0.05, 0.05, 0.1].forEach(v => {
    ctx.beginPath();
    ctx.moveTo(cx + v * k * RG_STRETCH + 0.5, cy - 150);
    ctx.lineTo(cx + v * k * RG_STRETCH + 0.5, cy + 150);
    ctx.stroke();
  });
  [-0.4, -0.2, 0.2, 0.4].forEach(v => {
    ctx.beginPath();
    ctx.moveTo(cx - 150, cy + v * k + 0.5);
    ctx.lineTo(cx + 150, cy + v * k + 0.5);
    ctx.stroke();
  });
  ctx.strokeStyle = '#555';
  ctx.beginPath();
  ctx.moveTo(cx - 170, cy + 0.5);
  ctx.lineTo(cx + 170, cy + 0.5);
  ctx.moveTo(cx + 0.5, cy - 170);
  ctx.lineTo(cx + 0.5, cy + 170);
  ctx.stroke();
  text(ctx, '红 (L>M)', cx + 172, cy - 10, 'right', '#E03131', '12px sans-serif');
  text(ctx, '绿', cx - 172, cy - 10, 'left', '#2F9E44', '12px sans-serif');
  text(ctx, '蓝 (S↑)', cx + 8, cy - 176, 'left', '#1971C2', '12px sans-serif');
  text(ctx, '黄', cx + 8, cy + 176, 'left', '#C99700', '12px sans-serif');

  const points = HUE_STEPS.map(h => {
    const rgb = oklchToRgb([0.72, 0.12, h]).rgb;
    const {rg, by} = rgbToOpponent(rgb);
    return {h, rgb, x: cx + rg * k * RG_STRETCH, y: cy - by * k};
  });
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) {
      ctx.moveTo(p.x, p.y);
    } else {
      ctx.lineTo(p.x, p.y);
    }
  });
  ctx.closePath();
  ctx.strokeStyle = '#999';
  ctx.stroke();
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, 2 * Math.PI);
    ctx.fillStyle = rgbCss(p.rgb);
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const dx = p.x - cx;
    const dy = p.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    text(ctx, `${p.h}°`, p.x + dx / len * 20, p.y + dy / len * 14, 'center', '#555', '10px sans-serif');
  });
  text(ctx, '十二个色相（OKLCH 色相角，L=0.72，C=0.12）；横轴放大了 4 倍', 8, PLANE_H - 10, 'left', '#999', '11px sans-serif');
};

// ---------- 负后像 ----------

const FLAG_W = 360;
const FLAG_H = 240;
const AFTER_BG = '#F4F4F4';

const dot = (ctx: CanvasRenderingContext2D, x: number, y: number): void => {
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, 2 * Math.PI);
  ctx.fillStyle = '#FFF';
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.stroke();
};

/** 红白蓝（荷兰国旗）的反色版本：青 / 黑 / 黄；盯久后切到中性背景会看到红白蓝 */
const drawFlag = (phase: () => Phase): DrawFn => ctx => {
  if (phase() === 'after') {
    ctx.fillStyle = AFTER_BG;
    ctx.fillRect(0, 0, FLAG_W, FLAG_H);
  } else {
    const bands = ['#00FFFF', '#000000', '#FFFF00'];
    bands.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, i * FLAG_H / 3, FLAG_W, FLAG_H / 3);
    });
  }
  dot(ctx, FLAG_W / 2, FLAG_H / 2);
};

const PATCH_SIZE = 220;

const drawPatch = (phase: () => Phase, color: () => Vec3): DrawFn => ctx => {
  ctx.fillStyle = phase() === 'after' ? AFTER_BG : rgbCss(color());
  ctx.fillRect(0, 0, PATCH_SIZE, PATCH_SIZE);
  dot(ctx, PATCH_SIZE / 2, PATCH_SIZE / 2);
};

const PREDICT_W = 330;
const PREDICT_H = 110;

const drawPrediction = (color: () => Vec3): DrawFn => ctx => {
  const rgb = color();
  const predicted = afterimageRgb(rgb);
  [[rgb, '盯着看的颜色', 10], [predicted, '预测的后像颜色（示意）', 175]].forEach(([c, label, x]) => {
    ctx.fillStyle = rgbCss(c as Vec3);
    ctx.fillRect(x as number, 10, 145, 66);
    ctx.strokeStyle = '#CCC';
    ctx.strokeRect((x as number) + 0.5, 10.5, 144, 65);
    text(ctx, label as string, x as number, 92, 'left', '#555', '12px sans-serif');
  });
};

// ---------- 独特色相 ----------

const HUES_W = 700;
const HUES_H = 170;
const HUES_AREA: Area = {x: 20, y: 20, w: 640, h: 44};

const drawUniqueHues: DrawFn = ctx => {
  const a = HUES_AREA;
  for (let px = 0; px < a.w; px++) {
    const l = WL_MIN + px / a.w * (WL_MAX - WL_MIN);
    ctx.fillStyle = rgbCss(xyzToClipRgb(wavelengthToXyz(l)));
    ctx.fillRect(a.x + px, a.y, 1, a.h);
  }
  drawAxis(ctx, a);

  const marks: [string, number, number, string][] = [
    ['独特蓝 约 475nm', 475, 475, '#1971C2'],
    ['独特绿 约 500–510nm', 500, 510, '#2F9E44'],
    ['独特黄 约 575nm', 575, 575, '#C99700']
  ];
  marks.forEach(([label, from, to, color], i) => {
    const x1 = wlX(a, from);
    const x2 = wlX(a, to);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, a.y - 4);
    ctx.lineTo(x1, a.y + a.h + 4);
    ctx.moveTo(x2, a.y - 4);
    ctx.lineTo(x2, a.y + a.h + 4);
    ctx.stroke();
    if (to > from) {
      ctx.fillStyle = color;
      ctx.fillRect(x1, a.y + a.h + 4, x2 - x1, 3);
    }
    text(ctx, label, (x1 + x2) / 2, a.y + a.h + 46 + (i % 2) * 18, 'center', color, 'bold 12px sans-serif');
  });
  text(ctx, '独特红：光谱上没有对应的单色光，需要长波光再混入少量短波（紫端）的光', a.x, HUES_H - 12, 'left', '#C92A2A', '12px sans-serif');
};

export {
  Phase,
  STARE_SECONDS,
  useStare,
  BARS_W,
  BARS_H,
  PLANE_W,
  PLANE_H,
  FLAG_W,
  FLAG_H,
  PATCH_SIZE,
  PREDICT_W,
  PREDICT_H,
  HUES_W,
  HUES_H,
  drawOpponentBars,
  drawOpponentPlane,
  drawFlag,
  drawPatch,
  drawPrediction,
  drawUniqueHues
};
