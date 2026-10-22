import {hsl} from '../utils/color';
import {Vec3, linearToSrgb, relativeLuminance, contrastRatio} from '../utils/space';
import {DrawFn, css, gray} from './gamma';

type GrayFn = (rgb: Vec3) => number;

interface GrayMethod {
  key: string;
  title: string;
  fn: GrayFn;
}

const GRAY_METHODS: GrayMethod[] = [
  {key: 'avg', title: '平均值 (R+G+B)/3', fn: ([r, g, b]) => (r + g + b) / 3},
  {key: '601', title: 'Rec.601 加权（编码值）', fn: ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b},
  {key: '709', title: 'Rec.709 加权（编码值）', fn: ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b},
  {key: 'lin', title: '线性光亮度（再编码）', fn: rgb => linearToSrgb(relativeLuminance(rgb)) * 255}
];

const PRIMARIES: [string, Vec3][] = [
  ['红', [255, 0, 0]],
  ['黄', [255, 255, 0]],
  ['绿', [0, 255, 0]],
  ['青', [0, 255, 255]],
  ['蓝', [0, 0, 255]],
  ['品红', [255, 0, 255]]
];

const TEST_W = 360;
const TEST_H = 140;

/** 测试图：上方色相渐变，中间六个纯色块，底部文字条；传入 fn 时转换成灰度 */
const drawTestImage = (ctx: CanvasRenderingContext2D, w: number, fn?: GrayFn): void => {
  const paint = (rgb: Vec3) => css(fn ? gray(fn(rgb)) : rgb);
  for (let x = 0; x < w; x++) {
    const c = hsl(x / w * 360, 1, 0.5);
    ctx.fillStyle = paint(c.rgb().map(Math.round) as Vec3);
    ctx.fillRect(x, 0, 1, 56);
  }
  const sw = w / PRIMARIES.length;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  PRIMARIES.forEach(([name, rgb], i) => {
    ctx.fillStyle = paint(rgb);
    ctx.fillRect(i * sw, 56, sw, 60);
    ctx.fillStyle = '#333';
    ctx.fillText(name, i * sw + sw / 2, 132);
  });
};

const originalImage: DrawFn = (ctx, w) => drawTestImage(ctx, w);

const grayImage = (fn: GrayFn): DrawFn => (ctx, w) => drawTestImage(ctx, w, fn);

const grayTable = GRAY_METHODS.map(({title, fn}) => ({
  title,
  values: [[255, 0, 0], [0, 255, 0], [0, 0, 255]].map(rgb => Math.round(fn(rgb as Vec3)))
}));

const hexToRgb = (value: string): Vec3 => {
  const n = parseInt(value.slice(1), 16);
  return [Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256];
};

/** 对比度向下保留两位小数，避免 4.499 被四舍五入成 4.50 而误判达标 */
const formatRatio = (ratio: number): string => (Math.floor(ratio * 100) / 100).toFixed(2);

const WCAG_LEVELS = [
  {label: 'AA 正文', min: 4.5},
  {label: 'AA 大字', min: 3},
  {label: 'AAA 正文', min: 7},
  {label: 'AAA 大字', min: 4.5}
];

const ratioOf = (fg: string, bg: string): number => contrastRatio(hexToRgb(fg), hexToRgb(bg));

/** 在黑、白字色中选对比度更高的一个 */
const bestText = (bg: Vec3): {color: string; black: number; white: number} => {
  const black = contrastRatio(bg, [0, 0, 0]);
  const white = contrastRatio(bg, [255, 255, 255]);
  return {color: white > black ? '#FFFFFF' : '#000000', black, white};
};

export {
  TEST_W,
  TEST_H,
  GRAY_METHODS,
  WCAG_LEVELS,
  grayTable,
  originalImage,
  grayImage,
  hexToRgb,
  formatRatio,
  ratioOf,
  bestText
};
