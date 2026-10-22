import {Vec3} from './space';

/**
 * APCA-W3 0.0.98G-4g（SAPC）对比度。
 * 返回有符号的 Lc：正值表示浅底深字，负值表示深底浅字，绝对值越大对比越强。
 */
const NORM_BG = 0.56;
const NORM_TXT = 0.57;
const REV_TXT = 0.62;
const REV_BG = 0.65;
const BLK_THRS = 0.022;
const BLK_CLMP = 1.414;
const SCALE = 1.14;
const LO_OFFSET = 0.027;
const DELTA_Y_MIN = 0.0005;
const LO_CLIP = 0.1;

/** APCA 使用简单的 2.4 次幂解码，而不是 sRGB 分段函数 */
const apcaY = (rgb: Vec3): number => {
  const [r, g, b] = rgb;
  return 0.2126729 * (r / 255) ** 2.4 + 0.7151522 * (g / 255) ** 2.4 + 0.0721750 * (b / 255) ** 2.4;
};

const clampBlack = (y: number): number => (y > BLK_THRS ? y : y + (BLK_THRS - y) ** BLK_CLMP);

const apcaContrast = (text: Vec3, background: Vec3): number => {
  const txt = clampBlack(apcaY(text));
  const bg = clampBlack(apcaY(background));
  if (Math.abs(bg - txt) < DELTA_Y_MIN) {
    return 0;
  }
  if (bg > txt) {
    const sapc = (bg ** NORM_BG - txt ** NORM_TXT) * SCALE;
    return (sapc < LO_CLIP ? 0 : sapc - LO_OFFSET) * 100;
  }
  const sapc = (bg ** REV_BG - txt ** REV_TXT) * SCALE;
  return (sapc > -LO_CLIP ? 0 : sapc + LO_OFFSET) * 100;
};

export {
  apcaY,
  apcaContrast
};
