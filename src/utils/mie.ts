/**
 * 均匀球的 Mie 散射效率，Bohren & Huffman 的 BHMIE 算法（复折射率 m，尺寸参数 x）。
 * 返回消光效率 Qext、散射效率 Qsca 和不对称因子 g。
 */
interface MieResult {
  qext: number;
  qsca: number;
  g: number;
}

type Complex = [number, number];

const cmul = (a: Complex, b: Complex): Complex => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a: Complex, b: Complex): Complex => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
const cadd = (a: Complex, b: Complex): Complex => [a[0] + b[0], a[1] + b[1]];
const csub = (a: Complex, b: Complex): Complex => [a[0] - b[0], a[1] - b[1]];
const cscale = (a: Complex, s: number): Complex => [a[0] * s, a[1] * s];
const cabs2 = (a: Complex): number => a[0] * a[0] + a[1] * a[1];
const crealMul = (a: Complex, b: Complex): number => a[0] * b[0] + a[1] * b[1]; // Re(a · conj(b))

const mie = (mRe: number, mIm: number, x: number): MieResult => {
  const m: Complex = [mRe, mIm];
  const y: Complex = cscale(m, x);
  const ymod = Math.hypot(y[0], y[1]);
  const xstop = x + 4 * Math.cbrt(x) + 2;
  const nstop = Math.floor(xstop);
  const nmx = Math.floor(Math.max(xstop, ymod) + 15);

  const d: Complex[] = new Array(nmx + 1).fill(null).map(() => [0, 0] as Complex);
  for (let n = nmx; n >= 1; n--) {
    const inv: Complex = cdiv([n, 0], y);
    d[n - 1] = csub(inv, cdiv([1, 0], cadd(d[n], inv)));
  }

  let psi0 = Math.cos(x);
  let psi1 = Math.sin(x);
  let chi0 = -Math.sin(x);
  let chi1 = Math.cos(x);
  let xi1: Complex = [psi1, -chi1];
  let sumSca = 0;
  let sumExt = 0;
  let sumG = 0;
  let an1: Complex = [0, 0];
  let bn1: Complex = [0, 0];

  for (let n = 1; n <= nstop; n++) {
    const psi = (2 * n - 1) / x * psi1 - psi0;
    const chi = (2 * n - 1) / x * chi1 - chi0;
    const xi: Complex = [psi, -chi];
    const dn = d[n];
    const t: Complex = cadd(cdiv(dn, m), [n / x, 0]);
    const an = cdiv(csub(cscale(t, psi), [psi1, 0]), csub(cmul(t, xi), xi1));
    const u: Complex = cadd(cmul(dn, m), [n / x, 0]);
    const bn = cdiv(csub(cscale(u, psi), [psi1, 0]), csub(cmul(u, xi), xi1));

    sumSca += (2 * n + 1) * (cabs2(an) + cabs2(bn));
    sumExt += (2 * n + 1) * (an[0] + bn[0]);
    if (n > 1) {
      sumG += (n - 1) * (n + 1) / n * (crealMul(an1, an) + crealMul(bn1, bn))
        + (2 * n - 1) / ((n - 1) * n) * crealMul(an1, bn1);
    }
    an1 = an;
    bn1 = bn;

    psi0 = psi1;
    psi1 = psi;
    chi0 = chi1;
    chi1 = chi;
    xi1 = [psi1, -chi1];
  }

  const qsca = 2 / (x * x) * sumSca;
  const qext = 2 / (x * x) * sumExt;
  return {qext, qsca, g: qsca > 0 ? 4 / (x * x) * sumG / qsca : 0};
};

export type {MieResult};
export {mie};
