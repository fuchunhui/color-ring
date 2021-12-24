
/**
 * RGB color
 * #ff0000
 */

import {
  RGB, RGBA,
  HSV, HSL
} from '../types';

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
    }
    this._alpha = this._alpha || (typeof a === 'number' ? a : 1);
  }

  rgb(): number[] {
    return this._rgb;
  }

  rgba(): RGBA {
    const {0: r, 1: g, 2: b} = this.rgb();
    return {
      r,
      g,
      b,
      a: this.alpha()
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

  toHSL(): HSL {
    const {0: r, 1: g, 2: b} = this._rgb;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    const l = (max + min) / 2 / 255;
    const d = max - min;
    let s = 0;
    let h = 0;

    if (max === min) {
      h = 0;
      s = 0;
    } else {
      s = l > 0.5 ? d / (2 * 255 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d * 60;
          break;
        case g:
          h = (b - r) / d * 60 + 120;
          break;
        case b:
          h = (r - g) / d * 60 + 240;
          break;
      }
    }

    if (h < 0) {
      h += 360;
    }

    return {
      h,
      s,
      l: Math.ceil(l * 1000) / 1000,
      a: this._alpha
    };
  }

  toHSV(): HSV {
    const {0: r, 1: g, 2: b} = this._rgb;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    const v = Math.ceil(max / 255 * 1000) / 1000;
    const d = max - min;
    const s = max === 0 ? 0 : d / max;
    let h = 0;

    if (max === min) {
      h = 0;
    } else {
      switch (max) {
        case r:
          h = (g - b) / d * 60;
          break;
        case g:
          h = (b - r) / d * 60 + 120;
          break;
        case b:
          h = (r - g) / d * 60 + 240;
          break;
      }
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
    // 0°-360° 0-100% 0-100%
    // const {h, s, v, a} = this.toHSV();
  }
}

export default Color;
