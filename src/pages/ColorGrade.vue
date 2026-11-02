<script setup lang="ts">
import {reactive, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {ColorButton} from '../components/common';
import {
  PRESETS,
  applyCdl,
  lggChannels,
  applyLgg,
  lggToCdl,
  wheelFromOffset,
  makeDefaultCdl,
  makeDefaultLgg,
  cloneCdl,
  cloneLgg
} from '../utils/colorgrade';
import type {Rgb, Preset} from '../utils/colorgrade';
import {
  SCENE_W,
  SCENE_H,
  SCENE_BYTES,
  WHEEL_SIZE,
  WHEEL_R,
  WHEEL_C,
  CURVE_W,
  CURVE_H,
  PARADE_W,
  PARADE_H,
  gradeBytes,
  drawScene,
  drawWheel,
  drawCurves,
  drawParade
} from '../composables/colorgrade';

type WheelKey = 'lift' | 'gamma' | 'gain';

const CH = [0, 1, 2];
const CH_NAMES = ['R', 'G', 'B'];
const SLOPE_RANGE = {min: 0, max: 2};
const OFFSET_RANGE = {min: -0.5, max: 0.5};
const POWER_RANGE = {min: 0.3, max: 3};

const cdl = reactive(cloneCdl(makeDefaultCdl()));
const lgg = reactive(cloneLgg(makeDefaultLgg()));

const cdlFn = computed(() => {
  const p = cloneCdl(cdl);
  return (rgb: Rgb) => applyCdl(rgb, p);
});
const cdlBytes = computed(() => gradeBytes(SCENE_BYTES, cdlFn.value));

const channels = computed(() => lggChannels(cloneLgg(lgg)));
const lggFn = computed(() => {
  const c = channels.value;
  return (rgb: Rgb) => applyLgg(rgb, c);
});
const lggBytes = computed(() => gradeBytes(SCENE_BYTES, lggFn.value));
const equivalent = computed(() => lggToCdl(channels.value));

const drawOriginal = drawScene(() => SCENE_BYTES);
const drawCdlScene = drawScene(() => cdlBytes.value);
const drawLggScene = drawScene(() => lggBytes.value);
const drawCdlCurves = drawCurves(() => cdlFn.value);
const drawLggCurves = drawCurves(() => lggFn.value);
const drawOriginalParade = drawParade(() => SCENE_BYTES);
const drawCdlParade = drawParade(() => cdlBytes.value);
const drawLggParade = drawParade(() => lggBytes.value);

const WHEELS: {key: WheelKey; title: string; hint: string; min: number; max: number; step: number; draw: ReturnType<typeof drawWheel>}[] = [
  {key: 'lift', title: '阴影 Lift', hint: '整体偏移', min: -0.1, max: 0.1, step: 0.005, draw: drawWheel(() => lgg.lift)},
  {key: 'gamma', title: '中间调 Gamma', hint: '整体 gamma', min: 0.5, max: 2, step: 0.01, draw: drawWheel(() => lgg.gamma)},
  {key: 'gain', title: '高光 Gain', hint: '整体增益', min: 0.6, max: 1.4, step: 0.01, draw: drawWheel(() => lgg.gain)}
];

const wheelDefault = (key: WheelKey): number => makeDefaultLgg()[key].master;

const resetWheel = (key: WheelKey) => {
  lgg[key].hue = 0;
  lgg[key].amount = 0;
  lgg[key].master = wheelDefault(key);
};

let dragging: WheelKey | null = null;

const setFromPointer = (event: PointerEvent, key: WheelKey) => {
  const canvas = (event.currentTarget as HTMLElement).querySelector('canvas') as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return;
  }
  const x = (event.clientX - rect.left) * WHEEL_SIZE / rect.width - WHEEL_C;
  const y = (event.clientY - rect.top) * WHEEL_SIZE / rect.height - WHEEL_C;
  const {hue, amount} = wheelFromOffset(x / WHEEL_R, -y / WHEEL_R, lgg[key].hue);
  lgg[key].hue = hue;
  lgg[key].amount = amount;
};

const onWheelDown = (event: PointerEvent, key: WheelKey) => {
  if ((event.target as HTMLElement).tagName !== 'CANVAS') {
    return;
  }
  dragging = key;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  setFromPointer(event, key);
};

const onWheelMove = (event: PointerEvent, key: WheelKey) => {
  if (dragging === key) {
    setFromPointer(event, key);
  }
};

const onWheelUp = () => {
  dragging = null;
};

const useCdlPreset = (preset: Preset) => {
  Object.assign(cdl, cloneCdl(preset.cdl));
};

const useLggPreset = (preset: Preset) => {
  Object.assign(lgg, cloneLgg(preset.lgg));
};

const resetCdl = () => {
  Object.assign(cdl, cloneCdl(makeDefaultCdl()));
};

const resetLgg = () => {
  Object.assign(lgg, cloneLgg(makeDefaultLgg()));
};

