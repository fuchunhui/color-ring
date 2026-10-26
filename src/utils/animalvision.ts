import type {Vec3} from './space';
import {cmf, planck} from './cie';

/** 紫外到可见光的采样范围：300~750nm，每 5nm 一个点 */
const AV_MIN = 300;
const AV_MAX = 750;
const AV_STEP = 5;
const AV_WL: number[] = Array.from({length: (AV_MAX - AV_MIN) / AV_STEP + 1}, (_, i) => AV_MIN + i * AV_STEP);

const gauss = (l: number, mu: number, s: number): number => Math.exp(-0.5 * ((l - mu) / s) ** 2);
const edge = (l: number, center: number, width: number): number => 1 / (1 + Math.exp(-(l - center) / width));

/** Govardovskii 等（2000）A1 视色素模板：α 带加 β 带，输入为峰值波长 lmax */
const govardovskii = (l: number, lmax: number): number => {
  const x = lmax / l;
  const a = 0.8795 + 0.0459 * Math.exp(-((lmax - 300) ** 2) / 11940);
  const alpha = 1 / (
    Math.exp(69.7 * (a - x)) + Math.exp(28 * (0.922 - x)) + Math.exp(-14.9 * (1.104 - x)) + 0.674
  );
  const lb = 189 + 0.315 * lmax;
  const b = -40.5 + 0.195 * lmax;
  const beta = 0.26 * Math.exp(-(((l - lb) / b) ** 2));
  return alpha + beta;
};

interface Receptor {
  name: string;
  peak: number;
}

interface Species {
  id: string;
  label: string;
  note: string;
  receptors: Receptor[];
}

const SPECIES: Species[] = [
  {
    id: 'human',
    label: '人',
    note: '三色视觉；晶状体吸收紫外',
    receptors: [{name: 'S', peak: 420}, {name: 'M', peak: 530}, {name: 'L', peak: 559}]
  },
  {
    id: 'dog',
    label: '狗',
    note: '二色视觉（缺 M 类视锥）',
    receptors: [{name: 'S', peak: 429}, {name: 'L', peak: 555}]
  },
  {
    id: 'bee',
    label: '蜜蜂',
    note: '三色视觉，整体向紫外移动',
    receptors: [{name: 'UV', peak: 344}, {name: '蓝', peak: 436}, {name: '绿', peak: 556}]
  },
  {
    id: 'bird',
    label: '鸟类（典型）',
    note: '四色视觉，多了一类紫外 / 紫光视锥',
    receptors: [{name: 'UVS', peak: 370}, {name: 'S', peak: 445}, {name: 'M', peak: 508}, {name: 'L', peak: 565}]
  }
];

// 螳螂虾有 12 类感光通道；这里的峰值位置只是示意，不同物种并不相同
const MANTIS_PEAKS = [315, 343, 375, 400, 435, 470, 500, 530, 560, 590, 640, 720];
const MANTIS_WIDTH = 12;

const normalize = (values: number[]): number[] => {
  const max = Math.max(...values) || 1;
  return values.map(v => v / max);
};

// 人眼晶状体对短波的吸收：约 400nm 以下迅速变得不透明（简化为一条 S 形曲线）
const ocular = (l: number): number => edge(l, 395, 9);

const SENSITIVITY: Record<string, number[][]> = {};
SPECIES.forEach(sp => {
  SENSITIVITY[sp.id] = sp.receptors.map(r => {
    return normalize(AV_WL.map(l => govardovskii(l, r.peak) * (sp.id === 'human' ? ocular(l) : 1)));
  });
});

const MANTIS: number[][] = MANTIS_PEAKS.map(p => normalize(AV_WL.map(l => gauss(l, p, MANTIS_WIDTH))));

// 简化的日光：6500K 黑体，再乘上臭氧对 UV-B 的吸收
const DAYLIGHT: number[] = AV_WL.map(l => planck(l, 6504) * edge(l, 320, 12));

type Refl = (l: number) => number;

const MATERIALS: Record<string, Refl> = {
  leaf: l => (l < 400 ? 0.03 : Math.min(0.9, 0.04 + 0.11 * gauss(l, 550, 28) + 0.42 * edge(l, 712, 9))),
  centre: l => 0.04 + 0.05 * edge(l, 600, 25),
  soil: l => 0.06 + 0.2 * edge(l, 560, 45),
  // 天空不是反射体：用 λ⁻⁴ 的瑞利散射权重乘日光，相当于一个“发光”的表面
  sky: l => Math.min(8, 0.6 * (500 / l) ** 4)
};

/** 黄色花瓣：可见光部分是黄色；紫外反射率由 u（0~1）控制，u=0 表示基部吸收紫外 */
const petal = (u: number): Refl => l => {
  const vis = 0.06 + 0.82 * edge(l, 505, 14);
  const uv = (1 - edge(l, 405, 8)) * (0.04 + 0.52 * u);
  return Math.min(1, vis + uv * (1 - vis));
};

interface Response {
  xyz: Vec3;
  human: number[];
  dog: number[];
  bee: number[];
  bird: number[];
  mantis: number[];
}

const integrate = (curve: number[], refl: number[]): number => {
  let sum = 0;
  for (let i = 0; i < AV_WL.length; i++) {
    sum += curve[i] * DAYLIGHT[i] * refl[i];
  }
  return sum;
};

const xyzOf = (refl: number[]): Vec3 => {
  const xyz: Vec3 = [0, 0, 0];
  AV_WL.forEach((l, i) => {
    if (l >= 380 && l <= 750) {
      const c = cmf(l);
      const p = DAYLIGHT[i] * refl[i];
      xyz[0] += c[0] * p;
      xyz[1] += c[1] * p;
      xyz[2] += c[2] * p;
    }
  });
  return xyz;
};

const ONE: number[] = AV_WL.map(() => 1);
const WHITE_XYZ = xyzOf(ONE);
const D65_XYZ: Vec3 = [0.95047, 1, 1.08883];
const WHITE_SUM: Record<string, number[]> = {};
const allCurves = (): Record<string, number[][]> => ({...SENSITIVITY, mantis: MANTIS});
Object.entries(allCurves()).forEach(([id, curves]) => {
  WHITE_SUM[id] = curves.map(c => integrate(c, ONE));
});

/** 反射率函数 → 各物种各通道的响应（以完全漫反射白 = 1 为参照，相当于 von Kries 适应）以及人眼 XYZ */
const responseOf = (fn: Refl): Response => {
  const refl = AV_WL.map(fn);
  const xyz = xyzOf(refl);
  const out: Record<string, number[]> = {};
  Object.entries(allCurves()).forEach(([id, curves]) => {
    out[id] = curves.map((c, k) => integrate(c, refl) / WHITE_SUM[id][k]);
  });
  return {
    xyz: [
      xyz[0] / WHITE_XYZ[0] * D65_XYZ[0],
      xyz[1] / WHITE_XYZ[1] * D65_XYZ[1],
      xyz[2] / WHITE_XYZ[2] * D65_XYZ[2]
    ],
    human: out.human,
    dog: out.dog,
    bee: out.bee,
    bird: out.bird,
    mantis: out.mantis
  };
};

export {
  Receptor,
  Species,
  Response,
  Refl,
  AV_MIN,
  AV_MAX,
  AV_STEP,
  AV_WL,
  SPECIES,
  SENSITIVITY,
  MANTIS_PEAKS,
  MANTIS,
  MATERIALS,
  petal,
  responseOf,
  govardovskii
};
