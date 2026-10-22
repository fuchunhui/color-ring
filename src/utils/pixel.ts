/**
 * 读取画布上某个像素的颜色。半透明像素按白色背景合成，返回肉眼实际看到的 #RRGGBB。
 */
const pickHex = (ctx: CanvasRenderingContext2D, x: number, y: number): string => {
  const {0: r, 1: g, 2: b, 3: a} = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
  const flatten = (c: number) => c * a / 255 + 255 * (1 - a / 255);
  const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${hex(flatten(r))}${hex(flatten(g))}${hex(flatten(b))}`.toUpperCase();
};

export {
  pickHex
};
