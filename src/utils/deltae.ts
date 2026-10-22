import {Vec3} from './space';

const RAD = Math.PI / 180;

const deltaE76 = (lab1: Vec3, lab2: Vec3): number => {
  return Math.hypot(lab1[0] - lab2[0], lab1[1] - lab2[1], lab1[2] - lab2[2]);
};

/** CIE94，图形艺术参数：kL = kC = kH = 1，K1 = 0.045，K2 = 0.015 */
const deltaE94 = (lab1: Vec3, lab2: Vec3): number => {
  const [l1, a1, b1] = lab1;
  const [l2, a2, b2] = lab2;
  const c1 = Math.hypot(a1, b1);
  const c2 = Math.hypot(a2, b2);
  const dL = l1 - l2;
  const dC = c1 - c2;
  const dH2 = Math.max(0, (a1 - a2) ** 2 + (b1 - b2) ** 2 - dC ** 2);
  const sC = 1 + 0.045 * c1;
  const sH = 1 + 0.015 * c1;
  return Math.sqrt(dL ** 2 + (dC / sC) ** 2 + dH2 / sH ** 2);
};

const hueAngle = (b: number, ap: number): number => {
  if (b === 0 && ap === 0) {
    return 0;
  }
  const h = Math.atan2(b, ap) / RAD;
  return h < 0 ? h + 360 : h;
};

/** CIEDE2000（Sharma 等 2005 的实现），kL = kC = kH = 1 */
const deltaE2000 = (lab1: Vec3, lab2: Vec3): number => {
  const [l1, a1, b1] = lab1;
  const [l2, a2, b2] = lab2;
  const c1 = Math.hypot(a1, b1);
  const c2 = Math.hypot(a2, b2);
  const cBar7 = ((c1 + c2) / 2) ** 7;
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + 25 ** 7)));
  const a1p = (1 + g) * a1;
  const a2p = (1 + g) * a2;
  const c1p = Math.hypot(a1p, b1);
  const c2p = Math.hypot(a2p, b2);
  const h1p = hueAngle(b1, a1p);
  const h2p = hueAngle(b2, a2p);

  const dLp = l2 - l1;
  const dCp = c2p - c1p;
  const cProduct = c1p * c2p;
  let dhp = 0;
  if (cProduct !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) {
      dhp -= 360;
    } else if (dhp < -180) {
      dhp += 360;
    }
  }
  const dHp = 2 * Math.sqrt(cProduct) * Math.sin(dhp * RAD / 2);

  const lBar = (l1 + l2) / 2;
  const cBarP = (c1p + c2p) / 2;
  let hBarP = h1p + h2p;
  if (cProduct !== 0) {
    if (Math.abs(h1p - h2p) <= 180) {
      hBarP = (h1p + h2p) / 2;
    } else if (h1p + h2p < 360) {
      hBarP = (h1p + h2p + 360) / 2;
    } else {
      hBarP = (h1p + h2p - 360) / 2;
    }
  }

  const t = 1
    - 0.17 * Math.cos((hBarP - 30) * RAD)
    + 0.24 * Math.cos(2 * hBarP * RAD)
    + 0.32 * Math.cos((3 * hBarP + 6) * RAD)
    - 0.20 * Math.cos((4 * hBarP - 63) * RAD);
  const dTheta = 30 * Math.exp(-(((hBarP - 275) / 25) ** 2));
  const rC = 2 * Math.sqrt(cBarP ** 7 / (cBarP ** 7 + 25 ** 7));
  const sL = 1 + 0.015 * (lBar - 50) ** 2 / Math.sqrt(20 + (lBar - 50) ** 2);
  const sC = 1 + 0.045 * cBarP;
  const sH = 1 + 0.015 * cBarP * t;
  const rT = -Math.sin(2 * dTheta * RAD) * rC;

  const termL = dLp / sL;
  const termC = dCp / sC;
  const termH = dHp / sH;
  return Math.sqrt(termL ** 2 + termC ** 2 + termH ** 2 + rT * termC * termH);
};

export {
  deltaE76,
  deltaE94,
  deltaE2000
};
