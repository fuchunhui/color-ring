import {Vec3, oklchToRgb, rgbToXyz} from '../utils/space';
import {GAMUTS, D65, spectralLocus, xyzToXy} from '../utils/cie';
import {MapResult, clipMap, css4Map, oklchToXyz} from '../utils/gamut';

const C_MAX = 0.4;

const SLICE_W = 480;
const SLICE_H = 330;
const SLICE_LEFT = 44;
const SLICE_TOP = 10;
const SLICE_PW = SLICE_W - SLICE_LEFT - 12;
const SLICE_PH = SLICE_H - SLICE_TOP - 36;

const SWEEP_W = 480;
const SWEEP_H = 120;
const SWEEP_LEFT = 76;

const XY_W = 270;
const XY_H = 300;

const COLORS = {
  clip: '#E03131',
  chroma: '#1971C2',
  css4: '#2F9E44'
};

const css = (rgb: Vec3): string => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

type Results = {clip: MapResult; chroma: MapResult; css4: MapResult};

const drawPath = (ctx: CanvasRenderingContext2D, path: [number, number][], color: string) => {
  const px = (c: number) => SLICE_LEFT + c / C_MAX * SLICE_PW;
  const py = (l: number) => SLICE_TOP + (1 - l) * SLICE_PH;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  path.forEach(([c, l], i) => {
    if (i === 0) {
      ctx.moveTo(px(c), py(l));
    } else {
      ctx.lineTo(px(c), py(l));
    }
  });
  ctx.stroke();
  const [c, l] = path[path.length - 1];
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(px(c), py(l), 4, 0, 2 * Math.PI);
  ctx.fill();
};

const drawSlice = (ctx: CanvasRenderingContext2D, hue: number, target: Vec3, results: Results): void => {
  const image = ctx.createImageData(SLICE_PW, SLICE_PH);
  for (let y = 0; y < SLICE_PH; y++) {
    for (let x = 0; x < SLICE_PW; x++) {
      const c = x / (SLICE_PW - 1) * C_MAX;
      const l = 1 - y / (SLICE_PH - 1);
      const {rgb, inGamut} = oklchToRgb([l, c, hue]);
      const i = (y * SLICE_PW + x) * 4;
      let v: Vec3 = rgb;
      if (!inGamut) {
        const g = (x + y) % 8 < 2 ? 205 : 236;
        v = [g, g, g];
      }
      image.data[i] = v[0];
      image.data[i + 1] = v[1];
      image.data[i + 2] = v[2];
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, SLICE_LEFT, SLICE_TOP);

  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.strokeRect(SLICE_LEFT + 0.5, SLICE_TOP + 0.5, SLICE_PW, SLICE_PH);
  ctx.fillStyle = '#444';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 4; i++) {
    const x = SLICE_LEFT + i / 4 * SLICE_PW;
    ctx.fillText((C_MAX * i / 4).toFixed(2), x, SLICE_TOP + SLICE_PH + 4);
  }
  ctx.fillText('OKLCH 色度 C', SLICE_LEFT + SLICE_PW / 2, SLICE_TOP + SLICE_PH + 18);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 5; i++) {
    ctx.fillText((1 - i / 5).toFixed(1), SLICE_LEFT - 5, SLICE_TOP + i / 5 * SLICE_PH);
  }
  ctx.save();
  ctx.translate(12, SLICE_TOP + SLICE_PH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('亮度 L', 0, 0);
  ctx.restore();

  drawPath(ctx, results.chroma.path, COLORS.chroma);
  drawPath(ctx, results.css4.path, COLORS.css4);
  drawPath(ctx, results.clip.path, COLORS.clip);

  const tx = SLICE_LEFT + target[1] / C_MAX * SLICE_PW;
  const ty = SLICE_TOP + (1 - target[0]) * SLICE_PH;
  ctx.fillStyle = '#FFF';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(tx, ty, 5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();

  const legend: [string, string][] = [
    ['#000', '○ 原始颜色'],
    [COLORS.clip, '截断各通道'],
    [COLORS.chroma, '降低 CIE LCH 色度'],
    [COLORS.css4, 'CSS Color 4 映射']
  ];
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '12px sans-serif';
  legend.forEach(([color, text], i) => {
    const y = SLICE_TOP + SLICE_PH - 14 - (legend.length - 1 - i) * 17;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(SLICE_LEFT + SLICE_PW - 150, y - 8, 146, 16);
    ctx.fillStyle = color;
    ctx.fillText(text, SLICE_LEFT + SLICE_PW - 144, y);
  });
};

const drawSweep = (ctx: CanvasRenderingContext2D, lightness: number, hue: number): void => {
  const barW = SWEEP_W - SWEEP_LEFT - 24;
  const rows: [string, (lch: Vec3) => MapResult, number][] = [
    ['直接截断', clipMap, 8],
    ['CSS4 映射', css4Map, 52]
  ];
  rows.forEach(([name, fn, top]) => {
    for (let x = 0; x < barW; x++) {
      const c = x / (barW - 1) * C_MAX;
      ctx.fillStyle = css(fn([lightness, c, hue]).rgb);
      ctx.fillRect(SWEEP_LEFT + x, top, 1, 36);
    }
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, SWEEP_LEFT - 8, top + 18);
  });
  ctx.fillStyle = '#444';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 4; i++) {
    ctx.fillText((C_MAX * i / 4).toFixed(2), SWEEP_LEFT + i / 4 * (barW - 1), 94);
  }
  ctx.textAlign = 'left';
  ctx.fillText('C', 4, 94);
};

