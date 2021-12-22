import Color from "../base/color";

// const mix = (color1, color2, weight = 0.5) => {

// };

const hsv = (h: number, s: number, v: number): Color => {
  return hsva(h, s, v, 1.0);
};

const hsva = (h: number, s: number, v: number, a: number): Color => {
  const H = h / 60;
  const i = Math.floor(H);
  const f = H - i;

  const vv = [
    v,
    v * (1 - s),
    v * (1 - s * f),
    v * (1 - s * (1 - f))
  ];
  const perm = [
    [0, 3, 1],
    [2, 0, 1],
    [1, 0, 3],
    [1, 2, 0],
    [3, 1, 0],
    [0, 1, 2]
  ];

  const r = Math.floor(vv[perm[i][0]] * 256);
  const g = Math.floor(vv[perm[i][1]] * 256);
  const b = Math.floor(vv[perm[i][2]] * 256);

  return new Color([r, g, b], a);
};

const hsl = (h: number, s: number, l: number): Color => {
  return hsla(h, s, l, 1.0);
};

const hsla = (h: number, s: number, l: number, a: number): Color => {
  let r = 0;
  let g = 0;
  let b = 0;
  if (s === 0) {
    r = l;
    g = l;
    b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const k = h / 360;

    const hue = (t: number) => {
      if (t < 0) {
        t = t + 1;
      } else if (t > 1) {
        t = t - 1;
      }
      let h = 0;
      if (t < 1 / 6) {
        h = p + (q - p) * 6 * t;
      } else if (t < 1 / 2) {
        h = q;
      } else if (t < 2 / 3) {
        h = p + (q - p) * 6 * (2 / 3 - t);
      } else {
        h = p;
      }
      return h;
    };
    r = hue(k + 1 / 3);
    g = hue(k);
    b = hue(k - 1 / 3);
  }

  return new Color([r * 255, g * 255, b * 255], a);
};

export {
  // mix,
  hsv,
  hsva,
  hsl,
  hsla
};
