import {grayscaleRender, subpixelRender} from '../utils/sensor';

type Layout = 'rgb' | 'bgr' | 'pentile' | 'triad';

interface Raster {
  width: number;
  height: number;
  data: Uint8ClampedArray; // RGBA
}

interface View {
  raster: Raster;
  layout: Layout;
  zoom: number;
  ox: number;
  oy: number;
  width: number;
  height: number;
}

const SRC_W = 48;
const SRC_H = 32;
const TEXT_W = 68;
const TEXT_H = 18;
const SAMPLE_TEXT = 'Color 色彩';

const LAYOUTS: {value: Layout; label: string}[] = [
  {value: 'rgb', label: 'RGB 条纹（常见 LCD）'},
  {value: 'bgr', label: 'BGR 条纹'},
  {value: 'pentile', label: 'PenTile RGBG（OLED 常见）'},
  {value: 'triad', label: '三角点阵（CRT 荫罩）'}
];

const toRaster = (ctx: CanvasRenderingContext2D, w: number, h: number): Raster => {
  return {width: w, height: h, data: ctx.getImageData(0, 0, w, h).data};
};

const newCanvas = (w: number, h: number): CanvasRenderingContext2D => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas.getContext('2d', {willReadFrequently: true}) as CanvasRenderingContext2D;
};

let source: Raster | null = null;

/** 48×32 的小图：色相渐变、灰阶、白字黑底、黑字白底、一条斜线 */
const getSource = (): Raster => {
  if (source) {
    return source;
  }
  const ctx = newCanvas(SRC_W, SRC_H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SRC_W, SRC_H);
  for (let x = 0; x < SRC_W; x++) {
    ctx.fillStyle = `hsl(${Math.round(x / SRC_W * 360)}, 100%, 50%)`;
    ctx.fillRect(x, 0, 1, 7);
    const g = Math.round(x / (SRC_W - 1) * 255);
    ctx.fillStyle = `rgb(${g}, ${g}, ${g})`;
    ctx.fillRect(x, 7, 1, 3);
  }
  ctx.fillStyle = '#202020';
  ctx.fillRect(0, 11, 24, 13);
  ctx.fillStyle = '#FFF';
  ctx.fillRect(24, 11, 24, 13);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#FFF';
  ctx.fillText('Aa', 12, 18);
  ctx.fillStyle = '#000';
  ctx.fillText('Rg', 36, 18);
  ctx.strokeStyle = '#FFE600';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 31.5);
  ctx.lineTo(47, 25.5);
  ctx.stroke();
  source = toRaster(ctx, SRC_W, SRC_H);
  return source;
};

const channelColor = (c: number, v: number): string => {
  const lit = Math.round(18 + v * 0.93);
  return `rgb(${c === 0 ? lit : 18}, ${c === 1 ? lit : 18}, ${c === 2 ? lit : 18})`;
};

