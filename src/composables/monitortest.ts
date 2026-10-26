type PixelDraw = (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => void;

interface Pattern {
  key: string;
  title: string;
  desc: string;
  cssW: number;
  cssH: number;
  draw: PixelDraw;
}

const gray = (v: number): string => `rgb(${v}, ${v}, ${v})`;

const label = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, dpr: number, color = '#222', align: CanvasTextAlign = 'center'): void => {
  ctx.font = `${Math.round(11 * dpr)}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
};

const grayscale256: PixelDraw = (ctx, w, h, dpr) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const band = Math.floor(3 * dpr);
  const left = Math.round(8 * dpr);
  for (let v = 0; v < 256; v++) {
    ctx.fillStyle = gray(v);
    ctx.fillRect(left + v * band, Math.round(8 * dpr), band, Math.round(56 * dpr));
  }
  for (let v = 0; v < 256; v += 32) {
    label(ctx, `${v}`, left + v * band + band / 2, Math.round(78 * dpr), dpr);
  }
  label(ctx, '255', left + 255 * band, Math.round(78 * dpr), dpr);
};

const nearBlack: PixelDraw = (ctx, w, h, dpr) => {
  ctx.fillStyle = gray(0);
  ctx.fillRect(0, 0, w, h);
  const cell = Math.round(44 * dpr);
  for (let v = 1; v <= 16; v++) {
    const x = Math.round(8 * dpr) + (v - 1) * cell;
    ctx.fillStyle = gray(v);
    ctx.fillRect(x + 3 * dpr, Math.round(8 * dpr), cell - 6 * dpr, Math.round(48 * dpr));
    label(ctx, `${v}`, x + cell / 2, Math.round(72 * dpr), dpr, '#999');
  }
};

const nearWhite: PixelDraw = (ctx, w, h, dpr) => {
  ctx.fillStyle = gray(255);
  ctx.fillRect(0, 0, w, h);
  const cell = Math.round(44 * dpr);
  for (let i = 0; i < 16; i++) {
    const v = 239 + i;
    const x = Math.round(8 * dpr) + i * cell;
    ctx.fillStyle = gray(v);
    ctx.fillRect(x + 3 * dpr, Math.round(8 * dpr), cell - 6 * dpr, Math.round(48 * dpr));
    label(ctx, `${v}`, x + cell / 2, Math.round(72 * dpr), dpr, '#999');
  }
};

const GAMMAS = [1.8, 2.0, 2.2, 2.4, 2.6];

const gammaChart: PixelDraw = (ctx, w, h, dpr) => {
  ctx.fillStyle = '#888';
  ctx.fillRect(0, 0, w, h);
  const rowH = Math.round(54 * dpr);
  const stripeW = Math.round(150 * dpr);
  GAMMAS.forEach((g, i) => {
    const y0 = Math.round(8 * dpr) + i * (rowH + Math.round(6 * dpr));
    const value = Math.round(255 * 0.5 ** (1 / g));
    for (let y = 0; y < rowH; y++) {
      ctx.fillStyle = y % 2 === 0 ? '#000' : '#FFF';
      ctx.fillRect(Math.round(60 * dpr), y0 + y, stripeW, 1);
    }
    ctx.fillStyle = gray(value);
    ctx.fillRect(Math.round(60 * dpr) + stripeW, y0, stripeW, rowH);
    label(ctx, `γ ${g.toFixed(1)}`, Math.round(30 * dpr), y0 + rowH / 2, dpr, '#FFF');
    label(ctx, `${value}`, Math.round(60 * dpr) + stripeW * 2 + Math.round(24 * dpr), y0 + rowH / 2, dpr, '#FFF');
  });
};

const checker: PixelDraw = (ctx, w, h, dpr) => {
  const size = Math.round(32 * dpr);
  for (let y = 0; y * size < h; y++) {
    for (let x = 0; x * size < w; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#000' : '#FFF';
      ctx.fillRect(x * size, y * size, size, size);
    }
  }
};

const BARS: [string, string][] = [
  ['白', '#FFFFFF'], ['黄', '#FFFF00'], ['青', '#00FFFF'], ['绿', '#00FF00'],
  ['品红', '#FF00FF'], ['红', '#FF0000'], ['蓝', '#0000FF'], ['黑', '#000000']
];

const colorBars: PixelDraw = (ctx, w, h, dpr) => {
  ctx.fillStyle = '#444';
  ctx.fillRect(0, 0, w, h);
  const bw = Math.floor((w - Math.round(16 * dpr)) / BARS.length);
  const left = Math.round(8 * dpr);
  BARS.forEach(([name, color], i) => {
    ctx.fillStyle = color;
    ctx.fillRect(left + i * bw, Math.round(8 * dpr), bw, Math.round(70 * dpr));
    label(ctx, name, left + i * bw + bw / 2, Math.round(92 * dpr), dpr, '#FFF');
  });
  [0, 1, 2].forEach(k => {
    const y = Math.round(106 * dpr) + k * Math.round(22 * dpr);
    const rw = bw * BARS.length;
    for (let x = 0; x < rw; x++) {
      const v = Math.round(x / (rw - 1) * 255);
      ctx.fillStyle = k === 0 ? `rgb(${v}, 0, 0)` : k === 1 ? `rgb(0, ${v}, 0)` : `rgb(0, 0, ${v})`;
      ctx.fillRect(left + x, y, 1, Math.round(18 * dpr));
    }
  });
};

const sharpness: PixelDraw = (ctx, w, h, dpr) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const half = Math.floor(w / 2);
  ctx.fillStyle = '#000';
  for (let x = 0; x < half; x += 2) {
    ctx.fillRect(x, 0, 1, Math.round(60 * dpr));
  }
  for (let y = Math.round(70 * dpr); y < Math.round(130 * dpr); y += 2) {
    ctx.fillRect(0, y, half, 1);
  }
  for (let y = 0; y < Math.round(60 * dpr); y++) {
    for (let x = half; x < w; x++) {
      if ((x + y) % 2 === 0) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  for (let x = half; x < w; x += 4) {
    ctx.fillRect(x, Math.round(70 * dpr), 2, Math.round(60 * dpr));
  }
  label(ctx, '1 像素竖线 / 横线', half / 2, Math.round(142 * dpr), dpr, '#555');
  label(ctx, '1 像素棋盘 / 2 像素竖线', half + half / 2, Math.round(142 * dpr), dpr, '#555');
};

const banding: PixelDraw = (ctx, w, h, dpr) => {
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);
  const bandH = Math.round(24 * dpr);
  const left = Math.round(8 * dpr);
  const bw = w - left * 2;
  ['gray', 'red', 'green', 'blue'].forEach((c, k) => {
    for (let x = 0; x < bw; x++) {
      const v = Math.round(x / (bw - 1) * 255);
      ctx.fillStyle = c === 'gray' ? `rgb(${v}, ${v}, ${v})` : c === 'red' ? `rgb(${v}, 0, 0)` : c === 'green' ? `rgb(0, ${v}, 0)` : `rgb(0, 0, ${v})`;
      ctx.fillRect(left + x, Math.round(6 * dpr) + k * (bandH + Math.round(4 * dpr)), 1, bandH);
    }
  });
};

const uniformity: PixelDraw = (ctx, w, h, dpr) => {
  ctx.fillStyle = '#EEE';
  ctx.fillRect(0, 0, w, h);
  const levels = [26, 128, 230];
  const pw = Math.floor((w - Math.round(32 * dpr)) / 3);
  levels.forEach((v, i) => {
    ctx.fillStyle = gray(v);
    ctx.fillRect(Math.round(8 * dpr) + i * (pw + Math.round(8 * dpr)), Math.round(8 * dpr), pw, h - Math.round(16 * dpr));
    label(ctx, `${Math.round(v / 255 * 100)}% 灰（${v}）`, Math.round(8 * dpr) + i * (pw + Math.round(8 * dpr)) + pw / 2, h - Math.round(22 * dpr), dpr, v > 128 ? '#222' : '#DDD');
  });
};

const PATTERNS: Pattern[] = [
  {
    key: 'gray256',
    title: '256 级灰阶',
    desc: '从左到右 0~255 共 256 个色带，每条 3 个物理像素宽。看相邻色带是否都能分辨，渐变里有没有突然变亮或变暗的一格。',
    cssW: 790,
    cssH: 90,
    draw: grayscale256
  },
  {
    key: 'nearblack',
    title: '近黑：1~16 级',
    desc: '黑色背景上有 16 个只比黑色亮一点点的方块。理想情况下，从 1 或 2 起的方块都应该能看见。看不见的数字越多，说明暗部被压成黑色（或亮度设得太低）。',
    cssW: 724,
    cssH: 84,
    draw: nearBlack
  },
  {
    key: 'nearwhite',
    title: '近白：239~254 级',
    desc: '白色背景上有 16 个比白色略暗的方块。如果最亮的几块看不出和背景的区别，说明高光被削掉了（对比度太高或亮度太高）。',
    cssW: 724,
    cssH: 84,
    draw: nearWhite
  },
  {
    key: 'gamma',
    title: 'Gamma 对照图',
    desc: '每一行左边是一像素黑一像素白的横线（平均亮度恰好是一半的光），右边是不同 γ 下“正好等于一半光”的灰块（编码值 = 255 × 0.5^(1/γ)）。退后一点眯着眼看，和横线最融合的那一行就是你显示器的大致 γ（sRGB 屏接近 2.2）。需要浏览器缩放 100%、系统显示缩放 100%；在 Retina 屏上本页已按物理像素绘制，缩放不是 100% 时结果不可靠。',
    cssW: 450,
    cssH: 320,
    draw: gammaChart
  },
  {
    key: 'checker',
    title: '黑白棋盘',
    desc: '黑白方格交错，用来判断同屏对比度：白格的光是否会漏到黑格里（背光渗漏、光晕）。在昏暗环境里看效果最明显。',
    cssW: 384,
    cssH: 192,
    draw: checker
  },
  {
    key: 'colorbars',
    title: '色条与原色渐变',
    desc: '上面一排是白、黄、青、绿、品红、红、蓝、黑；下面是红、绿、蓝三个通道各自 0~255 的渐变。看每个原色是否纯净、渐变里有没有明显的台阶或偏色。',
    cssW: 780,
    cssH: 180,
    draw: colorBars
  },
  {
    key: 'sharp',
    title: '锐度与像素对位',
    desc: '一像素宽的黑白线和棋盘。每一像素都应该清晰分开；如果出现模糊、摩尔纹或灰蒙蒙的条纹，说明显示器缩放不是 1:1（系统缩放、非原生分辨率），或者抗锯齿滤镜在起作用。',
    cssW: 600,
    cssH: 160,
    draw: sharpness
  },
  {
    key: 'banding',
    title: '渐变条带',
    desc: '灰、红、绿、蓝四条 256 级平滑渐变。看有没有明显的“台阶”：8 位屏上通常只有细微的 1 级台阶，如果出现粗条带，可能是显示器的 6 位面板加抖动，或者色彩管理把渐变压缩了。',
    cssW: 780,
    cssH: 120,
    draw: banding
  },
  {
    key: 'uniform',
    title: '均匀度：10% / 50% / 90% 灰',
    desc: '三块纯灰，各自检查有没有亮暗不均、色斑、边角发暗或发亮（背光不均、漏光）。最好在较暗的房间里、离屏幕一臂远看。',
    cssW: 600,
    cssH: 140,
    draw: uniformity
  }
];

const mountPattern = (canvas: HTMLCanvasElement, p: Pattern): void => {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(p.cssW * dpr);
  canvas.height = Math.round(p.cssH * dpr);
  canvas.style.width = `${p.cssW}px`;
  canvas.style.height = `${p.cssH}px`;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  p.draw(ctx, canvas.width, canvas.height, dpr);
};

interface SolidColor {
  key: string;
  label: string;
  color: string;
}

const SOLIDS: SolidColor[] = [
  {key: 'black', label: '黑', color: '#000000'},
  {key: 'white', label: '白', color: '#FFFFFF'},
  {key: 'red', label: '红', color: '#FF0000'},
  {key: 'green', label: '绿', color: '#00FF00'},
  {key: 'blue', label: '蓝', color: '#0000FF'},
  {key: 'gray', label: '50% 灰', color: '#808080'}
];

export {
  Pattern,
  SolidColor,
  PATTERNS,
  SOLIDS,
  mountPattern
};