const clampTo = (v: number, range: {min: number; max: number}): number => Math.min(range.max, Math.max(range.min, v));

const copyToCdl = () => {
  const e = equivalent.value;
  cdl.slope = e.slope.map(v => clampTo(v, SLOPE_RANGE)) as Rgb;
  cdl.offset = e.offset.map(v => clampTo(v, OFFSET_RANGE)) as Rgb;
  cdl.power = e.power.map(v => clampTo(v, POWER_RANGE)) as Rgb;
  cdl.sat = 1;
};

const fixed = (v: number, n = 3): string => v.toFixed(n);

const channelRows = computed(() => {
  const c = channels.value;
  const e = equivalent.value;
  return [
    {name: 'lift', values: c.lift},
    {name: 'gamma', values: c.gamma},
    {name: 'gain', values: c.gain},
    {name: 'slope = gain·(1 − lift)', values: e.slope},
    {name: 'offset = gain·lift', values: e.offset},
    {name: 'power = 1 / gamma', values: e.power}
  ];
});
</script>

<template>
  <demo-page>
    <demo-section
      title="ASC CDL：十个数描述一次调色"
      desc="ASC CDL（美国电影摄影师协会的色彩决定列表）只用十个数记录一次调色：R、G、B 各一组 slope（斜率）、offset（偏移）、power（幂），再加一个整体的 saturation（饱和度）。每个通道先算 out = clamp(in · slope + offset) ^ power，再用 Rec.709 的亮度权重（0.2126、0.7152、0.0722）求出亮度 Y，最后 out' = Y + saturation · (out − Y)。slope 主要拉伸高光，offset 整体平移、主要动暗部，power 弯曲中间调：大于 1 变暗，小于 1 变亮。CDL 本身不规定在哪种编码上运算，实际流程里通常用在对数编码或显示参考的空间里。这里为了演示，直接用在 sRGB 编码值（0~1）上，并把每一步的结果限制在 0~1。测试画面由程序生成，不是照片。"
    >
      <div class="demo-controls">
        <color-button
          v-for="preset in PRESETS"
          :key="preset.key"
          :label="preset.label"
          @click="useCdlPreset(preset)"
        />
        <color-button label="复位" @click="resetCdl"/>
      </div>
      <table class="cg-table">
        <thead>
          <tr>
            <th/>
            <th v-for="k in CH" :key="k">
              {{ CH_NAMES[k] }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>slope</th>
            <td v-for="k in CH" :key="k">
              <input v-model.number="cdl.slope[k]" type="range" :min="SLOPE_RANGE.min" :max="SLOPE_RANGE.max" step="0.01">
              <span class="demo-code">{{ fixed(cdl.slope[k], 2) }}</span>
            </td>
          </tr>
          <tr>
            <th>offset</th>
            <td v-for="k in CH" :key="k">
              <input v-model.number="cdl.offset[k]" type="range" :min="OFFSET_RANGE.min" :max="OFFSET_RANGE.max" step="0.005">
              <span class="demo-code">{{ fixed(cdl.offset[k], 3) }}</span>
            </td>
          </tr>
          <tr>
            <th>power</th>
            <td v-for="k in CH" :key="k">
              <input v-model.number="cdl.power[k]" type="range" :min="POWER_RANGE.min" :max="POWER_RANGE.max" step="0.01">
              <span class="demo-code">{{ fixed(cdl.power[k], 2) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="demo-controls">
        <label>
          saturation
          <input v-model.number="cdl.sat" type="range" min="0" max="2" step="0.05">
          <span class="demo-code">{{ fixed(cdl.sat, 2) }}</span>
        </label>
      </div>
      <demo-canvas title="原图" :width="SCENE_W" :height="SCENE_H" :draw="drawOriginal"/>
      <demo-canvas title="CDL 调色后" :width="SCENE_W" :height="SCENE_H" :draw="drawCdlScene"/>
      <p class="demo-section-desc">
        画面从上到下依次是天空渐变、树叶与肤色色块、0~255 的灰阶条、24 个常见色块（ColorChecker 的近似 sRGB 值）。右边的曲线是灰阶输入经过调色后三个通道的输出，三条线分开的地方，灰色就被染了色。下面的 RGB parade 横轴对应画面从左到右，纵轴是该通道的值，越亮表示这一列里落在这个值上的像素越多。
      </p>
      <demo-canvas title="灰阶曲线" :width="CURVE_W" :height="CURVE_H" :draw="drawCdlCurves"/>
      <demo-canvas title="RGB parade（原图）" :width="PARADE_W" :height="PARADE_H" :draw="drawOriginalParade"/>
      <demo-canvas title="RGB parade（调色后）" :width="PARADE_W" :height="PARADE_H" :draw="drawCdlParade"/>
    </demo-section>

    <demo-section
      title="Lift / Gamma / Gain：三个色轮"
      desc="调色软件里常见的三个色轮，分别管阴影（Lift）、中间调（Gamma）和高光（Gain）。在圆内点一下或拖动：方向是色相，离圆心越远偏得越多，圆心为 0；轮子下面的滑块是整体亮度。这里用最常见的简化公式，不同软件的细节略有差别：v' = ( gain · (v + lift · (1 − v)) ) ^ (1 / gamma)。lift 抬起黑色而白色基本不动，gain 缩放白色，gamma 大于 1 提亮中间调。色轮方向对三个通道的作用是 w = 偏移量 × cos(色相 − 通道角度)，R、G、B 的通道角度分别是 0°、120°、240°，三个 w 加起来为 0。每个通道的 lift = 整体 + 0.12·w，gamma = 整体 × 2^(0.5·w)，gain = 整体 × (1 + 0.3·w)。这些系数是我定的，不是哪个软件的标准。"
    >
      <div class="demo-controls">
        <color-button
          v-for="preset in PRESETS"
          :key="preset.key"
          :label="preset.label"
          @click="useLggPreset(preset)"
        />
        <color-button label="复位" @click="resetLgg"/>
      </div>
      <div class="cg-wheels">
        <div v-for="wheel in WHEELS" :key="wheel.key" class="cg-wheel">
          <div
            class="cg-wheel-pad"
            @pointerdown="onWheelDown($event, wheel.key)"
            @pointermove="onWheelMove($event, wheel.key)"
            @pointerup="onWheelUp"
            @pointercancel="onWheelUp"
          >
            <demo-canvas :title="wheel.title" :width="WHEEL_SIZE" :height="WHEEL_SIZE" :draw="wheel.draw"/>
          </div>
          <label>
            {{ wheel.hint }}
            <input v-model.number="lgg[wheel.key].master" type="range" :min="wheel.min" :max="wheel.max" :step="wheel.step">
            <span class="demo-code">{{ fixed(lgg[wheel.key].master, 2) }}</span>
          </label>
          <p class="cg-wheel-read demo-code">
            色相 {{ Math.round(lgg[wheel.key].hue) }}°&emsp;偏移 {{ Math.round(lgg[wheel.key].amount * 100) }}%
          </p>
          <color-button label="这个轮复位" @click="resetWheel(wheel.key)"/>
        </div>
      </div>
      <demo-canvas title="原图" :width="SCENE_W" :height="SCENE_H" :draw="drawOriginal"/>
      <demo-canvas title="三向调色后" :width="SCENE_W" :height="SCENE_H" :draw="drawLggScene"/>
      <demo-canvas title="灰阶曲线" :width="CURVE_W" :height="CURVE_H" :draw="drawLggCurves"/>
      <demo-canvas title="RGB parade（调色后）" :width="PARADE_W" :height="PARADE_H" :draw="drawLggParade"/>
      <p class="demo-section-desc">
        三向调色和 CDL 是同一件事：把 gain · (v + lift · (1 − v)) 展开，就是 slope = gain · (1 − lift)，offset = gain · lift，power = 1 / gamma。每个通道只有一个 lift、一个 gamma、一个 gain，所以任何三向调色都能精确折算成一组 CDL 数值，只是少了饱和度。下表是当前设置的每通道数值，以及折算出的 CDL。
      </p>
      <table class="cg-table cg-table-plain">
        <thead>
          <tr>
            <th/>
            <th v-for="k in CH" :key="k">
              {{ CH_NAMES[k] }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in channelRows" :key="row.name">
            <th>{{ row.name }}</th>
            <td v-for="k in CH" :key="k" class="demo-code">
              {{ fixed(row.values[k], 4) }}
            </td>
          </tr>
        </tbody>
      </table>
      <div class="demo-controls">
        <color-button label="填入上面的 CDL" @click="copyToCdl"/>
        <span class="cg-note">超出 CDL 滑块范围的数值会被截到范围边缘。</span>
      </div>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.cg-table {
  border-collapse: collapse;
  margin: 8px 0 12px;
  font-size: 13px;
  th,
  td {
    padding: 4px 12px 4px 0;
    text-align: left;
    font-weight: 400;
    white-space: nowrap;
  }
  thead th {
    color: #666;
  }
  tbody th {
    color: #444;
    font-family: Consolas, menlo, monaco, monospace;
  }
  td input[type="range"] {
    width: 130px;
    vertical-align: middle;
  }
  td .demo-code {
    margin-left: 6px;
    display: inline-block;
    min-width: 44px;
  }
  &-plain td {
    padding-right: 28px;
  }
}
.cg-wheels {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 32px;
  margin: 8px 0 12px;
}
.cg-wheel {
  width: 210px;
  &-pad canvas {
    touch-action: none;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
    input[type="range"] {
      width: 180px;
    }
  }
  &-read {
    margin: 4px 0 6px;
  }
}
.cg-note {
  font-size: 12px;
  color: #666;
}
</style>
