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
    [0, 1, 2],
  ];

  const r = Math.floor(vv[perm[i][0]] * 256);
  const g = Math.floor(vv[perm[i][1]] * 256);
  const b = Math.floor(vv[perm[i][2]] * 256);
  
  console.log('hsv --->  rgb:', r, g, b);
  return new Color([r, g, b], a);
};

export {
  // mix,
  hsv,
  hsva
};
