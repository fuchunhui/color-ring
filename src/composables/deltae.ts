import {Vec3, rgbToLab, labToRgb} from '../utils/space';
import {deltaE76, deltaE94, deltaE2000} from '../utils/deltae';

const hexToRgb = (hex: string): Vec3 => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgbToHex = (rgb: Vec3): string => {
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
};

const hexToLab = (hex: string): Vec3 => rgbToLab(hexToRgb(hex));

const labToHex = (lab: Vec3): {hex: string; inGamut: boolean} => {
  const {rgb, inGamut} = labToRgb(lab);
  return {hex: rgbToHex(rgb), inGamut};
};

const levelOf = (de: number): string => {
  if (de < 1) {
    return '不可察觉';
  }
  if (de < 2) {
    return '细看可辨';
  }
  if (de < 10) {
    return '一眼可辨';
  }
  return '明显不同';
};

interface Direction {
  key: string;
  label: string;
  vec: Vec3;
}

const DIRECTIONS: Direction[] = [
  {key: 'lighter', label: '变亮 (+L*)', vec: [1, 0, 0]},
  {key: 'darker', label: '变暗 (−L*)', vec: [-1, 0, 0]},
  {key: 'red', label: '偏红 (+a*)', vec: [0, 1, 0]},
  {key: 'green', label: '偏绿 (−a*)', vec: [0, -1, 0]},
  {key: 'yellow', label: '偏黄 (+b*)', vec: [0, 0, 1]},
  {key: 'blue', label: '偏蓝 (−b*)', vec: [0, 0, -1]}
];

const STEP_TARGETS = [0.5, 1, 2, 3, 5, 10];

/** 沿 dir 方向二分查找，使 ΔE2000(base, base + t·dir) = target */
const labAtDeltaE = (base: Vec3, dir: Vec3, target: number): Vec3 => {
  let lo = 0;
  let hi = 200;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const lab = base.map((v, k) => v + dir[k] * mid) as Vec3;
    if (deltaE2000(base, lab) < target) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return base.map((v, k) => v + dir[k] * hi) as Vec3;
};

interface Step {
  target: number;
  actual: number;
  hex: string;
  inGamut: boolean;
}

const buildSteps = (baseHex: string, dirKey: string): Step[] => {
  const base = hexToLab(baseHex);
  const dir = (DIRECTIONS.find(d => d.key === dirKey) || DIRECTIONS[0]).vec;
  return STEP_TARGETS.map(target => {
    const lab = labAtDeltaE(base, dir, target);
    const {hex, inGamut} = labToHex(lab);
    return {target, actual: deltaE2000(base, lab), hex, inGamut};
  });
};

interface PairSpec {
  name: string;
  baseHex: string;
  mode: 'chroma' | 'a' | 'lightness';
  note: string;
}

const PAIR_SPECS: PairSpec[] = [
  {name: '饱和蓝，降低色度', baseHex: '#2A2FE0', mode: 'chroma', note: '高饱和区 ΔE2000 比 ΔE76 小得多'},
  {name: '饱和红，降低色度', baseHex: '#E0202A', mode: 'chroma', note: '同上：色度权重随色度增大而变大'},
  {name: '中灰，沿 a* 偏移', baseHex: '#808080', mode: 'a', note: '反过来：灰色附近 ΔE2000 比 ΔE76 还大，对色度偏差更敏感'},
  {name: '深灰，沿明度偏移', baseHex: '#202020', mode: 'lightness', note: '明度权重 SL 随 L* 远离 50 变大，明度差被压低'},
  {name: '浅灰，沿明度偏移', baseHex: '#D8D8D8', mode: 'lightness', note: '同上，亮部的明度差同样被压低'}
];

interface Pair {
  name: string;
  note: string;
  hexA: string;
  hexB: string;
  de76: number;
  de94: number;
  de2000: number;
}

/** 构造 ΔE76 恰为 10 的颜色对，再看另外两个公式怎么评价它们 */
const buildPairs = (): Pair[] => {
  return PAIR_SPECS.map(({name, baseHex, mode, note}) => {
    const a = hexToLab(baseHex);
    let dir: Vec3 = [-1, 0, 0];
    if (mode === 'chroma') {
      const c = Math.hypot(a[1], a[2]) || 1;
      dir = [0, -a[1] / c, -a[2] / c];
    } else if (mode === 'a') {
      dir = [0, 1, 0];
    }
    const b = a.map((v, i) => v + dir[i] * 10) as Vec3;
    return {
      name,
      note,
      hexA: baseHex,
      hexB: labToHex(b).hex,
      de76: deltaE76(a, b),
      de94: deltaE94(a, b),
      de2000: deltaE2000(a, b)
    };
  });
};

export {
  hexToLab,
  levelOf,
  DIRECTIONS,
  buildSteps,
  buildPairs
};
