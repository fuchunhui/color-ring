import {Vec3} from './space';

// Gossett–Chen RYB立方体：下标 = r * 4 + y * 2 + b，值为对应角点的RGB(0~1)
const CORNERS: Vec3[] = [
  [1, 1, 1], // 白
  [0.163, 0.373, 0.6], // 蓝
  [1, 1, 0], // 黄
  [0, 0.66, 0.2], // 绿
  [1, 0, 0], // 红
  [0.5, 0, 0.5], // 紫
  [1, 0.5, 0], // 橙
  [0.2, 0.094, 0] // 黑
];

/**
 * RYB(0~1) -> sRGB(0~255)，在立方体的8个角点上做三线性插值
 */
const rybToRgb = (r: number, y: number, b: number): Vec3 => {
  const result: Vec3 = [0, 0, 0];
  for (let i = 0; i < 8; i++) {
    const weight = ((i & 4) ? r : 1 - r) * ((i & 2) ? y : 1 - y) * ((i & 1) ? b : 1 - b);
    for (let k = 0; k < 3; k++) {
      result[k] += weight * CORNERS[i][k];
    }
  }
  return result.map(v => Math.round(v * 255)) as Vec3;
};

export {
  rybToRgb
};
