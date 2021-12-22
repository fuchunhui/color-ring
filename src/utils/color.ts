import Color from "../base/color";

// const mix = (color1, color2, weight = 0.5) => {

// };

const hsv = (h: number, s: number, v: number): Color => {
  return hsva(h, s, v, 1.0);
};

// 传入hsv参数，返回Color对象
// 先简单实现，再使用矩阵转换
const hsva = (h: number, s: number, v: number, a: number): Color => {
  let r = 0;
  let g = 0;
  let b = 0;

  if (s === 0) {
    r = v;
    g = v;
    b = v;
  } else {
    const H = h / 60;
    const i = parseInt(H.toString(), 10);
    const f = H - i;
    const A = v * (1 - s);
    const B = v * (1 - s * f);
    const C = v * (1 - s * (1 - f));

    switch (i) {
      case 0:
        r = v;
        g = C;
        b = A;
        break;
      case 1:
        r = B;
        g = v;
        b = A;
        break;
      case 2:
        r = A;
        g = v;
        b = C;
        break;
      case 3:
        r = A;
        g = B;
        b = v;
        break;
      case 4:
        r = C;
        g = A;
        b = v;
        break;
      case 5:
        r = v;
        g = A;
        b = B;
        break;
    }
  }
  console.log('hsv --->  rgb:', r, g, b);
  return new Color([r * 256, g * 256, b * 256], a);
};

export {
  // mix,
  hsv,
  hsva
};
