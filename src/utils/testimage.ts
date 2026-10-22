type Ctx = CanvasRenderingContext2D;
type Painter = (ctx: Ctx, width: number, height: number) => void;

const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
  const c = v * s;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs(hh % 2 - 1));
  const m = v - c;
  let rgb: number[];
  if (hh < 1) {
    rgb = [c, x, 0];
  } else if (hh < 2) {
    rgb = [x, c, 0];
  } else if (hh < 3) {
    rgb = [0, c, x];
  } else if (hh < 4) {
    rgb = [0, x, c];
  } else if (hh < 5) {
    rgb = [x, 0, c];
  } else {
    rgb = [c, 0, x];
  }
  return rgb.map(n => Math.round((n + m) * 255)) as [number, number, number];
};

const makeCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const paintWheel: Painter = (ctx, width, height) => {
  const image = ctx.createImageData(width, height);
  const radius = Math.min(width, height) / 2 - 4;
  const cx = width / 2;
  const cy = height / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.hypot(dx, dy);
      const i = (y * width + x) * 4;
      let rgb: number[] = [255, 255, 255];
      if (dist <= radius) {
        rgb = hsvToRgb(Math.atan2(dy, dx) * 180 / Math.PI, dist / radius, 1);
      }
      image.data[i] = rgb[0];
      image.data[i + 1] = rgb[1];
      image.data[i + 2] = rgb[2];
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
};

const paintRainbow: Painter = (ctx, width, height) => {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  const top = Math.round(height * 0.6);
  for (let x = 0; x < width; x++) {
    const [r, g, b] = hsvToRgb(x / width * 360, 1, 1);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, 0, 1, top);
    const gray = Math.round(x / (width - 1) * 255);
    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
    ctx.fillRect(x, top + 8, 1, height - top - 8);
  }
};

const paintSwatches = (colors: string[], columns: number): Painter => (ctx, width, height) => {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  const rows = Math.ceil(colors.length / columns);
  const gap = 6;
  const cw = (width - gap * (columns + 1)) / columns;
  const ch = (height - gap * (rows + 1)) / rows;
  colors.forEach((color, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    ctx.fillStyle = color;
    ctx.fillRect(gap + col * (cw + gap), gap + row * (ch + gap), cw, ch);
  });
};

const paintRing = paintSwatches([
  '#FF0000', '#FF8000', '#FFFF00', '#80FF00',
  '#00FF00', '#00FF80', '#00FFFF', '#0080FF',
  '#0000FF', '#8000FF', '#FF00FF', '#FF0080'
], 6);

const paintRedGreen = paintSwatches([
  '#FF0000', '#00A000', '#FF8000', '#80C000',
  '#A05000', '#608000', '#FF80C0', '#A0A0A0'
], 4);

const paintGradient: Painter = (ctx, width, height) => {
  const hue = ctx.createLinearGradient(0, 0, width, 0);
  ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000'].forEach((color, i, list) => {
    hue.addColorStop(i / (list.length - 1), color);
  });
  ctx.fillStyle = hue;
  ctx.fillRect(0, 0, width, height);

  const light = ctx.createLinearGradient(0, 0, 0, height);
  light.addColorStop(0, 'rgba(255, 255, 255, 1)');
  light.addColorStop(0.45, 'rgba(255, 255, 255, 0)');
  light.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
  light.addColorStop(1, 'rgba(0, 0, 0, 1)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, width, height);
};

const paintMix: Painter = (ctx, width, height) => {
  const half = Math.floor(width / 2);
  const left = makeCanvas(half, height);
  paintWheel(left.getContext('2d') as Ctx, half, height);
  ctx.drawImage(left, 0, 0);
  const right = makeCanvas(width - half, height);
  paintGradient(right.getContext('2d') as Ctx, width - half, height);
  ctx.drawImage(right, half, 0);
};

const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const paintIshihara: Painter = (ctx, width, height) => {
  const mask = makeCanvas(width, height);
  const mctx = mask.getContext('2d', {willReadFrequently: true}) as Ctx;
  mctx.fillStyle = '#FFFFFF';
  mctx.fillRect(0, 0, width, height);
  mctx.fillStyle = '#000000';
  mctx.font = `bold ${Math.round(height * 0.95)}px sans-serif`;
  mctx.textAlign = 'center';
  mctx.textBaseline = 'middle';
  mctx.fillText('5', width / 2, height / 2 + height * 0.04);
  const maskData = mctx.getImageData(0, 0, width, height).data;

  const rand = mulberry32(20240521);
  const inside = ['#E8603C', '#F08A4B', '#D9472B', '#F4A460'];
  const outside = ['#8FB339', '#A8C256', '#6B8E23', '#C5D86D'];
  ctx.fillStyle = '#F6F0E0';
  ctx.fillRect(0, 0, width, height);

  const cell = 14;
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const grid: number[][][] = Array.from({length: cols * rows}, () => []);
  const limit = Math.min(width, height) / 2 - 2;

  for (let n = 0; n < 9000; n++) {
    const x = rand() * width;
    const y = rand() * height;
    const r = 2.5 + rand() * 3.5;
    if (Math.hypot(x - width / 2, y - height / 2) + r > limit) {
      continue;
    }
    const gx = Math.floor(x / cell);
    const gy = Math.floor(y / cell);
    let free = true;
    for (let dy = -1; dy <= 1 && free; dy++) {
      for (let dx = -1; dx <= 1 && free; dx++) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) {
          continue;
        }
        free = grid[ny * cols + nx].every(dot => Math.hypot(dot[0] - x, dot[1] - y) >= dot[2] + r + 1);
      }
    }
    if (!free) {
      continue;
    }
    grid[gy * cols + gx].push([x, y, r]);
    const dark = maskData[(Math.floor(y) * width + Math.floor(x)) * 4] < 128;
    const palette = dark ? inside : outside;
    ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
  }
};

const paintStripes: Painter = (ctx, width, height) => {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  const third = Math.floor(height / 3);
  const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF'];
  for (let i = 0; i * 3 < width; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(i * 3, 0, 3, third);
  }

  ctx.fillStyle = '#20C020';
  ctx.fillRect(0, third, width, third);
  ctx.fillStyle = '#FF2020';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('COLOR', width / 2, third * 1.5);

  for (let i = 0; i * 2 < width; i++) {
    ctx.fillStyle = i % 2 ? '#FFFFFF' : '#000000';
    ctx.fillRect(i * 2, third * 2, 2, height - third * 2);
  }
};

const PAINTERS: Record<string, Painter> = {
  wheel: paintWheel,
  rainbow: paintRainbow,
  ring: paintRing,
  redgreen: paintRedGreen,
  ishihara: paintIshihara,
  gradient: paintGradient,
  mix: paintMix,
  stripes: paintStripes
};

const cache = new Map<string, ImageData>();

/** 返回缓存的测试图像数据，调用方不得修改返回的 ImageData */
const getSource = (name: string, width: number, height: number): ImageData => {
  const key = `${name}:${width}x${height}`;
  let data = cache.get(key);
  if (!data) {
    const canvas = makeCanvas(width, height);
    const ctx = canvas.getContext('2d', {willReadFrequently: true}) as Ctx;
    PAINTERS[name](ctx, width, height);
    data = ctx.getImageData(0, 0, width, height);
    cache.set(key, data);
  }
  return data;
};

export {
  hsvToRgb,
  getSource
};