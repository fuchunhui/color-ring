type Rgb = [number, number, number];

/** ASC CDL 的十个数：三通道各自的 slope / offset / power，再加一个整体饱和度 */
interface CdlParams {
  slope: Rgb;
  offset: Rgb;
  power: Rgb;
  sat: number;
}

/** 色轮上的一个点（色相 + 偏移量）加一个整体滑块 */
interface WheelState {
  hue: number;
  amount: number;
  master: number;
}

interface LggState {
  lift: WheelState;
  gamma: WheelState;
  gain: WheelState;
}

interface LggChannels {
  lift: Rgb;
  gamma: Rgb;
  gain: Rgb;
}

interface Preset {
  key: string;
  label: string;
  cdl: CdlParams;
  lgg: LggState;
}

const LUMA: Rgb = [0.2126, 0.7152, 0.0722];
/** 红、绿、蓝在色轮上的角度（以 HSV 色相计） */
const CHANNEL_HUE: Rgb = [0, 120, 240];

/** 色轮偏移量对三个通道的最大作用强度 */
const LIFT_SWING = 0.12;
const GAMMA_SWING = 0.5;
const GAIN_SWING = 0.3;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** 输入输出都是 0~1 的 sRGB 编码值 */
const applyCdl = (rgb: Rgb, p: CdlParams): Rgb => {
  const graded = [0, 1, 2].map(i => clamp01(clamp01(rgb[i] * p.slope[i] + p.offset[i]) ** p.power[i])) as Rgb;
  const luma = LUMA[0] * graded[0] + LUMA[1] * graded[1] + LUMA[2] * graded[2];
  return graded.map(v => clamp01(luma + p.sat * (v - luma))) as Rgb;
};

/** 色轮方向对三个通道的权重：a·cos(h − h_k)，三个权重之和恒为 0 */
const wheelWeights = (hue: number, amount: number): Rgb => {
  return CHANNEL_HUE.map(h => amount * Math.cos((hue - h) * Math.PI / 180)) as Rgb;
};

const lggChannels = (s: LggState): LggChannels => {
  const wl = wheelWeights(s.lift.hue, s.lift.amount);
  const wg = wheelWeights(s.gamma.hue, s.gamma.amount);
  const wh = wheelWeights(s.gain.hue, s.gain.amount);
  return {
    lift: wl.map(w => s.lift.master + LIFT_SWING * w) as Rgb,
    gamma: wg.map(w => s.gamma.master * 2 ** (GAMMA_SWING * w)) as Rgb,
    gain: wh.map(w => s.gain.master * (1 + GAIN_SWING * w)) as Rgb
  };
};

/** v' = (gain·(v + lift·(1 − v)))^(1/gamma) */
const applyLgg = (rgb: Rgb, c: LggChannels): Rgb => {
  return [0, 1, 2].map(i => clamp01(c.gain[i] * (rgb[i] + c.lift[i] * (1 - rgb[i]))) ** (1 / c.gamma[i])) as Rgb;
};

/** 同一组 lift / gamma / gain 写成 CDL 的形式：slope = gain·(1 − lift)，offset = gain·lift，power = 1/gamma */
const lggToCdl = (c: LggChannels): CdlParams => ({
  slope: [0, 1, 2].map(i => c.gain[i] * (1 - c.lift[i])) as Rgb,
  offset: [0, 1, 2].map(i => c.gain[i] * c.lift[i]) as Rgb,
  power: [0, 1, 2].map(i => 1 / c.gamma[i]) as Rgb,
  sat: 1
});

/** 点击或拖动位置 → 色轮上的色相与偏移量。x、y 以圆心为原点，右、上为正，单位为半径 */
const wheelFromOffset = (x: number, y: number, previousHue: number): {hue: number; amount: number} => {
  const r = Math.hypot(x, y);
  if (r < 0.02) {
    return {hue: previousHue, amount: 0};
  }
  const hue = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  return {hue, amount: Math.min(1, r)};
};

const neutralWheel = (master: number): WheelState => ({hue: 0, amount: 0, master});

const makeDefaultCdl = (): CdlParams => ({slope: [1, 1, 1], offset: [0, 0, 0], power: [1, 1, 1], sat: 1});

const makeDefaultLgg = (): LggState => ({
  lift: neutralWheel(0),
  gamma: neutralWheel(1),
  gain: neutralWheel(1)
});

const PRESETS: Preset[] = [
  {
    key: 'tealorange',
    label: '青橙电影感',
    cdl: {slope: [1.1, 1, 0.88], offset: [-0.01, 0.005, 0.025], power: [1.02, 1, 1], sat: 1.1},
    lgg: {
      lift: {hue: 190, amount: 0.55, master: 0},
      gamma: neutralWheel(1),
      gain: {hue: 35, amount: 0.5, master: 1.05}
    }
  },
  {
    key: 'bleach',
    label: '漂白旁路',
    cdl: {slope: [1.2, 1.2, 1.2], offset: [-0.08, -0.08, -0.08], power: [1.3, 1.3, 1.3], sat: 0.55},
    lgg: {
      lift: neutralWheel(-0.04),
      gamma: neutralWheel(0.88),
      gain: neutralWheel(1.2)
    }
  },
  {
    key: 'coldnight',
    label: '冷夜',
    cdl: {slope: [0.8, 0.9, 1.15], offset: [-0.02, 0, 0.03], power: [1.15, 1.1, 0.95], sat: 0.85},
    lgg: {
      lift: {hue: 230, amount: 0.5, master: -0.01},
      gamma: {hue: 215, amount: 0.35, master: 0.85},
      gain: {hue: 200, amount: 0.3, master: 0.85}
    }
  },
  {
    key: 'faded',
    label: '复古褪色',
    cdl: {slope: [0.88, 0.86, 0.8], offset: [0.08, 0.07, 0.05], power: [1, 1, 1.05], sat: 0.75},
    lgg: {
      lift: {hue: 40, amount: 0.4, master: 0.08},
      gamma: neutralWheel(1),
      gain: {hue: 45, amount: 0.3, master: 0.88}
    }
  }
];

const cloneCdl = (p: CdlParams): CdlParams => ({
  slope: [...p.slope],
  offset: [...p.offset],
  power: [...p.power],
  sat: p.sat
});

const cloneLgg = (s: LggState): LggState => ({
  lift: {...s.lift},
  gamma: {...s.gamma},
  gain: {...s.gain}
});

export {
  Rgb,
  CdlParams,
  WheelState,
  LggState,
  LggChannels,
  Preset,
  PRESETS,
  clamp01,
  applyCdl,
  wheelWeights,
  lggChannels,
  applyLgg,
  lggToCdl,
  wheelFromOffset,
  makeDefaultCdl,
  makeDefaultLgg,
  cloneCdl,
  cloneLgg
};
