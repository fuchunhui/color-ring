
/**
 * RGB color
 * #ff0000
 */

import {
  RGBA,
  HSV,
  HSL,
  CMYK
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

  toRGBA(): string {
    return this.toHex(this._rgb.concat([this._alpha * 255]));
  }

  toHex(rgb: number[] = this._rgb): string {
    const nums: string[] = [];
    rgb.forEach(n => {
      const v = Math.min(Math.max(Math.round(n), 0), 255);
      nums.push(v.toString(16).padStart(2, '0'));
    });
    
    return `#${nums.join('').toLowerCase()}`;
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
      h: Math.round(h),
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
      h: Math.round(h),
      s,
      v,
      a: this._alpha
    };
  }

  toCMYK(): CMYK {
    const {0: r, 1: g, 2: b} = this._rgb;
    const max = Math.max(r, g, b) / 255;
    if (max === 0) {
      return {c: 0, m: 0, y: 0, k: 1};
    }
    const k = 1 - max;
    const c = (k - r / 255) / max;
    const m = (k - g / 255) / max;
    const y = (k - b / 255) / max;
    return {c, m, y, k};
  }
}

export default Color;
