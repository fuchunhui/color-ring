import {DrawFn, text} from '../utils/spectral';
import {FOVEOLA_RADIUS, mainScene, bandScene, gratingScene, renderScene, sceneToBytes} from '../utils/conemosaic';
import type {Scene, Simulation} from '../utils/conemosaic';

const MAIN_SIZE = 240;
const MAIN_PPA = 10;
const GRATING_SIZE = 192;
const GRATING_PPA = 16;
const GRATING_ECCS = [0, 2, 5, 10];

const CLASS_COLORS = ['#E5533D', '#3FB950', '#5B7CFF'];

let main: Scene | null = null;
let bands: Scene | null = null;
const gratings = new Map<number, Scene>();

const getMainScene = (): Scene => {
  if (!main) {
    main = renderScene(mainScene, MAIN_SIZE, MAIN_PPA);
  }
  return main;
};

const getBandScene = (): Scene => {
  if (!bands) {
    bands = renderScene(bandScene, MAIN_SIZE, MAIN_PPA);
  }
  return bands;
};

const getGratingScene = (period: number): Scene => {
  const key = Math.round(period * 100);
  let scene = gratings.get(key);
  if (!scene) {
    scene = renderScene(gratingScene(period), GRATING_SIZE, GRATING_PPA, 4);
    gratings.set(key, scene);
    if (gratings.size > 12) {
      gratings.delete(gratings.keys().next().value as number);
    }
  }
  return scene;
};

const putBytes = (ctx: CanvasRenderingContext2D, bytes: Uint8ClampedArray, size: number): void => {
  ctx.putImageData(new ImageData(bytes, size, size), 0, 0);
};

const drawSceneBytes = (scene: () => Scene): DrawFn => ctx => {
  const s = scene();
  putBytes(ctx, sceneToBytes(s), s.size);
};

const drawResult = (sim: () => Simulation, size: number): DrawFn => ctx => {
  putBytes(ctx, sim().bytes, size);
};

const drawMosaic = (sim: () => Simulation, ecc: () => number, hole: () => boolean): DrawFn => (ctx, w, h) => {
  const {mosaic} = sim();
  const ppa = w / mosaic.width;
  ctx.fillStyle = '#16161C';
  ctx.fillRect(0, 0, w, h);

  const rodR = Math.max(1.1, 0.14 * mosaic.spacing * ppa);
  ctx.fillStyle = '#8F959C';
  for (let i = 0; i < mosaic.rodX.length; i++) {
    ctx.beginPath();
    ctx.arc(mosaic.rodX[i] * ppa, mosaic.rodY[i] * ppa, rodR, 0, 2 * Math.PI);
    ctx.fill();
  }
  const coneR = 0.42 * mosaic.spacing * ppa;
  for (let i = 0; i < mosaic.cls.length; i++) {
    ctx.fillStyle = CLASS_COLORS[mosaic.cls[i]];
    ctx.beginPath();
    ctx.arc(mosaic.xs[i] * ppa, mosaic.ys[i] * ppa, coneR, 0, 2 * Math.PI);
    ctx.fill();
  }

  if (hole()) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(mosaic.fixX * ppa, mosaic.fixY * ppa, FOVEOLA_RADIUS * ppa, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }
  const fx = mosaic.fixX * ppa;
  const fy = mosaic.fixY * ppa;
  if (fx >= 0 && fx <= w) {
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(fx - 6, fy);
    ctx.lineTo(fx + 6, fy);
    ctx.moveTo(fx, fy - 6);
    ctx.lineTo(fx, fy + 6);
    ctx.stroke();
  } else {
    text(ctx, `← 注视点在左侧 ${ecc().toFixed(1)}°`, 8, h - 12, 'left', '#FFF', '11px sans-serif');
  }
};

export {
  MAIN_SIZE,
  MAIN_PPA,
  GRATING_SIZE,
  GRATING_PPA,
  GRATING_ECCS,
  CLASS_COLORS,
  getMainScene,
  getBandScene,
  getGratingScene,
  drawSceneBytes,
  drawResult,
  drawMosaic
};
