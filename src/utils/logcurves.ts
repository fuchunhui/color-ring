/**
 * 各种“光 → 编码值”曲线。输入 x 是场景线性光（18% 灰 = 0.18），输出是 0~1 的编码值。
 */

interface CurveDef {
  key: string;
  label: string;
  color: string;
  encode: (x: number) => number;
  decode: (y: number) => number;
}

const srgbEncode = (x: number): number => {
  const v = Math.max(0, x);
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
};

const srgbDecode = (y: number): number => {
  return y <= 0.04045 ? y / 12.92 : ((y + 0.055) / 1.055) ** 2.4;
};

/** BT.709 OETF（相机和广播里的分段曲线，不是显示器 EOTF） */
const rec709Encode = (x: number): number => {
  const v = Math.max(0, x);
  return v < 0.018 ? 4.5 * v : 1.099 * v ** 0.45 - 0.099;
};

const rec709Decode = (y: number): number => {
  return y < 0.081 ? y / 4.5 : ((y + 0.099) / 1.099) ** (1 / 0.45);
};

const SLOG3_CUT = 0.01125;

/** Sony S-Log3：x ≥ 0.01125 时按对数，否则线性；输出是 0~1（10 位码值 / 1023） */
const slog3Encode = (x: number): number => {
  if (x >= SLOG3_CUT) {
    return (420 + Math.log10((x + 0.01) / (0.18 + 0.01)) * 261.5) / 1023;
  }
  return (x * (171.2102946929 - 95) / SLOG3_CUT + 95) / 1023;
};

const slog3Decode = (y: number): number => {
  const code = y * 1023;
  if (code >= 171.2102946929) {
    return 10 ** ((code - 420) / 261.5) * (0.18 + 0.01) - 0.01;
  }
  return (code - 95) * SLOG3_CUT / (171.2102946929 - 95);
};

const LOGC = {cut: 0.010591, a: 5.555556, b: 0.052272, c: 0.247190, d: 0.385537, e: 5.367655, f: 0.092809};

/** ARRI LogC3，EI 800 */
const logc3Encode = (x: number): number => {
  if (x > LOGC.cut) {
    return LOGC.c * Math.log10(LOGC.a * x + LOGC.b) + LOGC.d;
  }
  return LOGC.e * x + LOGC.f;
};

const logc3Decode = (y: number): number => {
  const ycut = LOGC.e * LOGC.cut + LOGC.f;
  if (y > ycut) {
    return (10 ** ((y - LOGC.d) / LOGC.c) - LOGC.b) / LOGC.a;
  }
  return (y - LOGC.f) / LOGC.e;
};

const PQ = {m1: 2610 / 16384, m2: 2523 / 4096 * 128, c1: 3424 / 4096, c2: 2413 / 4096 * 32, c3: 2392 / 4096 * 32};

/** SMPTE ST 2084（PQ）：输入是相对 10000 cd/m² 的亮度，这里把 1.0 当作 100 cd/m² 的参考白，所以乘以 0.01 */
const pqEncode = (x: number): number => {
  const y = Math.max(0, x) * 0.01;
  const p = y ** PQ.m1;
  return ((PQ.c1 + PQ.c2 * p) / (1 + PQ.c3 * p)) ** PQ.m2;
};

const pqDecode = (e: number): number => {
  const p = Math.max(0, e) ** (1 / PQ.m2);
  const y = (Math.max(0, p - PQ.c1) / (PQ.c2 - PQ.c3 * p)) ** (1 / PQ.m1);
  return y * 100;
};

const CURVES: CurveDef[] = [
  {key: 'srgb', label: 'sRGB', color: '#868E96', encode: srgbEncode, decode: srgbDecode},
  {key: 'rec709', label: 'Rec.709', color: '#1C7ED6', encode: rec709Encode, decode: rec709Decode},
  {key: 'slog3', label: 'S-Log3', color: '#E8590C', encode: slog3Encode, decode: slog3Decode},
  {key: 'logc3', label: 'LogC3 (EI 800)', color: '#2F9E44', encode: logc3Encode, decode: logc3Decode},
  {key: 'pq', label: 'PQ（1.0 = 100 cd/m²）', color: '#9C36B5', encode: pqEncode, decode: pqDecode}
];

const MIDDLE_GRAY = 0.18;

/** 相对 18% 灰的档数 → 线性光 */
const stopsToLinear = (stops: number): number => MIDDLE_GRAY * 2 ** stops;

/** 显示参考的 709 能装下的档数：从 0.18 向上到 1.0，向下到编码值可分辨的最暗处（这里取 8 位里 1/255 对应的线性值） */
const displayRangeStops = (): {up: number; down: number} => {
  const up = Math.log2(1 / MIDDLE_GRAY);
  const down = Math.log2(MIDDLE_GRAY / rec709Decode(1 / 255));
  return {up, down};
};

/** 一个简单的 S 曲线：把 0~1 的 log 编码重新映射成显示用的 0~1，并保住高光 */
const sCurve = (x: number, contrast: number): number => {
  const v = Math.min(1, Math.max(0, x));
  const a = v ** contrast;
  const b = (1 - v) ** contrast;
  return a / (a + b);
};

export {
  CurveDef,
  CURVES,
  MIDDLE_GRAY,
  srgbEncode,
  srgbDecode,
  rec709Encode,
  rec709Decode,
  slog3Encode,
  slog3Decode,
  logc3Encode,
  logc3Decode,
  pqEncode,
  pqDecode,
  stopsToLinear,
  displayRangeStops,
  sCurve
};
