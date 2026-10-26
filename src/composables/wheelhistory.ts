import {Vec3, rgbToLab, oklchToRgb} from '../utils/space';
import {munsellToRgb} from '../utils/munsell';
import {colors as ittenColors} from './itten';

type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

const CARD_W = 260;
const CARD_H = 280;
const TIMELINE_W = 880;
const TIMELINE_H = 120;

const RAD = Math.PI / 180;

const hsv = (h: number, s: number, v: number): Vec3 => {
  const k = (n: number) => (n + h / 60) % 6;
  const f = (n: number) => v - v * s * Math.max(0, Math.min(k(n), 4 - k(n), 1));
  return [f(5), f(3), f(1)].map(x => Math.round(x * 255)) as Vec3;
};

const css = (rgb: Vec3): string => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

const mix = (a: Vec3, b: Vec3, t: number): Vec3 => {
  return a.map((v, i) => Math.round(v * (1 - t) + b[i] * t)) as Vec3;
};

const text = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, align: CanvasTextAlign = 'center', color = '#444') => {
  ctx.font = '11px sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
};

/** 圆环的一段，角度从正上方起顺时针计，单位度 */
const sector = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) => {
  const s = (a0 - 90) * RAD;
  const e = (a1 - 90) * RAD;
  ctx.beginPath();
  ctx.arc(cx, cy, r1, s, e);
  if (r0 > 0) {
    ctx.arc(cx, cy, r0, e, s, true);
  } else {
    ctx.lineTo(cx, cy);
  }
  ctx.closePath();
};

const ring = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r0: number, r1: number, list: Vec3[]) => {
  const step = 360 / list.length;
  list.forEach((rgb, i) => {
    sector(ctx, cx, cy, r0, r1, i * step - step / 2, i * step + step / 2 + 0.4);
    ctx.fillStyle = css(rgb);
    ctx.fill();
  });
};

const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  return [cx + r * Math.sin(deg * RAD), cy - r * Math.cos(deg * RAD)];
};

const NEWTON_NAMES = ['红', '橙', '黄', '绿', '蓝', '靛', '紫'];
const NEWTON_COLORS: Vec3[] = [
  [229, 57, 53], [251, 140, 0], [253, 216, 53], [67, 160, 71], [30, 136, 229], [57, 73, 171], [142, 36, 170]
];
// 多利亚调式八个音的弦长比 1, 8/9, 5/6, 3/4, 2/3, 3/5, 9/16, 1/2 的相邻差
const NEWTON_ARCS = [1 / 9, 1 / 18, 1 / 12, 1 / 12, 1 / 15, 3 / 80, 1 / 16];

const drawNewton: DrawFn = ctx => {
  const cx = 130;
  const cy = 128;
  const R = 84;
  const total = NEWTON_ARCS.reduce((a, b) => a + b, 0);
  let start = 0;
  const mids: number[] = [];
  NEWTON_ARCS.forEach((arc, i) => {
    const span = (arc / total) * 360;
    sector(ctx, cx, cy, 0, R, start, start + span);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, '#FFF');
    g.addColorStop(1, css(NEWTON_COLORS[i]));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1;
    ctx.stroke();
    const mid = start + span / 2;
    mids.push(mid);
    const [lx, ly] = polar(cx, cy, R + 15, mid);
    text(ctx, `${NEWTON_NAMES[i]} ${Math.round(span)}°`, lx, ly);
    start += span;
  });

  // 重心：红 2 份、黄 1 份、蓝 1 份
  const masses: [number, number][] = [[0, 2], [2, 1], [4, 1]];
  let mx = 0;
  let my = 0;
  let mt = 0;
  masses.forEach(([idx, m]) => {
    const [x, y] = polar(cx, cy, R * 0.75, mids[idx]);
    mx += x * m;
    my += y * m;
    mt += m;
    ctx.beginPath();
    ctx.arc(x, y, 3 + 3 * Math.sqrt(m), 0, 2 * Math.PI);
    ctx.fillStyle = css(NEWTON_COLORS[idx]);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.stroke();
  });
  mx /= mt;
  my /= mt;
  ctx.strokeStyle = '#222';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(mx, my);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(mx - 5, my - 5);
  ctx.lineTo(mx + 5, my + 5);
  ctx.moveTo(mx + 5, my - 5);
  ctx.lineTo(mx - 5, my + 5);
  ctx.stroke();
  text(ctx, '圆点大小 = 各色的量，× = 重心 = 混合色', cx, 252, 'center', '#666');
  text(ctx, '数字是各扇形的圆心角', cx, 268, 'center', '#999');
};

