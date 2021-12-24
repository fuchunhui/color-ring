import Color from '../base/color';
import {hsva, hsla, mix, make} from '../utils/color';
import blending from '../utils/blending';

// const color = new Color('8e9e10');
// console.log('原始hex: ', color.toHex());
// console.log('原始rgb: ', color.rgb());

// console.log('test ------ hsv ----->', color.toHSV());
// const {h, s, v, a} = color.toHSV();
// const newHSV = hsva(h, s, v, a);
// console.log('hsv --> rgb转换', newHSV.toHex());

// console.log('test ------ hsl ----->', color.toHSL());
// const {h: lh, s: ls, l: ll, a: la} = color.toHSL();
// const newHSL = hsla(lh, ls, ll, la);
// console.log('hsl --> rgb转换', newHSL.toHex());

// const color1 = new Color('ff00ff');
// const color2 = new Color('ffff00');
// const color3 = new Color('#00ffff');
// console.log('test ------ mix ----->', color1.toHex(), color2.toHex(), 0.5);
// const mixColor = mix(color1, color2, 0.5);
// console.log(mixColor.rgba(), mixColor.toHex());
// console.log('test ------ make ------');
// const makeColors = make([color1, color2, color3], 1, mix);
// makeColors.forEach((item, index) => {
//   console.log(index, item.toHex());
// });

const nc = blending('screen', new Color('#FF0000'), new Color('#0000FF'));
console.log('screen: ', nc.toHex());
const nd = blending('difference', new Color('#ff00ff'), new Color('#00ff00'));
console.log('difference: ', nd.rgba(), nd.toHex());

export {};
