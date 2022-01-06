const createInterlace = (size: number, color1: string, color2: string): string => {
  const canvas = document.createElement('canvas') as HTMLCanvasElement;
  canvas.width = size * 2;
  canvas.height = size * 2;

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = color1;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = color2;
  ctx.fillRect(size, 0, size, size);
  ctx.fillStyle = color2;
  ctx.fillRect(0, size, size, size);
  ctx.fillStyle = color1;
  ctx.fillRect(size, size, size, size);

  ctx.createPattern(canvas, 'repeat');
  return canvas.toDataURL();
};

export {
  createInterlace
};