/** 把每个逻辑像素展开成子像素：亮度取该通道的（gamma 编码）数值 */
const drawSubpixels = (ctx: CanvasRenderingContext2D, view: View): void => {
  const {raster, layout, zoom: z, ox, oy, width, height} = view;
  ctx.fillStyle = '#0B0B0B';
  ctx.fillRect(0, 0, width, height);
  const cols = Math.floor(width / z);
  const rows = Math.floor(height / z);
  const gap = z >= 12 ? 1 : 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const sx = Math.min(raster.width - 1, ox + i);
      const sy = Math.min(raster.height - 1, oy + j);
      const p = (sy * raster.width + sx) * 4;
      const rgb = [raster.data[p], raster.data[p + 1], raster.data[p + 2]];
      const x = i * z;
      const y = j * z;
      if (layout === 'rgb' || layout === 'bgr') {
        const w = z / 3;
        for (let k = 0; k < 3; k++) {
          const c = layout === 'rgb' ? k : 2 - k;
          ctx.fillStyle = channelColor(c, rgb[c]);
          ctx.fillRect(x + k * w + gap / 2, y + gap / 2, w - gap, z - gap);
        }
      } else if (layout === 'pentile') {
        const c = (sx + sy) % 2 === 0 ? 0 : 2;
        ctx.fillStyle = channelColor(c, rgb[c]);
        ctx.fillRect(x + 1, y + 1, z * 0.56 - 1, z - 2);
        ctx.fillStyle = channelColor(1, rgb[1]);
        ctx.fillRect(x + z * 0.62, y + z * 0.18, z * 0.34, z * 0.64);
      } else {
        const flip = sx % 2 === 1;
        const spots = [
          {c: 0, x: 0.27, y: flip ? 0.3 : 0.72},
          {c: 1, x: 0.73, y: flip ? 0.3 : 0.72},
          {c: 2, x: 0.5, y: flip ? 0.74 : 0.28}
        ];
        spots.forEach(spot => {
          ctx.fillStyle = channelColor(spot.c, rgb[spot.c]);
          ctx.beginPath();
          ctx.arc(x + spot.x * z, y + spot.y * z, z * 0.2, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    }
  }
};

// ---------- 子像素文字渲染 ----------

let coverage: Float32Array | null = null;

/** 3 倍水平分辨率下的文字覆盖率（0~1） */
const getCoverage = (): Float32Array => {
  if (coverage) {
    return coverage;
  }
  const ctx = newCanvas(TEXT_W * 3, TEXT_H);
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, TEXT_W * 3, TEXT_H);
  ctx.setTransform(3, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.font = '13px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(SAMPLE_TEXT, 2, TEXT_H / 2 + 1);
  const data = ctx.getImageData(0, 0, TEXT_W * 3, TEXT_H).data;
  const out = new Float32Array(TEXT_W * 3 * TEXT_H);
  for (let i = 0; i < out.length; i++) {
    out[i] = 1 - data[i * 4] / 255;
  }
  coverage = out;
  return out;
};

const getTextRaster = (subpixel: boolean): Raster => {
  const cov = getCoverage();
  const render = subpixel ? subpixelRender : grayscaleRender;
  return {width: TEXT_W, height: TEXT_H, data: render(cov, TEXT_W * 3, TEXT_H)};
};

/** 直接最近邻放大 */
const drawRaster = (ctx: CanvasRenderingContext2D, raster: Raster, zoom: number): void => {
  const tmp = newCanvas(raster.width, raster.height);
  tmp.putImageData(new ImageData(raster.data, raster.width, raster.height), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp.canvas, 0, 0, raster.width, raster.height, 0, 0, raster.width * zoom, raster.height * zoom);
};

// ---------- 小测试：几种灰度如何点亮子像素 ----------

const GAMMA_SWATCHES: {label: string; rgb: number[]}[] = [
  {label: '白', rgb: [255, 255, 255]},
  {label: '灰 128', rgb: [128, 128, 128]},
  {label: '灰 188', rgb: [188, 188, 188]},
  {label: '红', rgb: [255, 0, 0]},
  {label: '黄', rgb: [255, 255, 0]},
  {label: '黑', rgb: [0, 0, 0]}
];

const drawGammaDemo = (ctx: CanvasRenderingContext2D): void => {
  const data = new Uint8ClampedArray(GAMMA_SWATCHES.length * 4);
  GAMMA_SWATCHES.forEach((item, i) => {
    data.set([...item.rgb, 255], i * 4);
  });
  drawSubpixels(ctx, {
    raster: {width: GAMMA_SWATCHES.length, height: 1, data},
    layout: 'rgb',
    zoom: 60,
    ox: 0,
    oy: 0,
    width: 360,
    height: 60
  });
  ctx.fillStyle = '#333';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  GAMMA_SWATCHES.forEach((item, i) => {
    ctx.fillText(item.label, i * 60 + 30, 66);
  });
};

// ---------- PWM 调光 ----------

const PWM_LEVELS = [1, 0.5, 0.1];
const PWM_FREQS = [240, 1000];
const PWM_WINDOW_MS = 10;

const drawPwm = (ctx: CanvasRenderingContext2D): void => {
  const left = 74;
  const colW = 230;
  const rowH = 88;
  const plotH = 54;
  ctx.font = '12px sans-serif';
  ctx.textBaseline = 'middle';
  PWM_FREQS.forEach((freq, col) => {
    const x0 = left + col * (colW + 12);
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText(`${freq} Hz（周期 ${(1000 / freq).toFixed(2)} ms）`, x0 + colW / 2, 12);
    PWM_LEVELS.forEach((level, row) => {
      const y0 = 34 + row * rowH;
      ctx.fillStyle = '#F4F5F8';
      ctx.fillRect(x0, y0, colW, plotH);
      ctx.beginPath();
      const period = 1000 / freq;
      const px = (ms: number) => x0 + ms / PWM_WINDOW_MS * colW;
      const py = (on: boolean) => (on ? y0 + 4 : y0 + plotH - 4);
      ctx.moveTo(x0, py(true));
      for (let t = 0; t < PWM_WINDOW_MS; t += period) {
        const highEnd = Math.min(PWM_WINDOW_MS, t + period * level);
        const end = Math.min(PWM_WINDOW_MS, t + period);
        ctx.lineTo(px(t), py(true));
        ctx.lineTo(px(highEnd), py(true));
        if (level < 1) {
          ctx.lineTo(px(highEnd), py(false));
          ctx.lineTo(px(end), py(false));
        }
      }
      ctx.strokeStyle = '#1A73E8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      const avgY = y0 + plotH - 4 - level * (plotH - 8);
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#E8710A';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, avgY);
      ctx.lineTo(x0 + colW, avgY);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  });
  PWM_LEVELS.forEach((level, row) => {
    ctx.fillStyle = '#333';
    ctx.textAlign = 'right';
    ctx.fillText(`亮度 ${Math.round(level * 100)}%`, left - 8, 34 + row * rowH + plotH / 2);
  });
  ctx.fillStyle = '#E8710A';
  ctx.textAlign = 'left';
  ctx.fillText('虚线：眼睛感觉到的平均亮度', left, 34 + 3 * rowH - 18);
  ctx.fillStyle = '#666';
  ctx.fillText(`横轴 0 ~ ${PWM_WINDOW_MS} ms`, left + 250, 34 + 3 * rowH - 18);
};

export {
  Layout,
  View,
  SRC_W,
  SRC_H,
  TEXT_W,
  TEXT_H,
  LAYOUTS,
  getSource,
  drawSubpixels,
  getTextRaster,
  drawRaster,
  drawGammaDemo,
  drawPwm
};
