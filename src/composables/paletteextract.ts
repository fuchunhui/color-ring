import type {Vec3} from '../utils/space';
import type {DrawFn} from '../utils/spectral';
import {W, H, getScene} from '../utils/paletteextract';

const sceneDrawer = (key: () => string): DrawFn => ctx => {
  ctx.putImageData(new ImageData(getScene(key()).rgba, W, H), 0, 0);
};

const bytesDrawer = (bytes: Uint8ClampedArray): DrawFn => ctx => {
  ctx.putImageData(new ImageData(bytes, W, H), 0, 0);
};

const css = (c: Vec3): string => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

const hexOf = (c: Vec3): string => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();

const percent = (v: number, digits = 1): string => `${(v * 100).toFixed(digits)}%`;

export {
  W as PE_W,
  H as PE_H,
  sceneDrawer,
  bytesDrawer,
  css,
  hexOf,
  percent
};
