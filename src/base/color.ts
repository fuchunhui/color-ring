
/**
 * RGB color
 * #ff0000
 */

import {RGB, HSV} from '../types';

class Color {
  private _rgb: number[] = [0, 0, 0];
  private _alpha = 0;

  constructor(rgb: string | number[] = [0, 0, 0], a: number = 1) {
    if (Array.isArray(rgb)) {
      this._rgb = rgb;
    } else {
      const _rgb = rgb.match(/^#/g) ? rgb.slice(1) : rgb;
      const nums: number[] = [];
      const list = _rgb.length >= 6 ? _rgb.match(/.{2}/g) : _rgb.split('');
      list?.forEach((n, i) => {
        const v = parseInt(_rgb.length >= 6 ? n : n + n, 16);
        if (i < 3) {
          nums.push(v);
        } else {
          this._alpha = v / 255;
        }
      });
      this._rgb = nums;
      this._alpha = this._alpha || (typeof a === 'number' ? a : 1);
    }
  }

  rgb(): RGB {
    const {0: r, 1: g, 2: b} = this._rgb;
    return {
      r,
      g,
      b
    };
  }

  alpha(): number {
    return this._alpha;
  }

  toRGB(): string {
    return this.toHex(this._rgb);
  }

  toHex(rgb: number[] = this._rgb): string {
    const nums: string[] = [];
    rgb.forEach(n => {
      const v = Math.min(Math.max(Math.round(n), 0), 255);
      nums.push(v.toString(16).padStart(2, '0'));
    });
    
    return `#${nums.join('')}`;
  }

  toHSL(): void {

  }

  toHSV(): HSV {
    const {0: r, 1: g, 2: b} = this._rgb;
    console.log('rgb: ', r, g, b);

    const max = Math.max(r, g, b); // 255
    const min = Math.min(r, g, b); // 0

    const v = max / 255;
    const d = max - min;
    const s = max === 0 ? 0 : d / max;

    let h = 0;
    if (r === max) {
      h = (g - b) / d * 60;
    } else if (g === max) {
      h = (b - r) / d * 60 + 120;
    } else if (b === max) {
      h = (r - g) / d * 60 + 240;
    }
    if (h < 0) {
      h += 360;
    }

    return {
      h,
      s,
      v,
      a: this._alpha
    };
  }

  toHSVReal(): void { // 处理返回值，是否转换为真实内容。° 100 100 这样
    // const {h, s, v, a} = this.toHSV();
  }
}

export default Color;