const GOETHE: {name: string; rgb: Vec3}[] = [
  {name: '红紫 Purpur', rgb: [194, 24, 91]},
  {name: '橙 Orange', rgb: [245, 124, 0]},
  {name: '黄 Gelb', rgb: [251, 192, 45]},
  {name: '绿 Grün', rgb: [46, 158, 79]},
  {name: '蓝 Blau', rgb: [30, 95, 208]},
  {name: '紫 Violett', rgb: [123, 63, 160]}
];

const drawGoethe: DrawFn = ctx => {
  const cx = 130;
  const cy = 128;
  GOETHE.forEach((item, i) => {
    sector(ctx, cx, cy, 34, 84, i * 60 - 30, i * 60 + 30);
    ctx.fillStyle = css(item.rgb);
    ctx.fill();
    const [lx, ly] = polar(cx, cy, 104, i * 60);
    text(ctx, item.name, lx, ly);
  });
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.setLineDash([3, 3]);
  [0, 60, 120].forEach(deg => {
    const [x1, y1] = polar(cx, cy, 34, deg);
    const [x2, y2] = polar(cx, cy, 34, deg + 180);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  text(ctx, '正对面互为补色', cx, 128, 'center', '#444');
  text(ctx, '红紫 ↔ 绿，橙 ↔ 蓝，黄 ↔ 紫', cx, 252, 'center', '#666');
  text(ctx, '色块为近似重建', cx, 268, 'center', '#999');
};

const drawRunge: DrawFn = ctx => {
  const cx = 130;
  const cy = 96;
  const R = 82;
  const image = ctx.createImageData(2 * R, 2 * R);
  for (let py = 0; py < 2 * R; py++) {
    for (let px = 0; px < 2 * R; px++) {
      const x = (px - R + 0.5) / R;
      const y = (R - py - 0.5) / R;
      const d2 = x * x + y * y;
      if (d2 > 1) {
        continue;
      }
      const z = Math.sqrt(1 - d2);
      const lat = Math.asin(y);
      const lon = (Math.atan2(x, z) / RAD + 360) % 360;
      const base = hsv(lon, 1, 1);
      const t = lat / (Math.PI / 2);
      const col = t > 0 ? mix(base, [255, 255, 255], t) : mix(base, [0, 0, 0], -t);
      const meridian = Math.abs(((lon + 15) % 30) - 15) < 0.9;
      const shade = 0.78 + 0.22 * z;
      const k = meridian ? 0.55 : shade;
      const i = (py * 2 * R + px) * 4;
      image.data[i] = col[0] * k;
      image.data[i + 1] = col[1] * k;
      image.data[i + 2] = col[2] * k;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, cx - R, cy - R);
  text(ctx, '白（北极）', cx, 8, 'center', '#666');
  text(ctx, '黑（南极）', cx, 196, 'center', '#666');

  const rx = 56;
  const ry = 238;
  ring(ctx, rx, ry, 17, 34, Array.from({length: 12}, (_, i) => hsv(i * 30, 1, 1)));
  text(ctx, '赤道：12 色相', 170, 228, 'left');
  text(ctx, '纯色在赤道，向两极', 170, 244, 'left', '#666');
  text(ctx, '分别掺白、掺黑', 170, 258, 'left', '#666');
  text(ctx, '色块为近似重建', 130, 274, 'center', '#999');
};

const drawChevreul: DrawFn = ctx => {
  const cx = 130;
  const cy = 128;
  ring(ctx, cx, cy, 56, 92, Array.from({length: 72}, (_, i) => hsv(i * 5, 1, 1)));
  const gray: Vec3 = [128, 128, 128];
  const pairs: [Vec3, number][] = [[[200, 40, 40], -22], [[40, 160, 70], 22]];
  pairs.forEach(([bg, dx]) => {
    ctx.fillStyle = css(bg);
    ctx.fillRect(cx + dx - 20, cy - 20, 40, 40);
    ctx.fillStyle = css(gray);
    ctx.fillRect(cx + dx - 7, cy - 7, 14, 14);
  });
  text(ctx, '72 个色相（12 色相 × 6 级明暗）', cx, 252, 'center', '#666');
  text(ctx, '中心：同样的灰在红、绿上看起来不同', cx, 268, 'center', '#999');
};

const MUNSELL_LABELS = ['R', 'YR', 'Y', 'GY', 'G', 'BG', 'B', 'PB', 'P', 'RP'];

const munsellColor = (i: number): Vec3 => {
  for (let chroma = 10; chroma >= 0; chroma -= 1) {
    const result = munsellToRgb(i * 4 + 1, 6, chroma);
    if (result.inGamut) {
      return result.rgb;
    }
  }
  return [128, 128, 128];
};

const drawMunsell: DrawFn = ctx => {
  const cx = 130;
  const cy = 128;
  ring(ctx, cx, cy, 36, 84, MUNSELL_LABELS.map((_, i) => munsellColor(i)));
  MUNSELL_LABELS.forEach((label, i) => {
    const [lx, ly] = polar(cx, cy, 100, i * 36);
    text(ctx, `5${label}`, lx, ly);
  });
  text(ctx, '10 个主色相（明度 6，彩度取各色相的最大值）', cx, 252, 'center', '#666');
  text(ctx, '近似重建，见“Munsell色立体切片”页', cx, 268, 'center', '#999');
};

const drawOstwald: DrawFn = ctx => {
  const cx = 130;
  const cy = 66;
  ring(ctx, cx, cy, 34, 58, Array.from({length: 24}, (_, i) => hsv((i * 15 + 60) % 360, 1, 1)));
  text(ctx, '24 色相', cx, cy, 'center', '#444');

  const full = hsv(60 + 15 * 10, 1, 1);
  const white: Vec3 = [255, 255, 255];
  const black: Vec3 = [0, 0, 0];
  const W = [56, 138];
  const B = [56, 250];
  const C = [214, 194];
  const n = 7;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n - i; j++) {
      const c = i / n;
      const b = j / n;
      const w = 1 - c - b;
      const rgb = [0, 1, 2].map(k => Math.round(white[k] * w + black[k] * b + full[k] * c)) as Vec3;
      const x = W[0] * w + B[0] * b + C[0] * c;
      const y = W[1] * w + B[1] * b + C[1] * c;
      ctx.fillStyle = css(rgb);
      ctx.beginPath();
      ctx.arc(x, y, 8.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.stroke();
    }
  }
  text(ctx, '白 W', W[0] + 6, W[1] - 16, 'left');
  text(ctx, '黑 B', B[0] + 6, B[1] + 14, 'left');
  text(ctx, '纯色 C', C[0] + 20, C[1] - 12, 'right');
  text(ctx, '双锥体 = 24 个这样的三角形绕黑白轴排开', cx, 270, 'center', '#999');
};

const drawItten: DrawFn = ctx => {
  const cx = 130;
  const cy = 128;
  ring(ctx, cx, cy, 0, 88, ittenColors.map(c => c.rgb() as Vec3));
  const prim = [0, 4, 8].map(i => ittenColors[i].rgb() as Vec3);
  prim.forEach((rgb, i) => {
    const [x, y] = polar(cx, cy, 52, i * 120 + 0);
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, 2 * Math.PI);
    ctx.fillStyle = css(rgb);
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  text(ctx, '12 色相，三原色为黄、红、蓝', cx, 252, 'center', '#666');
  text(ctx, '色值为近似，见“伊登十二色环”页', cx, 268, 'center', '#999');
};

const drawModern: DrawFn = ctx => {
  const cx = 130;
  const cy = 128;
  ring(ctx, cx, cy, 58, 92, Array.from({length: 36}, (_, i) => hsv(i * 10, 1, 1)));
  ring(ctx, cx, cy, 20, 54, Array.from({length: 36}, (_, i) => {
    const r = oklchToRgb([0.72, 0.13, (i * 10 + 30) % 360]);
    return r.rgb;
  }));
  text(ctx, '外圈 HSV，内圈 OKLCH（L = 0.72）', cx, 252, 'center', '#666');
  text(ctx, '内圈亮度一致，外圈黄最亮、蓝最暗', cx, 268, 'center', '#999');
};

const drawTimeline: DrawFn = (ctx, w, h) => {
  const y = 62;
  const x0 = 30;
  const x1 = w - 30;
  const pos = (year: number) => x0 + ((year - 1700) / 270) * (x1 - x0);
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  const events: [number, string, number][] = [
    [1704, '牛顿 1704', 0],
    [1810, '歌德 1810', 0],
    [1810, '龙格 1810', 1],
    [1839, '谢弗勒尔 1839', 0],
    [1905, '孟塞尔 约 1905', 0],
    [1916, '奥斯特瓦尔德 约 1916', 1],
    [1961, '伊登 约 1961', 0]
  ];
  events.forEach(([year, label, row]) => {
    const x = pos(year);
    ctx.fillStyle = '#4B98F8';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
    text(ctx, label, x, row ? y + 30 : y - 22);
  });
  [1700, 1750, 1800, 1850, 1900, 1950].forEach(year => text(ctx, `${year}`, pos(year), h - 10, 'center', '#999'));
};

export {
  CARD_W,
  CARD_H,
  TIMELINE_W,
  TIMELINE_H,
  drawNewton,
  drawGoethe,
  drawRunge,
  drawChevreul,
  drawMunsell,
  drawOstwald,
  drawItten,
  drawModern,
  drawTimeline
};