const XY_X_MAX = 0.8;
const XY_Y_MAX = 0.9;
const XY_PAD = 26;

const xyToPx = ([x, y]: [number, number]): [number, number] => [
  XY_PAD + x / XY_X_MAX * (XY_W - XY_PAD - 8),
  XY_H - XY_PAD - y / XY_Y_MAX * (XY_H - XY_PAD - 8)
];

const drawChromaticity = (ctx: CanvasRenderingContext2D, target: Vec3, results: Results): void => {
  const locus = spectralLocus(380, 700, 5);
  ctx.beginPath();
  locus.forEach((p, i) => {
    const [x, y] = xyToPx(p);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.closePath();
  ctx.fillStyle = '#F1F3F5';
  ctx.fill();
  ctx.strokeStyle = '#868E96';
  ctx.lineWidth = 1;
  ctx.stroke();

  GAMUTS.forEach(({points, color}) => {
    ctx.beginPath();
    points.forEach((p, i) => {
      const [x, y] = xyToPx(p);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  ctx.fillStyle = '#444';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 4; i++) {
    const [x, y] = xyToPx([i * 0.2, 0]);
    ctx.fillText((i * 0.2).toFixed(1), x, y + 4);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 1; i <= 4; i++) {
    const [x, y] = xyToPx([0, i * 0.2]);
    ctx.fillText((i * 0.2).toFixed(1), x - 4, y);
  }

  const mark = (xyz: Vec3, color: string, filled: boolean, r: number) => {
    const [x, y] = xyToPx(xyzToXy(xyz));
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    if (filled) {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.fillStyle = '#FFF';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };
  const [dx, dy] = xyToPx(D65);
  ctx.fillStyle = '#333';
  ctx.fillRect(dx - 2, dy - 2, 4, 4);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('D65', dx + 6, dy);

  mark(rgbToXyz(results.css4.rgb), COLORS.css4, true, 4);
  mark(rgbToXyz(results.chroma.rgb), COLORS.chroma, true, 4);
  mark(rgbToXyz(results.clip.rgb), COLORS.clip, true, 4);
  mark(oklchToXyz(target), '#000', false, 5);
};

export {
  SLICE_W,
  SLICE_H,
  SWEEP_W,
  SWEEP_H,
  XY_W,
  XY_H,
  COLORS,
  Results,
  drawSlice,
  drawSweep,
  drawChromaticity
};
