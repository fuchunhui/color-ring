
/**
 * RGB color
 * #ff0000
 */

// import {RGB} from '../types';

class Color {
  private _rgb: number[] = [0, 0, 0];
  private _alpha = 0;

  constructor(rgb: string | number[], a: number = 1) {
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

  rgb(): number[] {
    return this._rgb;
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

  toHSV(): void {
    
  }
}

export default Color;
