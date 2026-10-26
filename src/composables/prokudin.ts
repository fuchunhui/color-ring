import {linearToSrgb} from '../utils/space';
import {FILTERS, WIDTH, HEIGHT, makeExposure, toPlate, plateBytes} from '../utils/separation';

type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

// 三次曝光：红、绿、蓝底片分别在 t = 0, 1, 2 时拍摄
const exposures = [0, 1, 2].map(makeExposure);
const plateR = toPlate(exposures[0], FILTERS[0]);
const plateG = toPlate(exposures[1], FILTERS[1]);
const plateB = toPlate(exposures[2], FILTERS[2]);
const bytesR = plateBytes(plateR);
const bytesG = plateBytes(plateG);
const bytesB = plateBytes(plateB);

/** 所有滤光片都在同一瞬间曝光时的理想结果（没有运动带来的彩边） */
const simultaneous = [0, 1, 2].map(i => toPlate(exposures[0], FILTERS[i]));

// ---------- Maxwell 三角形 ----------

const TRI_W = 360;
const TRI_H = 330;
const VERTICES = [
  [180, 28],
  [28, 290],
  [332, 290]
];
const TRI_COLORS = ['#E53935', '#43A047', '#1E88E5'];
const TRI_NAMES = ['R 红', 'G 绿', 'B 蓝'];

/** 点 (x, y) 相对三个顶点的重心坐标，在三角形外返回 null */
const barycentric = (x: number, y: number): number[] | null => {
  const [[x1, y1], [x2, y2], [x3, y3]] = VERTICES;
  const det = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
  const wr = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / det;
  const wg = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / det;
  const wb = 1 - wr - wg;
  if (wr < 0 || wg < 0 || wb < 0) {
    return null;
  }
  return [wr, wg, wb];
};

/** 三种光按权重混合（线性光），再以最亮通道为 1 归一化，只看“色”不看“量”，返回 sRGB 字节 */
const maxwellColor = (w: number[]): number[] => {
  const max = Math.max(...w);
  return w.map(v => Math.round(Math.min(1, Math.max(0, linearToSrgb(v / max))) * 255));
};

const drawTriangle = (marker: number[] | null): DrawFn => ctx => {
  const img = ctx.createImageData(TRI_W, TRI_H);
  for (let y = 0; y < TRI_H; y++) {
    for (let x = 0; x < TRI_W; x++) {
      const w = barycentric(x, y);
      if (w) {
        const c = maxwellColor(w);
        const i = (y * TRI_W + x) * 4;
        img.data[i] = c[0];
        img.data[i + 1] = c[1];
        img.data[i + 2] = c[2];
        img.data[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  VERTICES.forEach(([x, y], i) => {
    ctx.fillStyle = TRI_COLORS[i];
    ctx.fillText(TRI_NAMES[i], x, i === 0 ? y - 8 : y + 18);
  });
  if (marker) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(marker[0], marker[1], 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(marker[0], marker[1], 8, 0, Math.PI * 2);
    ctx.stroke();
  }
};

// ---------- 位图绘制 ----------

const putBytes = (ctx: CanvasRenderingContext2D, bytes: Uint8ClampedArray, scale = 1): void => {
  const tmp = document.createElement('canvas');
  tmp.width = WIDTH;
  tmp.height = HEIGHT;
  (tmp.getContext('2d') as CanvasRenderingContext2D).putImageData(new ImageData(bytes, WIDTH, HEIGHT), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, WIDTH * scale, HEIGHT * scale);
};

interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 放大 scale 倍显示图像中的一块区域 */
const putCrop = (ctx: CanvasRenderingContext2D, bytes: Uint8ClampedArray, box: CropBox, scale: number): void => {
  const tmp = document.createElement('canvas');
  tmp.width = WIDTH;
  tmp.height = HEIGHT;
  (tmp.getContext('2d') as CanvasRenderingContext2D).putImageData(new ImageData(bytes, WIDTH, HEIGHT), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, box.x, box.y, box.w, box.h, 0, 0, box.w * scale, box.h * scale);
};

const CROP_PERSON: CropBox = {x: 36, y: 126, w: 90, h: 58};
const CROP_FLAG: CropBox = {x: 196, y: 22, w: 60, h: 44};

export {
  DrawFn,
  CropBox,
  WIDTH,
  HEIGHT,
  TRI_W,
  TRI_H,
  VERTICES,
  CROP_PERSON,
  CROP_FLAG,
  plateR,
  plateG,
  plateB,
  bytesR,
  bytesG,
  bytesB,
  simultaneous,
  barycentric,
  maxwellColor,
  drawTriangle,
  putBytes,
  putCrop
};
