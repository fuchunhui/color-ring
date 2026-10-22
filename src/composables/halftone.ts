interface Plate {
  key: string;
  label: string;
  ink: string;
  angle: number;
}

const PLATES: Plate[] = [
  {key: 'c', label: '青版 C', ink: '#00FFFF', angle: 15},
  {key: 'm', label: '品红版 M', ink: '#FF00FF', angle: 75},
  {key: 'y', label: '黄版 Y', ink: '#FFFF00', angle: 0},
  {key: 'k', label: '黑版 K', ink: '#000000', angle: 45}
];

const SAME_ANGLE = 45;

const planeCache = new WeakMap<ImageData, Float32Array[]>();

/** 朴素 RGB->CMYK：k=1-max，c、m、y=(max-分量)/max；半透明像素按白底合成。返回 C、M、Y、K 四张覆盖率图（0~1） */
const makePlanes = (src: ImageData): Float32Array[] => {
  const cached = planeCache.get(src);
  if (cached) {
    return cached;
  }
  const count = src.width * src.height;
  const planes = PLATES.map(() => new Float32Array(count));
  for (let p = 0; p < count; p++) {
    const a = src.data[p * 4 + 3] / 255;
    const [r, g, b] = [0, 1, 2].map(i => (src.data[p * 4 + i] * a + 255 * (1 - a)) / 255);
    const max = Math.max(r, g, b);
    planes[3][p] = 1 - max;
    if (max > 0) {
      planes[0][p] = (max - r) / max;
      planes[1][p] = (max - g) / max;
      planes[2][p] = (max - b) / max;
    }
  }
  planeCache.set(src, planes);
  return planes;
};

const sampleCoverage = (plane: Float32Array, width: number, height: number, x: number, y: number, cell: number): number => {
  const offsets = [-cell / 3, 0, cell / 3];
  let sum = 0;
  offsets.forEach(dy => {
    offsets.forEach(dx => {
      const sx = Math.min(width - 1, Math.max(0, Math.round(x + dx)));
      const sy = Math.min(height - 1, Math.max(0, Math.round(y + dy)));
      sum += plane[sy * width + sx];
    });
  });
  return sum / 9;
};

/** 在旋转 angle 度的网格上，按覆盖率画出圆形网点 */
const drawDots = (
  ctx: CanvasRenderingContext2D,
  plane: Float32Array,
  width: number,
  height: number,
  cell: number,
  angle: number,
  ink: string
): void => {
  const rad = angle * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = width / 2;
  const cy = height / 2;
  const n = Math.ceil(Math.hypot(width, height) / cell / 2) + 1;

  ctx.fillStyle = ink;
  ctx.beginPath();
  for (let j = -n; j <= n; j++) {
    for (let i = -n; i <= n; i++) {
      const u = i * cell;
      const v = j * cell;
      const x = cx + u * cos - v * sin;
      const y = cy + u * sin + v * cos;
      if (x < -cell || y < -cell || x > width + cell || y > height + cell) {
        continue;
      }
      const coverage = sampleCoverage(plane, width, height, x, y, cell);
      if (coverage < 0.002) {
        continue;
      }
      const r = cell * Math.SQRT1_2 * Math.sqrt(coverage);
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, 2 * Math.PI);
    }
  }
  ctx.fill();
};

const fillWhite = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
};

/** 单独一张网版：墨色网点画在白纸上 */
const drawPlate = (
  ctx: CanvasRenderingContext2D,
  src: ImageData,
  index: number,
  cell: number,
  sameAngle: boolean
): void => {
  const {width, height} = src;
  const plate = PLATES[index];
  fillWhite(ctx, width, height);
  drawDots(ctx, makePlanes(src)[index], width, height, cell, sameAngle ? SAME_ANGLE : plate.angle, plate.ink);
};

/** 叠印：各版用 multiply 叠在白纸上，模拟减色混合 */
const drawOverprint = (
  ctx: CanvasRenderingContext2D,
  src: ImageData,
  cell: number,
  enabled: boolean[],
  sameAngle: boolean
): void => {
  const {width, height} = src;
  const planes = makePlanes(src);
  fillWhite(ctx, width, height);
  ctx.globalCompositeOperation = 'multiply';
  PLATES.forEach((plate, index) => {
    if (enabled[index]) {
      drawDots(ctx, planes[index], width, height, cell, sameAngle ? SAME_ANGLE : plate.angle, plate.ink);
    }
  });
  ctx.globalCompositeOperation = 'source-over';
};

export {
  PLATES,
  drawPlate,
  drawOverprint
};
