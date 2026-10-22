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

import Color from '../base/color';

const blending = (cm: string, source: Color, backdrop: Color): Color => {
  const as = source.alpha();
  const ab = backdrop.alpha();
  const Cs = source.rgb().map(v => v / 255);
  const Cb = backdrop.rgb().map(v => v / 255);

  const ao = as + ab * (1 - as);
  const nonSeparable = nonSeparableMethod[cm];
  const Cr = nonSeparable
    ? nonSeparable(Cb, Cs)
    : Cs.map((s, i) => colorMethod[cm](Cb[i], s));

  const r = Cs.map((s, i) => {
    if (!ao) {
      return 0;
    }
    const Co = (as * s + ab * (Cb[i] - as * (Cb[i] + s - Cr[i]))) / ao;
    return Math.min(255, Math.max(0, Math.round(Co * 255)));
  });

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

type RGB3 = number[];

const lum = (c: RGB3): number => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];

const clipColor = (c: RGB3): RGB3 => {
  const l = lum(c);
  const n = Math.min(...c);
  const x = Math.max(...c);
  let result = c;
  if (n < 0) {
    result = result.map(v => l + (v - l) * l / (l - n));
  }
  if (x > 1) {
    result = result.map(v => l + (v - l) * (1 - l) / (x - l));
  }
  return result;
};

const setLum = (c: RGB3, l: number): RGB3 => {
  const d = l - lum(c);
  return clipColor(c.map(v => v + d));
};

const sat = (c: RGB3): number => Math.max(...c) - Math.min(...c);

const setSat = (c: RGB3, s: number): RGB3 => {
  const max = Math.max(...c);
  const min = Math.min(...c);
  if (max === min) {
    return [0, 0, 0];
  }
  return c.map(v => (v - min) * s / (max - min));
};

const nonSeparableMethod: Record<string, (Cb: RGB3, Cs: RGB3) => RGB3> = {
  hue: (Cb, Cs) => setLum(setSat(Cs, sat(Cb)), lum(Cb)),
  saturation: (Cb, Cs) => setLum(setSat(Cb, sat(Cs)), lum(Cb)),
  color: (Cb, Cs) => setLum(Cs, lum(Cb)),
  luminosity: (Cb, Cs) => setLum(Cb, lum(Cs))
};

export default blending;
