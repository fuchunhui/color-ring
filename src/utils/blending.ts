/**
 * @file Compositing and Blending
 * 
 * the algorithms of Porter Duff compositing and blending
 * 算法详见： https://www.w3.org/TR/compositing-1/
 * 
 * 混合后的像素a值：
 *  αo = αs + αb x (1 – αs)
 * 混合函数定义为：
 *  Cm = B(Cb, Cs)
 * 
 * simple alpha compositing:
 *  co = cs + cb x (1 - αs)
 * written as non-premultiplied:
 *  αo x Co = αs x Cs + (1 - αs) x αb x Cb
 * now substitute the result of blending for Cs:
 *  αo x Co = αs x ((1 - αb) x Cs + αb x B(Cb, Cs)) + (1 - αs) x αb x Cb
 *          = αs x (1 - αb) x Cs + αs x αb x B(Cb, Cs) + (1 - αs) x αb x Cb
 *          = αs x Cs - αb x αs x Cs + αs x αb x Cm + αb x Cb - αs x αb x Cb
 *          = αs x Cs + αb x (Cb - αs x Cs + αs x Cm - αs x Cb)
 *          = αs x Cs + αb x (Cb - αs x (Cb + Cs - Cm)
 * 即:
 *  Co = (as * Cs + ab * (Cb - as * (Cb + Cs - Cm))) / ao
 */

import Color from "../base/color";

const blending = (cm: string, source: Color, backdrop: Color): Color => {
  const r = [];
  const as = source.alpha();
  const ab = backdrop.alpha();

  const ao = as + ab * (1 - as);
  let Co = 0;
  for (let i = 0; i < 3; i++) {
    const Cs = source.rgb()[i] / 255;
    const Cb = backdrop.rgb()[i] / 255;
    const Cr = colorMethod[cm](Cb, Cs);
    if (ao) {
      Co = (as * Cs + ab * (Cb - as * (Cb + Cs - Cr))) / ao;
    }
    r[i] = parseInt(`${Co * 255}`, 10);
  }
  
  return new Color(r, ao);
};

const colorMethod: Record<string, (Cb: number, Cs: number) => number> = {
  normal: (Cb: number, Cs: number) => {
    return Cs;
  },
  multiply: (Cb: number, Cs: number) => {
    return Cb * Cs;
  },
  screen: (Cb: number, Cs: number) => {
    return Cb + Cs - Cb * Cs; // 1 - (1 - Cb) * (1 - Cs)
  },
  overlay: (Cb: number, Cs: number) => {
    return colorMethod.hardlight(Cs, Cb);
  },
  darken: (Cb: number, Cs: number) => {
    return Math.min(Cb, Cs);
  },
  lighten: (Cb: number, Cs: number) => {
    return Math.max(Cb, Cs);
  },
  colordodge: (Cb: number, Cs: number) => {
    if (Cb === 0) {
      return 0;
    } else if (Cs === 1) {
      return 1;
    } else {
      return Math.min(1, Cb / (1 - Cs));
    }
  },
  colorburn: (Cb: number, Cs: number) => {
    if (Cb === 1) {
      return 1;
    } else if (Cs === 0) {
      return 0;
    } else {
      return 1- Math.min(1, (1 - Cb) / Cs);
    }
  },
  hardlight: (Cb: number, Cs: number) => {
    if (Cs <= 0.5) {
      return colorMethod.multiply(Cb, 2 * Cs);
    } else {
      return colorMethod.screen(Cb, 2 * Cs - 1);
    }
  },
  softlight: (Cb: number, Cs: number) => {
    if (Cs <= 0.5) {
      return Cb - (1 - 2 * Cs) * Cb * (1 - Cb);
    } else {
      const D = (Cb: number) => {
        if (Cb <= 0.25) {
          return ((16 * Cb - 12) * Cb + 4) * Cb;
        } else {
          return Math.sqrt(Cb);
        }
      };
      return Cb + (2 * Cs - 1) * (D(Cb) - Cb);
    }
  },
  difference: (Cb: number, Cs: number) => {
    return Math.abs(Cb - Cs);
  },
  exclusion: (Cb: number, Cs: number) => {
    return Cb + Cs - 2 * Cb * Cs;
  }
};

export default blending;
