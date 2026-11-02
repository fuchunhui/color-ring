import type {Vec3} from '../utils/space';
import {
  SCENE_W,
  SCENE_H,
  makeScene,
  transferReinhard,
  transferRgb,
  transferSpace,
  reinhardClipShare,
  labStats,
  rgbCorrelations,
  labCorrelations
} from '../utils/colortransfer';
import type {Img, Space} from '../utils/colortransfer';

type DrawFn = (ctx: CanvasRenderingContext2D) => void;

const drawImg = (img: Img): DrawFn => ctx => {
  ctx.putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
};

const fmt = (v: number, digits = 3): string => v.toFixed(digits);

const SPACE_NAMES: Record<Space, string> = {lab: 'CIELAB', oklab: 'OKLab'};

// ---------- 失效案例：固定的源图与参考图 ----------

const FAIL_SRC = 'forest';
const FAIL_REF = 'ocean';

interface FailCase {
  src: Img;
  ref: Img;
  reinhard: Img;
  rgb: Img;
  lab: Img;
  oklab: Img;
  clipShare: number;
}

let failCache: FailCase | null = null;

const failCase = (): FailCase => {
  if (!failCache) {
    const src = makeScene(FAIL_SRC);
    const ref = makeScene(FAIL_REF);
    failCache = {
      src,
      ref,
      reinhard: transferReinhard(src, ref),
      rgb: transferRgb(src, ref),
      lab: transferSpace(src, ref, 'lab'),
      oklab: transferSpace(src, ref, 'oklab'),
      clipShare: reinhardClipShare(src, ref)
    };
  }
  return failCache;
};

// ---------- 表格数据 ----------

interface StatRow {
  label: string;
  cells: string[];
}

const statRow = (label: string, img: Img): StatRow => {
  const {mean, std} = labStats(img);
  return {label, cells: [0, 1, 2].flatMap(k => [fmt(mean[k]), fmt(std[k])])};
};

const corrRow = (label: string, img: Img): StatRow => {
  const rgb: Vec3 = rgbCorrelations(img);
  const lab: Vec3 = labCorrelations(img);
  return {label, cells: [...rgb, ...lab].map(v => fmt(v, 2))};
};

export {
  SCENE_W,
  SCENE_H,
  SPACE_NAMES,
  FAIL_SRC,
  FAIL_REF,
  drawImg,
  failCase,
  statRow,
  corrRow
};
