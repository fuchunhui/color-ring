import {LinearImage, makePhotoScene} from '../utils/scene';
import {
  Algo,
  Mosaic,
  demosaic,
  encodeBytes,
  errorBytes,
  lowPass,
  makeCameraRaw,
  makeMosaic,
  makeStressImage,
  mosaicColorBytes,
  mosaicGrayBytes,
  bayerChannel,
  psnr
} from '../utils/sensor';

const WIDTH = 256;
const HEIGHT = 192;
const CROP_W = 32;
const CROP_H = 24;
const ZOOM = 8;
const ALGOS: Algo[] = ['nearest', 'bilinear', 'mhc'];
const ALGO_NAMES: Record<Algo, string> = {
  nearest: '最近邻（2×2 复制）',
  bilinear: '双线性插值',
  mhc: 'Malvar–He–Cutler（梯度校正）'
};

type SceneKey = 'photo' | 'stress';

interface Result {
  mosaic: Mosaic;
  colorBytes: Uint8ClampedArray;
  grayBytes: Uint8ClampedArray;
  demos: Record<Algo, Uint8ClampedArray>;
  errors: Record<Algo, Uint8ClampedArray>;
  psnr: Record<Algo, number>;
}

interface Camera {
  demosaiced: LinearImage;
  target: Uint8ClampedArray;
}

const sources: Partial<Record<SceneKey, LinearImage>> = {};
const sourceBytes: Partial<Record<SceneKey, Uint8ClampedArray>> = {};
const results = new Map<string, Result>();
let camera: Camera | null = null;

const getSource = (scene: SceneKey): LinearImage => {
  let img = sources[scene];
  if (!img) {
    img = scene === 'photo' ? makePhotoScene(WIDTH, HEIGHT).image : makeStressImage(WIDTH, HEIGHT);
    sources[scene] = img;
    sourceBytes[scene] = encodeBytes(img);
  }
  return img;
};

const getSourceBytes = (scene: SceneKey): Uint8ClampedArray => {
  getSource(scene);
  return sourceBytes[scene] as Uint8ClampedArray;
};

const getResult = (scene: SceneKey, olpf: boolean): Result => {
  const key = `${scene}-${olpf}`;
  const cached = results.get(key);
  if (cached) {
    return cached;
  }
  const img = getSource(scene);
  const ref = getSourceBytes(scene);
  const mosaic = makeMosaic(olpf ? lowPass(img) : img);
  const demos = {} as Record<Algo, Uint8ClampedArray>;
  const errors = {} as Record<Algo, Uint8ClampedArray>;
  const scores = {} as Record<Algo, number>;
  ALGOS.forEach(algo => {
    demos[algo] = encodeBytes(demosaic(mosaic, algo));
    errors[algo] = errorBytes(ref, demos[algo], 6);
    scores[algo] = psnr(ref, demos[algo]);
  });
  const result = {
    mosaic,
    colorBytes: mosaicColorBytes(mosaic),
    grayBytes: mosaicGrayBytes(mosaic),
    demos,
    errors,
    psnr: scores
  };
  results.set(key, result);
  return result;
};

const getCamera = (): Camera => {
  if (!camera) {
    const scene = getSource('photo');
    camera = {
      demosaiced: demosaic(makeMosaic(makeCameraRaw(scene)), 'mhc'),
      target: getSourceBytes('photo')
    };
  }
  return camera;
};

// ---------- 画布绘制 ----------

const putBytes = (ctx: CanvasRenderingContext2D, bytes: Uint8ClampedArray, w: number, h: number): void => {
  ctx.putImageData(new ImageData(bytes, w, h), 0, 0);
};

const clampCrop = (cx: number, cy: number, cw: number, ch: number): {x: number; y: number} => {
  return {
    x: Math.min(WIDTH - cw, Math.max(0, Math.round(cx - cw / 2))),
    y: Math.min(HEIGHT - ch, Math.max(0, Math.round(cy - ch / 2)))
  };
};

/** 取出 bytes 中的一块，用最近邻放大 */
const drawCrop = (
  ctx: CanvasRenderingContext2D,
  bytes: Uint8ClampedArray,
  crop: {x: number; y: number},
  cw: number,
  ch: number,
  zoom: number
): void => {
  const piece = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    const from = ((crop.y + y) * WIDTH + crop.x) * 4;
    piece.set(bytes.subarray(from, from + cw * 4), y * cw * 4);
  }
  const tmp = document.createElement('canvas');
  tmp.width = cw;
  tmp.height = ch;
  (tmp.getContext('2d') as CanvasRenderingContext2D).putImageData(new ImageData(piece, cw, ch), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, cw, ch, 0, 0, cw * zoom, ch * zoom);
};

const CHANNEL_COLORS = ['#E53935', '#43A047', '#1E66F5'];
const CHANNEL_NAMES = ['R', 'G', 'B'];

/** 4×4 像素的 RGGB 排列示意，粗线框出 2×2 的重复单元 */
const drawLayout = (ctx: CanvasRenderingContext2D): void => {
  const cell = 52;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const c = bayerChannel(x, y);
      ctx.fillStyle = CHANNEL_COLORS[c];
      ctx.fillRect(8 + x * cell, 8 + y * cell, cell - 2, cell - 2);
      ctx.fillStyle = '#FFF';
      ctx.fillText(CHANNEL_NAMES[c], 8 + x * cell + cell / 2 - 1, 8 + y * cell + cell / 2 - 1);
    }
  }
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 3;
  ctx.strokeRect(6.5, 6.5, cell * 2, cell * 2);
};

/** 原始 raw 数值（线性亮度 × 255）叠在灰度块上 */
const drawRawNumbers = (ctx: CanvasRenderingContext2D, mosaic: Mosaic, crop: {x: number; y: number}): void => {
  const cols = 16;
  const rows = 12;
  const cell = 16;
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const value = mosaic.data[(crop.y + y) * mosaic.width + crop.x + x];
      const shown = Math.min(255, Math.round(value * 255));
      const gray = Math.round(255 * Math.min(1, Math.pow(value, 1 / 2.2)));
      ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      ctx.fillRect(x * cell, y * cell, cell, cell);
      ctx.fillStyle = CHANNEL_COLORS[bayerChannel(crop.x + x, crop.y + y)];
      ctx.fillRect(x * cell, y * cell, 4, 4);
      ctx.fillStyle = gray > 128 ? '#000' : '#FFF';
      ctx.fillText(String(shown), x * cell + cell / 2 + 1, y * cell + cell / 2 + 2);
    }
  }
};

export {
  WIDTH,
  HEIGHT,
  CROP_W,
  CROP_H,
  ZOOM,
  ALGOS,
  ALGO_NAMES,
  SceneKey,
  getSource,
  getSourceBytes,
  getResult,
  getCamera,
  putBytes,
  clampCrop,
  drawCrop,
  drawLayout,
  drawRawNumbers
};
